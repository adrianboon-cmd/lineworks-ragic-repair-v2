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

// 設定 multer 將上傳的圖片暫存在記憶體中
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

// 接收前端報修表單 API
app.post("/api/repairs", upload.single('image'), async (req, res) => {
  try {
    console.log("收到前端報修表單資料:", req.body);
    console.log("收到上傳的圖片檔案:", req.file ? req.file.originalname : "無圖片上傳");

    const formData = req.body;
    const imageFile = req.file;

    // 讀取 Render 上設定的 Field ID
    const fieldReporter = process.env.RAGIC_FIELD_REPORTER || "1054240";
    const fieldEquipment = process.env.RAGIC_FIELD_EQUIPMENT || "1054238";
    const fieldUrgency = process.env.RAGIC_FIELD_URGENCY || "1054233";
    const fieldDescription = process.env.RAGIC_FIELD_DESCRIPTION || "1054236";
    const fieldPhoto = process.env.RAGIC_FIELD_PHOTO || "1054243";
    const fieldTime = process.env.RAGIC_FIELD_TIME || "1054237";

    // 建立對應 Ragic Field ID 的 Payload
    const ragicPayload = {
      [fieldReporter]: formData.reporter || "",
      [fieldEquipment]: formData.equipmentName || "",
      [fieldUrgency]: formData.urgency || "",
      [fieldDescription]: formData.description || "",
      [fieldTime]: formData.repairTime || "",
      ...(imageFile && {
        [fieldPhoto]: {
          value: imageFile.buffer.toString('base64'),
          name: imageFile.originalname
        }
      })
    };

    console.log("準備送到 Ragic 的 Payload:", ragicPayload);

    // 正確的 Ragic API URL 格式 (包含完整的帳號/資料庫/表單路徑與 ?api&v=3)
    const ragicApiKey = process.env.RAGIC_API_KEY;
    const ragicApiUrl = "https://ap3.ragic.com/fujifilmDemo/line-works/1?api&v=3";

    const ragicResponse = await axios.post(
      ragicApiUrl, 
      ragicPayload,
      {
        headers: {
          ...(ragicApiKey && { 'Authorization': `Basic ${Buffer.from(ragicApiKey + ':').toString('base64')}` }),
          'Content-Type': 'application/json'
        }
      }
    );

    console.log("Ragic 回應結果:", ragicResponse.data);

    // 正確解析 Ragic 回傳的案件編號 (rowId)
    const responseData = ragicResponse.data;
    let repairNo = "已成功建立";
    
    if (typeof responseData === 'object' && responseData !== null) {
      // Ragic 成功新增時通常會回傳包含新資料 ID 的物件
      const keys = Object.keys(responseData);
      if (responseData.rowId) {
        repairNo = responseData.rowId;
      } else if (keys.length > 0) {
        repairNo = responseData[keys[0]]?.rowId || keys[0];
      }
    }

    // 發送通知給 LINE WORKS 用戶
    if (formData.userId) {
      const messageText = 
        `【設備報修單已建立】\n` +
        `📌 案件編號：${repairNo}\n` +
        `👤 填報人：${formData.reporter || '未填寫'}\n` +
        `🏢 設備名稱：${formData.equipmentName || '未填寫'}\n` +
        `🚨 緊急程度：${formData.urgency || '未填寫'}\n` +
        `📝 故障描述：${formData.description || '未填寫'}\n` +
        `🕒 填報時間：${formData.repairTime || '未填寫'}`;
      
      await sendBotMessage(formData.userId, messageText);
    }

    res.status(200).json({
      success: true,
      repairNo: repairNo,
      message: '報修成功送出並已完整寫入 Ragic！'
    });

  } catch (error) {
    console.error("報修處理失敗:", error.response?.data || error.message);
    res.status(500).json({ success: false, error: error.response?.data || error.message });
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
