const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken"); // 確保 package.json 有安裝 jsonwebtoken
const axios = require("axios"); // 加上這行
const ragicService = require("./src/ragic.js");

const app = express();
const PORT = process.env.PORT || 10000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// 產生 LINE WORKS API v2 JWT (用於發送 Bot 推播訊息)
function generateJwt() {
    const clientId = process.env.LINE_WORKS_CLIENT_ID;
    const clientSecret = process.env.LINE_WORKS_CLIENT_SECRET;
    const serviceAccount = process.env.LINE_WORKS_SERVICE_ACCOUNT;
    const privateKey = process.env.LINE_WORKS_PRIVATE_KEY; // 需將憑證內容存入環境變數

    if (!clientId || !privateKey || !serviceAccount) {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const payload = {
        iss: clientId,
        sub: serviceAccount,
        iat: now,
        exp: now + 3600
    };

    return jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });
}

// 取得 LINE WORKS Access Token
async function getAccessToken() {
    const assertion = generateJwt();
    if (!assertion) return null;

    const response = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: assertion,
            client_id: process.env.LINE_WORKS_CLIENT_ID,
            client_secret: process.env.LINE_WORKS_CLIENT_SECRET,
            scope: "bot"
        })
    });

    const data = await response.json();
    return data.access_token;
}

// 發送 Bot 訊息到聊天室
async function sendBotMessage(userId, messageText) {
    if (!userId) {
        console.log("缺少 userId，無法發送 Bot 推播訊息");
        return;
    }

    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.log("無法取得 LINE WORKS Access Token，請檢查憑證設定");
        return;
    }

    const botNo = process.env.LINE_WORKS_BOT_NO; // 你的 Bot No (例如 13282881)

    const response = await fetch(`https://www.worksapis.com/v1.0/bots/${botNo}/users/${userId}/messages`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: {
                type: "text",
                text: messageText
            }
        })
    });

    const result = await response.json();
    console.log("LINE WORKS Bot 推播結果:", result);
}

// 接收前端報修表單 API
app.post("/api/repairs", async (req, res) => {
    try {
        console.log("收到前端報修表單:", req.body);
        
        // 1. 寫入 Ragic
        const result = await ragicService.createRepairRecord(req.body);
        const repairNo = result.ragicId || result.rowId || result.id || "已成功建立";
        
        // 2. 組裝回傳給 Bot 聊天室的訊息內容
        const messageText = `【設備報修單已建立】\n` +
                            `📌 案件編號：${repairNo}\n` +
                            `👤 填報人：${req.body.reporter}\n` +
                            `💻 設備名稱：${req.body.equipmentName}\n` +
                            `🚨 緊急程度：${req.body.urgency}\n` +
                            `📝 故障描述：${req.body.description}\n` +
                            `⏱️ 填報時間：${req.body.repairTime}`;

        // 3. 自動推播訊息回 LINE WORKS 聊天室 (需要前端有傳入 userId)
        await sendBotMessage(req.body.userId, messageText);

        res.status(200).json({ 
            success: true, 
            repairNo: repairNo,
            data: result 
        });
    } catch (error) {
        console.error("後端處理錯誤:", error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器正在 Port ${PORT} 上執行`);
});

// 假設這是您原本接收 LINE WORKS Webhook 事件的路由

app.post('/callback', async (req, res) => {
    try {
        const events = req.body.events;
        if (!events || events.length === 0) {
            return res.status(200).send('OK');
        }

        for (const event of events) {
            // 檢查是否為使用者傳送的文字訊息
            if (event.type === 'message' && event.message.type === 'text') {
                const userText = event.message.text.trim();
                const userId = event.source.userId;
                const channelId = event.source.channelId;

                // 當使用者輸入「報修」或「選單」時
                if (userText === '報修' || userText === '設備報修') {
                    const woffUrl = "https://woff.worksmobile.com/woff/hF-5w0yJz-rK-1MfqDtOeA";
                    
                    const buttonMessagePayload = {
                        content: {
                            type: "button",
                            text: "請點擊下方按鈕開啟設備報修系統：",
                            actions: [
                                {
                                    type: "uri",
                                    label: "🔧 設備報修",
                                    uri: woffUrl
                                }
                            ]
                        }
                    };

                    await sendBotMessage(userId, channelId, buttonMessagePayload);
                }
            }
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error("Webhook 處理錯誤:", error);
        res.status(500).send('Error');
    }
});

// 發送按鈕訊息的輔助函式
async function sendBotMessage(userId, channelId, messagePayload) {
    const accessToken = await getAccessToken(); // 使用您原本取得 Token 的函式
    const botNo = process.env.LINE_WORKS_BOT_NO;

    let targetUrl = "";
    if (channelId) {
        targetUrl = `https://www.worksapis.com/v1.0/bots/${botNo}/channels/${channelId}/messages`;
    } else if (userId) {
        targetUrl = `https://www.worksapis.com/v1.0/bots/${botNo}/users/${userId}/messages`;
    } else {
        return;
    }

    await fetch(targetUrl, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(messagePayload)
    });
}
// 自動註冊 LINE WORKS 固定選單的路由
app.get('/api/setup-menu', async (req, res) => {
  try {
    // 1. 取得 Server-to-Server 存取 Token（沿用您現有的 getAccessToken 函式）
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).json({ error: 'Failed to get access token' });
    }

    const botId = process.env.LINE_WORKS_BOT_NO;
    const apiUrl = `https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`;

    // 2. 設定選單內容 (可自訂按鈕名稱與您的 WOFF 網址)
    const menuData = {
      content: {
        actions: [
          {
            type: 'uri',
            label: '🔧 設備報修系統',
            uri: 'https://lineworks-ragic-repair-v2.onrender.com' // 請換成您的前端 WOFF 網址
          }
        ]
      }
    };

    // 3. 發送 API 請求註冊固定選單
    const response = await axios.post(apiUrl, menuData, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    res.json({ success: true, message: 'Persistent menu registered successfully', data: response.data });
  } catch (error) {
    console.error('Error setting persistent menu:', error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
  }
});
