const express = require("express");
const path = require("path");
const ragic = require("./src/ragic");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static("public"));

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "lineworks-ragic-repair-v2"
  });
});

app.get("/", (req, res) => {
  res.send("LINE WORKS Ragic Repair V2 Running");
});

app.get("/app", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// 處理含有圖片/檔案的報修建立請求
app.post("/api/repairs", async (req, res) => {
  try {
    const result = await ragicService.createRepair(req);
    // 確保回傳 repairId 給前端
    res.json({
      success: true,
      repairId: result.repairId || result.id
    });
  } catch (error) {
    console.error("建立報修單失敗:", error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
