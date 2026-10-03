require("dotenv").config();
const axios = require("axios");

// 引入專案內取得 LINE WORKS Access Token 的邏輯
// 請確認你的 Token 取得邏輯在 src/lineworks.js，或直接在上方設定
const { getAccessToken } = require("./src/lineworks");

async function setPersistentMenu() {
  try {
    console.log("正在取得 Access Token...");
    const token = await getAccessToken();
    const botId = process.env.BOT_ID || "13282881";

    console.log(`正在為 Bot (${botId}) 設定 Persistent Menu...`);

    const response = await axios.post(
      `https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`,
      {
        content: {
          actions: [
            {
              type: "uri",
              label: "線上報修",
              // 可填寫原本的 Web URL 或 WOFF 連結
              uri: "https://lineworks-ragic-repair-v2.onrender.com/"
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

    console.log("✅ Persistent Menu 設定成功！回應內容：");
    console.log(response.data);
  } catch (error) {
    console.error("❌ 設定失敗:", error.response ? error.response.data : error.message);
  }
}

setPersistentMenu();
