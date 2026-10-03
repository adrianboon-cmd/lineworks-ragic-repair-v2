const express = require("express");
const path = require("path");
const ragicService = require("./src/ragic");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 接收 LINE WORKS Bot 訊息的 Webhook
app.post("/webhook", async (req, res) => {
    try {
        console.log("收到 Webhook 請求:", JSON.stringify(req.body, null, 2));
        res.status(200).send("OK");
    } catch (error) {
        console.error("處理 Webhook 發生錯誤:", error);
        res.status(500).send("Error");
    }
});

// 自動設定 LINE WORKS WOFF 常駐選單的路由
app.get("/api/setup-menu", async (req, res) => {
    try {
        const botId = process.env.BOT_ID || "13282881";
        const clientSecret = process.env.LW_CLIENT_SECRET || process.env.BOT_SECRET;
        const clientId = "12waaFaUV8BVsKxiPysY"; // 來自你的 Developer Console

        if (!clientSecret) {
            throw new Error("缺少 Client Secret 環境變數");
        }

        // 1. 取得 Bot Token (使用標準的 Client Credentials 驗證)
        const tokenParams = new URLSearchParams();
        tokenParams.append("grant_type", "client_credentials");
        tokenParams.append("client_id", clientId);
        tokenParams.append("client_secret", clientSecret);
        tokenParams.append("scope", "bot");

        const tokenResponse = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenParams.toString()
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`取得 Token 失敗: ${JSON.stringify(tokenData)}`);
        }

        const accessToken = tokenData.access_token;

        // 2. 設定 WOFF 常駐選單 (將 uri 指向你的 WOFF 網址或 Render 網址)
        const menuResponse = await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                content: {
                    actions: [
                        {
                            type: "uri",
                            label: "線上報修",
                            uri: "https://lineworks-ragic-repair-v2.onrender.com" // 也可以替換為您的 WOFF URL
                        }
                    ]
                }
            })
        });

        const resText = await menuResponse.text();
        if (!menuResponse.ok) {
            throw new Error(`設定選單失敗: ${resText}`);
        }

        res.json({ success: true, message: "WOFF 常駐選單設定成功！" });
    } catch (error) {
        console.error("❌ 設定常駐選單錯誤:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器正在 Port ${PORT} 上執行`);
});
