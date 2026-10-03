const express = require("express");
const path = require("path");
const crypto = require("crypto");
const axios = require("axios");
const ragicService = require("./src/ragic");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Base64URL 編碼
function base64url(source) {
    let encoded = Buffer.from(source).toString("base64");
    return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// 取得 LINE WORKS Access Token
async function getAccessToken() {
    const clientId = process.env.LW_CLIENT_ID;
    const clientSecret = process.env.LW_CLIENT_SECRET;
    const serviceAccount = process.env.LW_SERVICE_ACCOUNT;
    const privateKey = process.env.LW_PRIVATE_KEY;

    const issuedAt = Math.floor(Date.now() / 1000);
    const expiration = issuedAt + 3600;

    const header = { alg: "RS256", typ: "JWT" };
    const payload = {
        iss: clientId,
        sub: serviceAccount,
        iat: issuedAt,
        exp: expiration
    };

    const encodedHeader = base64url(JSON.stringify(header));
    const encodedPayload = base64url(JSON.stringify(payload));
    const signatureInput = `${encodedHeader}.${encodedPayload}`;

    const sign = crypto.createSign("RSA-SHA256");
    sign.update(signatureInput);
    sign.end();
    const signature = base64url(sign.sign(privateKey));

    const jwt = `${signatureInput}.${signature}`;

    const response = await axios.post(
        "https://auth.worksmobile.com/oauth2/v2.0/token",
        new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            client_id: clientId,
            client_secret: clientSecret,
            assertion: jwt
        }),
        {
            headers: { "Content-Type": "application/x-www-form-urlencoded" }
        }
    );

    return response.data.access_token;
}

// 接收 LINE WORKS Bot 訊息的 Webhook
app.post("/webhook", async (req, res) => {
    try {
        console.log("收到 Webhook 請求:", JSON.stringify(req.body, null, 2));
        res.status(200).send("OK");
    } catch (error) {
        console.error("處理 Webhook 發生錯誤:", error);
    }
});

// 設定 LINE WORKS Persistent Menu 的暫時路由
app.get("/api/setup-menu", async (req, res) => {
    try {
        const token = await getAccessToken();
        const botId = process.env.BOT_ID || "13282881";

        const response = await axios.post(
            `https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`,
            {
                content: {
                    actions: [
                        {
                            type: "uri",
                            label: "線上報修",
                            uri: "url?id=41"
                        }
                    ]
                }
            },
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            }
        );

        res.json({ success: true, message: "Persistent menu 設定成功！", data: response.data });
    } catch (error) {
        res.status(500).json({ 
            success: false, 
            error: error.response ? error.response.data : error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器正在 Port ${PORT} 上執行`);
});
