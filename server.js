const express = require("express");
const path = require("path");
const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");
const axios = require("axios");
const multer = require("multer");

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// 設定 multer 將上傳的圖片暫存在記憶體中，方便後續處理
const upload = multer({ storage: multer.memoryStorage() });

// 取得 LINE WORKS 存取 Token
async function getAccessToken() {
  try {
    const clientId = process.env.LINE_WORKS_CLIENT_ID;
    const clientSecret = process.env.LINE_WORKS_CLIENT_SECRET;
    const privateKey = process.env.LINE_WORKS_PRIVATE_KEY;
    const botNo = process.env.LINE_WORKS_BOT_NO;

    const jwtToken = jwt.sign(
      {
        iss: clientId,
        sub: botNo,
        iat: Math.floor(Date.now() / 1000),
        exp: Math.floor(Date.now() / 1000) + 3600
      },
      privateKey,
      { algorithm: 'RS256' }
    );

    const params = new URLSearchParams();
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer');
    params.append('assertion', jwtToken);
    params.append('client_id', clientId);
    params.append('client_secret', clientSecret);
    params.append('scope', 'bot');

    const response = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
      method: 'POST',
      body: params
    });

    const data = await response.json();
    return data.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// 發送 LINE WORKS 聊天室 Bot 訊息的輔助函式
async function sendBotMessage(userId, text) {
  try {
    if (!userId) return;
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    const botId = process.env.LINE_WORKS_BOT_NO;
    await axios.post(`https://www.worksapis.com/v1.0/bots/${botId}/users/${userId}/messages`, {
      content: {
        type: 'text',
        text: text
      }
    }, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('發送 Bot 訊息失敗:', error.response?.data || error.message);
  }
}

// 接收前端報修表單 API（已加上 upload.single('image') 來接收圖片，欄位名稱為 image）
app.post("/api/repairs", upload.single('image'), async (req, res) => {
  try {
    console.log("收到前端報修表單資料:", req.body);
    console.log("收到上傳的圖片檔案:", req.file ? req.file.originalname : "無圖片上傳");

    // 將 req.body 與圖片檔案組合成要送給 Ragic 的資料
    const repairData = {
      ...req.body,
      imageFile: req.file // 圖片檔案物件（Buffer 格式）
    };

    // 1. 寫入 Ragic (保留您原本的 ragicService 邏輯或直接在此處理)
    // 範例：若您的 ragicService.createRepairRecord 有支援傳入 imageFile 即可直接寫入
    const result = await ragicService.createRepairRecord(repairData);
    const repairNo = result.ragicId || result.rowId || result.id || "已成功建立";

    // 2. 組裝回傳給 Bot 聊天室的訊息內容
    const messageText = 
      `【設備報修單已建立】\n` +
      `📌 案件編號：${repairNo}\n` +
      `👤 填報人：${req.body.reporter}\n` +
      `🏢 設備名稱：${req.body.equipmentName}\n` +
      `🚨 緊急程度：${req.body.urgency}\n` +
      `📝 故障描述：${req.body.description}\n` +
      `🕒 填報時間：${req.body.repairTime}`;

    // 3. 自動推播訊息回 LINE WORKS 聊天室
    await sendBotMessage(req.body.userId, messageText);

    res.status(200).json({
      success: true,
      repairNo: repairNo,
      data: result
    });
  } catch (error) {
    console.error("報修處理失敗:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// 自動註冊 LINE WORKS 固定選單的路由
app.get('/api/setup-menu', async (req, res) => {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      return res.status(500).json({ success: false, error: 'Failed to get access token' });
    }

    const botId = process.env.LINE_WORKS_BOT_NO;
    const apiUrl = `https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`;

    const menuData = {
      content: {
        actions: [
          {
            type: 'uri',
            label: '🔧 設備報修系統',
            uri: 'https://lineworks-ragic-repair-v2.onrender.com'
          }
        ]
      }
    };

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

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
