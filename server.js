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

// 💡 處理 LINE WORKS Webhook (發送純文字訊息，100% 避開按鈕攔截)
app.post("/callback", async (req, res) => {
  res.status(200).send("OK");

  try {
    const { source } = req.body;
    if (source && source.userId) {
      const userId = source.userId;
      const botId = process.env.LW_BOT_ID || "13282881";
      const accessToken = await getAccessToken();

      // 純文字訊息超連結，繞過 button_template 的系統封鎖
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

// 💡 POST 報修 API
app.post("/api/repairs", async (req, res) => {
  try {
    console.log("收到報修請求，req.body:", req.body);

    const result = await ragicService.createRepair(req);

    const { name, reporter, device, equipment, description, userId } = req.body;
    const finalUserId = userId || req.body.user_id;
    const displayName = reporter || name || "未提供";
    const displayDevice = equipment || device || "未提供";
    const imageUrl = result.imageUrl || result.pictureUrl; 

    const botId = process.env.LW_BOT_ID || "13282881";

    if (finalUserId) {
      console.log(`準備發送 Bot 訊息給用戶: ${finalUserId}`);
      const accessToken = await getAccessToken();

      // (A) 發送文字摘要
      const msgRes = await fetch(`https://www.worksapis.com/v3.0/bots/${botId}/users/${finalUserId}/messages`, {
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

      const msgData = await msgRes.json();
      console.log("文字訊息發送結果:", msgData);

      // (B) 若有照片，發送圖片訊息
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
      console.log("❌ 未接收到 userId");
    }

    res.json({
      success: true,
      repairId: result.repairId || result.id
    });
  } catch (error) {
    console.error("建立報修單失敗:", error);
    res.status(500).json({
      success: false,
      message: error.message || "建立報修單時發生伺服器錯誤"
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
