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

// 設定 LINE WORKS Persistent Menu 的路由
app.get("/api/setup-menu", async (req, res) => {
    try {
        const botId = process.env.BOT_ID || "13282881";
        const botSecret = process.env.BOT_SECRET;

        if (!botSecret) {
            throw new Error("缺少 BOT_SECRET 環境變數");
        }

        // 1. 透過 Bot Secret 取得 Bot 專屬 Access Token (完全不需 JWT 與 scope)
        const tokenResponse = await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/token`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "consumerKey": botSecret
            }
        });

        const tokenData = await tokenResponse.json();
        if (!tokenResponse.ok) {
            throw new Error(`取得 Bot Token 失敗: ${JSON.stringify(tokenData)}`);
        }
        const accessToken = tokenData.token;

        // 2. 設定常駐選單
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
                            uri: "https://lineworks-ragic-repair-v2.onrender.com/"
                        }
                    ]
                }
            })
        });

        const resText = await menuResponse.text();
        let resData;
        try {
            resData = JSON.parse(resText);
        } catch (e) {
            resData = { raw: resText };
        }

        if (!menuResponse.ok) {
            throw new Error(`設定選單失敗: ${resText}`);
        }

        res.json({ success: true, message: "Persistent menu 設定成功！", data: resData });
    } catch (error) {
        console.error("❌ 設定 Persistent menu 錯誤:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`伺服器正在 Port ${PORT} 上執行`);
});
