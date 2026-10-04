const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const ragicService = require("./src/ragic.js");

const app = express();
app.use(express.json({ limit: '10mb' })); // 支援較大的 Base64 圖片 JSON 傳輸
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname, "public")));

// 取得 LINE WORKS 存取 Token
async function getAccessToken() {
    try {
        const clientId = process.env.LINE_WORKS_CLIENT_ID;
        const clientSecret = process.env.LINE_WORKS_CLIENT_SECRET;
        const privateKey = process.env.LINE_WORKS_PRIVATE_KEY;
        const botNo = process.env.LINE_WORKS_BOT_NO;

        if (!clientId || !clientSecret || !privateKey) {
            console.log("缺少 LINE WORKS 認證環境變數，略過 Token 取得");
            return null;
        }

        const jwtToken = jwt.sign(
            {
                iss: clientId,
                sub: clientId,
                iat: Math.floor(Date.now() / 1000),
                exp: Math.floor(Date.now() / 1000) + 3600
            },
            privateKey,
            { algorithm: 'RS256' }
        );

        const response = await axios.post("https://auth.worksmobile.com/oauth2/v2.0/token", 
            new URLSearchParams({
                grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
                assertion: jwtToken
            }), {
                headers: { "Content-Type": "application/x-www-form-urlencoded" }
            }
        );

        return response.data.access_token;
    } catch (error) {
        console.error("取得 LINE WORKS Access Token 失敗:", error.response?.data || error.message);
        return null;
    }
}

// 接收前端報修表單並寫入 Ragic，同時發送 LINE WORKS 通知
app.post("/api/repairs", async (req, res) => {
    try {
        console.log("收到前端報修表單資料:", {
            reporter: req.body.reporter,
            equipmentName: req.body.equipmentName,
            urgency: req.body.urgency,
            description: req.body.description,
            repairTime: req.body.repairTime,
            userId: req.body.userId,
            hasImage: !!req.body.imageBase64
        });

        // 1. 呼叫 Ragic 服務寫入資料
        const ragicResult = await ragicService.createRepairRecord(req.body);
        const repairNo = ragicResult.repairNo || "已建立";

        // 2. 如果使用者有帶入 userId，則主動發送聊天室通知
        const userId = req.body.userId;
        if (userId) {
            const accessToken = await getAccessToken();
            const botNo = process.env.LINE_WORKS_BOT_NO;

            if (accessToken && botNo) {
                // 取得 API ID（通常與 Client ID 相同或由環境變數提供，若無可用預設或共用變數）
                const apiId = process.env.LINE_WORKS_API_ID || process.env.LINE_WORKS_CLIENT_ID;

                const messagePayload = {
                    content: {
                        type: "text",
                        text: `✅ 【報修單已成功送出】\n\n案件編號：${repairNo}\n填報人：${req.body.reporter}\n設備名稱：${req.body.equipmentName}\n緊急程度：${req.body.urgency}\n故障描述：${req.body.description}\n填報時間：${req.body.repairTime}\n\n系統已收到您的報修，我們將盡快處理！`
                    }
                };

                await axios.post(
                    `https://apis.worksmobile.com/r/${apiId}/${botNo}/users/${userId}/message`,
                    messagePayload,
                    {
                        headers: {
                            'Authorization': `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );
                console.log(`已成功發送 LINE WORKS 通知給使用者: ${userId}`);
            } else {
                console.log("無法發送 LINE WORKS 通知：缺少 Access Token 或 Bot No");
            }
        } else {
            console.log("未取得 userId，略過發送 LINE WORKS 個人聊天室通知");
        }

        res.json({
            success: true,
            repairNo: repairNo,
            ragicResponse: ragicResult
        });

    } catch (error) {
        console.error("處理報修單發生錯誤:", error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`伺服器正在運行於 port ${PORT}`);
});
