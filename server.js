const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
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

// 接收前端報修表單並寫入 Ragic
app.post("/api/repairs", async (req, res) => {
    try {
        console.log("收到報修表單資料:", req.body);
        
        // 呼叫 ragicService 將資料寫入 Ragic
        const result = await ragicService.createRepairRecord(req.body);
        
        res.status(200).json({ success: true, data: result });
    } catch (error) {
        console.error("寫入 Ragic 發生錯誤:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// 自動設定 LINE WORKS 常駐選單的路由 (透過 JWT 授權)
app.get("/api/setup-menu", async (req, res) => {
    try {
        const botId = process.env.BOT_ID || "13282881";
        const clientId = process.env.LW_CLIENT_ID || "12waaFaUV8BVsKxiPysY";
        const serviceAccount = process.env.LW_SERVICE_ACCOUNT || "pzoi8.serviceaccount@fbtw2";
        const privateKey = process.env.LW_PRIVATE_KEY; 

        if (!privateKey) {
            throw new Error("缺少 LW_PRIVATE_KEY 環境變數");
        }

        // 1. 產生 JWT 簽章
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            iss: clientId,
            sub: serviceAccount,
            iat: now,
            exp: now + 3600
        };

        const assertion = jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });

        // 2. 向 LINE WORKS 換取 Access Token
        const tokenParams = new URLSearchParams();
        tokenParams.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
        tokenParams.append("assertion", assertion);

        const tokenResponse = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: tokenParams.toString()
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`JWT Token 取得失敗: ${JSON.stringify(tokenData)}`);
        }

        const accessToken = tokenData.access_token;

        // 3. 設定 WOFF 常駐選單
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
                            uri: "https://lineworks-ragic-repair-v2.onrender.com"
                        }
                    ]
                }
            })
        });

        const resText = await menuResponse.text();
        if (!menuResponse.ok) {
            throw new Error(`設定選單失敗: ${resText}`);
        }

        res.json({ success: true, message: "常駐選單設定成功！" });
    } catch (error) {
        console.error("❌ 設定常駐選單錯誤:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器正在 Port ${PORT} 上執行`);
});
