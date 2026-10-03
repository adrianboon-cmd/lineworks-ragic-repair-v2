const express = require("express");
const path = require("path");
const crypto = require("crypto");
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

// 💡 JWT 簽署換取 LINE WORKS Access Token
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

  const unsignedToken = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signer = crypto.createSign("RSA-SHA256");
  signer.update(unsignedToken);
  const signature = signer.sign(privateKey, "base64").replace(/=/g, "").replace(/\+/g, "-").replace(/\//g, "_");

  const jwt = `${unsignedToken}.${signature}`;

  const params = new URLSearchParams();
  params.append("grant_type", "urn:ietf:params:oauth:grant-type:jwt-bearer");
  params.append("client_id", clientId);
  params.append("client_secret", process.env.LW_CLIENT_SECRET || "");
  params.append("assertion", jwt);
  params.append("scope", "bot,bot.read");

  const res = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: params.toString()
  });

  const data = await res.json();
  if (!res.ok) throw new Error(`Token 取得失敗: ${JSON.stringify(data)}`);
  return data.access_token;
}

// 💡 處理 API 報修 POST
app.post("/api/repairs", async (req, res) => {
  try {
    console.log("收到報修請求，req.body:", req.body);

    // 1. 呼叫 Ragic API 新增並取得自動單號
    const result = await ragicService.createRepair(req);
    const caseNumber = result.caseNumber || "已完成填寫";

    const { name, reporter, device, equipment, description, userId } = req.body;
    const finalUserId = userId || req.body.user_id;
    const displayName = reporter || name || "未提供";
    const displayDevice = equipment || device || "未提供";

    const botId = process.env.LW_BOT_ID || "13282881";

    // 2. 如果有 userId，發送 LINE WORKS Bot 訊息通知
    if (finalUserId) {
      console.log(`準備發送 Bot 訊息給用戶: ${finalUserId}，案件單號: ${caseNumber}`);
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
            text: `✅ 報修單已成功送出！\n\n📌 案件編號：${caseNumber}\n📋 報修紀錄摘要：\n• 報修人：${displayName}\n• 設備名稱：${displayDevice}\n• 問題描述：${description || "無"}`
          }
        })
      });
    }

    // 3. 回傳 Ragic 自動產生的單號給前端網頁
    return res.json({
      success: true,
      caseNumber: caseNumber,
      ragicId: result.ragicId
    });

  } catch (error) {
    console.error("❌ 報修失敗:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "建立報修單失敗"
    });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
