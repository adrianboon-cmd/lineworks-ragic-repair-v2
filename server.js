// 💡 處理 LINE WORKS Webhook
app.post("/callback", async (req, res) => {
  res.status(200).send("OK");

  try {
    const { source } = req.body;
    if (source && source.userId) {
      const userId = source.userId;
      const botId = process.env.LW_BOT_ID || "13282881";
      const accessToken = await getAccessToken();

      // 改用 LINE WORKS 官方的內嵌開放格式
      await fetch(`https://www.worksapis.com/v3.0/bots/${botId}/users/${userId}/messages`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          content: {
            type: "button_template",
            contentText: "🛠️ 歡迎使用設備報修系統\n請點擊下方按鈕開始填寫報修單：",
            actions: [
              {
                type: "uri",
                label: "🔧 點我填寫報修單",
                // 帶入 userId 參數的標準 HTTPS 網址
                uri: `https://lineworks-ragic-repair-v2.onrender.com?userId=${userId}`
              }
            ]
          }
        })
      });
    }
  } catch (err) {
    console.error("Callback 處理失敗:", err);
  }
});
