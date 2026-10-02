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
  res.send(
    "LINE WORKS Ragic Repair V2 Running"
  );
});

app.get("/app", (req, res) => {
  res.sendFile(
    path.join(
      __dirname,
      "public",
      "index.html"
    )
  );
});

app.post("/api/repairs", async (req, res) => {
  console.log(
    "收到 POST /api/repairs:",
    JSON.stringify(req.body)
  );

  try {
    const result =
      await ragic.createRepair(req.body);

    console.log("報修案件建立完成");

    res.status(201).json({
      success: true,
      message: "案件建立成功",
      result
    });
  } catch (error) {
    console.error(
      "建立案件失敗:",
      error.response?.data || error.message
    );

    res.status(
      error.response?.status || 500
    ).json({
      success: false,
      message:
        error.response?.data?.msg ||
        error.message ||
        "建立案件失敗"
    });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(
    `Server running on ${PORT}`
  );
});
