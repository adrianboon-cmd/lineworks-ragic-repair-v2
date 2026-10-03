const express = require("express");
const path = require("path");

// 1. 正確引入 Ragic 服務模組
const ragicService = require("./src/ragic");

const app = express();
const PORT = process.env.PORT || 3000;

// 解析 JSON 與 URL-encoded 請求內容
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 設定靜態檔案目錄 (對應 public 資料夾內的 index.html, style.css, app.js)
app.use(express.static(path.join(__dirname, "public")));

// 2. 處理前端報修案件發送的 POST API 路由
app.post("/api/repairs", async (req, res) => {
  try {
    // 呼叫 ragic.js 處理 Multipart 表單與 Ragic API 寫入
    const result = await ragicService.createRepair(req);

    // 成功時回傳給前端，確保包含 repairId
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

// 啟動 Express 伺服器
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
