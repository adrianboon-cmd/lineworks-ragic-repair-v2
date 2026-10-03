const config = require("./config");

const ragicService = {
  createRepair: async (req) => {
    try {
      const { name, reporter, device, equipment, priority, description } = req.body;
      const displayName = reporter || name || "";
      const displayDevice = equipment || device || "";

      // 💡 正確的 Ragic 欄位 ID 對照表
      const ragicData = {
        "1054240": displayName,           // 報修人
        "1054241": displayDevice,         // 設備名稱
        "1054336": priority || "一般",     // 緊急程度
        "1054242": description || ""      // 問題描述
      };

      const apiKey = process.env.RAGIC_API_KEY || config.RAGIC_API_KEY;
      const formUrl = process.env.RAGIC_FORM_URL || config.RAGIC_FORM_URL;

      if (!apiKey || !formUrl) {
        throw new Error("Ragic 設定缺失：請檢查 RAGIC_API_KEY 與 RAGIC_FORM_URL 環境變數");
      }

      console.log(`正在發送 API 請求至 Ragic: ${formUrl}`);

      // 設定 8 秒逾時保護
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      const response = await fetch(formUrl, {
        method: "POST",
        headers: {
          "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify(ragicData),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const resText = await response.text();
      console.log("Ragic 原始回應內容:", resText);

      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        resData = { raw: resText };
      }

      if (!response.ok) {
        throw new Error(`Ragic API 傳回 HTTP 錯誤 ${response.status}: ${resText}`);
      }

      return resData;

    } catch (error) {
      if (error.name === "AbortError") {
        console.error("❌ 連接 Ragic API 逾時 (超過 8 秒無回應)");
        throw new Error("連接 Ragic 伺服器逾時，請檢查 Ragic 網址與網路設定");
      }
      console.error("❌ ragicService.createRepair 內部發生錯誤:", error.message);
      throw error;
    }
  }
};

module.exports = ragicService;
