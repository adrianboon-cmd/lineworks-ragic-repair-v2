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
  console.log("收到 POST /api/repairs (含有檔案)");

  try {
    // 將完整的 req 物件傳給 ragic.js 進行 Formidable 解析
    const result = await ragic.createRepair(req);

    console.log("報修案件建立完成（包含照片）");

    res.status(201).json({
      success: true,
      message: "案件建立成功",
      result
    });
  } catch (error) {
    console.error("建立案件失敗:", error.message);

    res.status(500).json({
      success: false,
      message: error.message || "建立案件失敗"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
});
