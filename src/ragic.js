const config = require("./config");

const ragicService = {
  createRepair: async (req) => {
    try {
      const { name, reporter, device, equipment, priority, description } = req.body;
      const displayName = reporter || name || "";
      const displayDevice = equipment || device || "";

      // 1. 寫入 Ragic 的欄位（不帶案件編號，讓 Ragic 自動編碼）
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

      console.log(`正在發送 API POST 請求至 Ragic: ${formUrl}`);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000);

      // (A) 發送 POST 寫入 Ragic
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
      console.log("Ragic POST 回應內容:", resText);

      let resData;
      try {
        resData = JSON.parse(resText);
      } catch (e) {
        resData = { raw: resText };
      }

      if (!response.ok || resData.status !== "SUCCESS") {
        throw new Error(`Ragic API 寫入失敗: ${resText}`);
      }

      // (B) 取得 Ragic 新增資料的 ID (ragicId)
      const ragicId = resData.ragicId;
      let caseNumber = `RAGIC-#${ragicId}`; // 預設備用單號

      // (C) 拿 ragicId 向 Ragic 查詢剛剛自動產生的流水號 (MMDD-00X)
      if (ragicId) {
        try {
          const detailUrl = `${formUrl.replace(/\?.*$/, '')}/${ragicId}`;
          console.log(`正在向 Ragic 查詢完整案件紀錄: ${detailUrl}`);

          const detailRes = await fetch(detailUrl, {
            method: "GET",
            headers: {
              "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`
            }
          });

          if (detailRes.ok) {
            const detailData = await detailRes.json();
            // 從 Ragic 欄位取得自動編號（如果您的案件編號欄位 ID 不是 1054239，請替換）
            caseNumber = detailData["1054239"] || detailData._ragicId || caseNumber;
            console.log(`✅ 成功取得 Ragic 自動編號: ${caseNumber}`);
          }
        } catch (fetchErr) {
          console.warn("⚠️ 取得自動編號詳細資料失敗，使用預設 ID:", fetchErr.message);
        }
      }

      return {
        success: true,
        ragicId: ragicId,
        caseNumber: caseNumber // 回傳 Ragic 的案件編號 (例如 1012-001)
      };

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
