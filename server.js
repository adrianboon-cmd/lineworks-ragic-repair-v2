const express = require("express");
const path = require("path");
const axios = require("axios"); // 確保 package.json 有 axios，或使用 fetch
const ragicService = require("./src/ragic");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// POST 報修 API
app.post("/api/repairs", async (req, res) => {
  try {
    const result = await ragicService.createRepair(req);
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

// 💡 快速設定 Persistent Menu 的 API
app.get("/setup-menu", async (req, res) => {
  const botId = process.env.LW_BOT_ID;
  const accessToken = process.env.LW_ACCESS_TOKEN; // 如果您有直接放 Access Token

  if (!botId) {
    return res.status(400).json({ error: "缺少 LW_BOT_ID 環境變數" });
  }

  try {
    // 呼叫 LINE WORKS Persistent Menu API
    const response = await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`, {
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
              label: "🔧 我要報修",
              uri: "https://lineworks-ragic-repair-v2.onrender.com"
            }
          ]
        }
      })
    });

    const data = await response.json();
    if (response.ok) {
      res.send("<h1>🎉 Persistent Menu (常駐選單) 設定成功！</h1><p>請打開 LINE WORKS App 測試。</p>");
    } else {
      res.status(400).json({ error: "設定失敗", details: data });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
