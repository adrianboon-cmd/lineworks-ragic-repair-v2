const express = require("express");
const path = require("path");
const crypto = require("crypto");
const ragicService = require("./src/ragic");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Base64URL 編碼輔助函式
function base64url(source) {
  let encoded = Buffer.from(source).toString("base64");
  return encoded.replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");
}

// 💡 透過 Private Key 自動簽署 JWT 換取 Access Token
async function getAccessToken() {
  const clientId = process.env.LW_CLIENT_ID;
  const serviceAccount = process.env.LW_SERVICE_ACCOUNT;
  let privateKey = process.env.LW_PRIVATE_KEY;

  if (!clientId || !serviceAccount || !privateKey) {
    throw new Error("缺少必要的環境變數 (LW_CLIENT_ID, LW_SERVICE_ACCOUNT, LW_PRIVATE_KEY)");
  }

  privateKey = privateKey.replace(/\\n/g, "\n");

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientId,
    sub: serviceAccount,
    iat: now,
    exp: now + 3600
  };

  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(payload));
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey, "base64")
    .replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  params.append("client_id", clientId);
  params.append("client_secret", process.env.LW_CLIENT_SECRET || "");
  params.append("assertion", jwt);
  params.append("scope", "bot.message");

  const res = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(`取得 Access Token 失敗: ${JSON.stringify(data)}`);
  }
  return data.access_token;
}

// 💡 處理 LINE WORKS Webhook
app.post("/callback", async (req, res) => {
  res.status(200).send("OK");

  try {
    const { source } = req.body;
    if (source && source.userId) {
      const userId = source.userId;
      const botId = process.env.LW_BOT_ID || "13282881";
      const accessToken = await getAccessToken();

      await fetch(`https://www.worksapis.com/v3.0/bots/${botId}/users/${userId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: {
            type: "text",
            text: `🛠️ 歡迎使用設備報修系統！\n\n請點擊下方連結開始填寫報修單：\nhttps://lineworks-ragic-repair-v2.onrender.com?userId=${userId}`
          }
        })
      });
    }
  } catch (err) {
    console.error("Callback 處理失敗:", err);
  }
});

// 💡 POST 報修 API (加強 Log 輸出與 Error Handling)
app.post("/api/repairs", async (req, res) => {
  try {
    console.log("收到報修請求，req.body:", req.body);

    // 1. 寫入 Ragic
    const result = await ragicService.createRepair(req);
    console.log("Ragic 回傳結果:", result);

    const { name, reporter, device, equipment, description, userId } = req.body;
    const finalUserId = userId || req.body.user_id;
    const displayName = reporter || name || "未提供";
    const displayDevice = equipment || device || "未提供";
    const imageUrl = result ? (result.imageUrl || result.pictureUrl) : null;

    const botId = process.env.LW_BOT_ID || "13282881";

    // 2. 發送 LINE WORKS 訊息
    if (finalUserId) {
      console.log(`準備發送 Bot 訊息給用戶: ${finalUserId}`);
      const accessToken = await getAccessToken();

      await fetch(`https://www.worksapis.com/v3.0/bots/${botId}/users/${finalUserId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: {
            type: "text",
            text: `✅ 報修單已成功送出！\n\n📋 報修紀錄摘要：\n• 報修人：${displayName}\n• 設備名稱：${displayDevice}\n• 問題描述：${description || "無"}`
          }
        })
      });

      if (imageUrl) {
        await fetch(`https://www.worksapis.com/v3.0/bots/${botId}/users/${finalUserId}/messages`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            content: {
              type: "image",
              originalContentUrl: imageUrl,
              previewImageUrl: imageUrl
            }
          })
        });
      }
    } else {
      console.log("⚠️ 未接收到 userId（網頁直接開啓屬正常）");
    }

    // 3. 回傳成功給前端
    return res.json({
      success: true,
      repairId: result ? (result.repairId || result.id) : null
    });

  } catch (error) {
    console.error("❌ 寫入 Ragic 失敗，詳細原因:", error.response ? error.response.data : error.message);
    
    // 💡 確保遭遇 Error 時立刻回傳 500 給前端，避免畫面一直卡在「正在送出...」
    return res.status(500).json({
      success: false,
      message: error.message || "建立報修單失敗"
    });
  }
});

// 💡 刪除 Persistent Menu 路由
app.get("/delete-menu", async (req, res) => {
  const botId = process.env.LW_BOT_ID || "13282881";
  try {
    const accessToken = await getAccessToken();
    const response = await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`, {
      method: "DELETE",
      headers: { "Authorization": `Bearer ${accessToken}` }
    });

    if (response.ok || response.status === 204) {
      res.send("<h1>🎉 已成功刪除常駐選單！</h1>");
    } else {
      const data = await response.json();
      res.status(400).json({ error: "刪除失敗", details: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
