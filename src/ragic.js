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
      console.log("Ragic POST 原始回應內容:", resText);

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

      // (C) 拿 ragicId 向 Ragic 查詢剛剛自動產生的流水號 (例如 1003-001)
      if (ragicId) {
        try {
          // 清除 URL 參數並補上 /ragicId?api
          const baseUrl = formUrl.replace(/\?.*$/, "");
          const detailUrl = `${baseUrl}/${ragicId}?api`;
          console.log(`正在查詢 Ragic 完整資料: ${detailUrl}`);

          const detailRes = await fetch(detailUrl, {
            method: "GET",
            headers: {
              "Authorization": `Basic ${Buffer.from(apiKey + ":").toString("base64")}`
            }
          });

          if (detailRes.ok) {
            const detailText = await detailRes.text();
            console.log("Ragic 詳細紀錄 GET 回應:", detailText);

            let detailData = JSON.parse(detailText);

            // 如果 Ragic 包裹在 { "27": { ... } } 層級下，自動拆解
            if (detailData[ragicId]) {
              detailData = detailData[ragicId];
            }

            // 尋找「案件編號」的真實數值 (依序嘗試常見欄位 ID，或直接遍歷所有 Key 尋找 1003- 等格式)
            caseNumber = detailData["1054239"] || detailData["1054238"] || detailData["1054240_NO"] || null;

            if (!caseNumber) {
              // 自動搜尋回傳物件中符合 MMDD-XXX 格式的字串
              const keys = Object.keys(detailData);
              for (const key of keys) {
                const val = String(detailData[key]);
                if (/^\d{4}-\d{3,}$/.test(val)) {
                  caseNumber = val;
                  console.log(`🔍 從 key [${key}] 自動辨識出案件編號: ${caseNumber}`);
                  break;
                }
              }
            }

            if (!caseNumber) {
              caseNumber = `RAGIC-#${ragicId}`;
            }

            console.log(`✅ 最終確定案件編號: ${caseNumber}`);
          }
        } catch (fetchErr) {
          console.warn("⚠️ 取得自動編號詳細資料失敗:", fetchErr.message);
        }
      }

      return {
        success: true,
        ragicId: ragicId,
        caseNumber: caseNumber // 成功傳回 1003-001
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
