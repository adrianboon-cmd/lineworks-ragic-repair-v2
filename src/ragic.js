const config = require("./config");

const ragicService = {
  createRepair: async (req) => {
    try {
      const { name, reporter, device, equipment, priority, description } = req.body;
      const displayName = reporter || name || "";
      const displayDevice = equipment || device || "";

      const ragicData = {
        "1054240": displayName,
        "1054241": displayDevice,
        "1054336": priority || "一般",
        "1054242": description || ""
      };

      const apiKey = process.env.RAGIC_API_KEY || config.RAGIC_API_KEY;
      const formUrl = process.env.RAGIC_FORM_URL || config.RAGIC_FORM_URL;

      if (!apiKey || !formUrl) {
        throw new Error("Ragic 設定缺失：請檢查 RAGIC_API_KEY 與 RAGIC_FORM_URL 環境變數");
      }

      console.log(`POST 寫入 Ragic...`);

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
      console.log("Ragic POST 回應:", resText);

      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        resData = { raw: resText };
      }

      if (!response.ok || resData.status !== "SUCCESS") {
        throw new Error(`Ragic API 寫入失敗: ${resText}`);
      }

      const ragicId = resData.ragicId;
      
      // 直接對齊 Ragic 的 ragicId，格式如：RAGIC-#30
      const caseNumber = `RAGIC-#${ragicId}`;

      return {
        success: true,
        ragicId: ragicId,
        caseNumber: caseNumber
      };

    } catch (error) {
      if (error.name === "AbortError") {
        console.error("❌ 連接 Ragic API 逾時");
        throw new Error("連接 Ragic 伺服器逾時");
      }
      console.error("❌ ragicService.createRepair 內部錯誤:", error.message);
      throw error;
    }
  }
};

module.exports = ragicService;
