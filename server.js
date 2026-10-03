app.post("/api/repairs", async (req, res) => {
  console.log("收到 POST /api/repairs (含有檔案)");

  try {
    // 這裡我們直接把 'req' 傳進去，不解析 req.body
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
