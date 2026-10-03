const config = require("./config");

// 遞迴搜尋物件內所有字串，尋找符合案件編號格式 (例如 1003-001 或 1003-028)
function findCaseNumberInObject(obj) {
  if (!obj || typeof obj !== "object") return null;

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string" || typeof value === "number") {
      const valStr = String(value).trim();
      // 匹配類似 1003-001 這種 Ragic 自動編號格式
      if (/^\d{3,4}-\d{3,}$/.test(valStr)) {
        console.log(`🎯 成功從欄位 [${key}] 匹配到案件編號: ${valStr}`);
        return valStr;
      }
    } else if (typeof value === "object" && value !== null) {
      const nestedResult = findCaseNumberInObject(value);
      if (nestedResult) return nestedResult;
    }
  }
  return null;
}

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
      let caseNumber = `RAGIC-#${ragicId}`;

      if (ragicId) {
        try {
          const baseUrl = formUrl.split("?")[0];
          // 直接將 api Key 帶在 URL 參數中，避免 Auth Header 無效
          const detailUrl = `${baseUrl}/${ragicId}?api=${apiKey}`;
          console.log(`正在查詢 Ragic 完整資料: ${detailUrl.replace(apiKey, "*****")}`);

          const detailRes = await fetch(detailUrl, {
            method: "GET"
          });

          if (detailRes.ok) {
            const detailText = await detailRes.text();
            console.log("=== Ragic 詳細紀錄原始 JSON ===");
            console.log(detailText);
            console.log("================================");

            const detailData = JSON.parse(detailText);

            // 執行遞迴搜尋案件編號
            const foundNumber = findCaseNumberInObject(detailData);
            if (foundNumber) {
              caseNumber = foundNumber;
            } else {
              console.warn("⚠️ 未能在 JSON 中匹配到 MMDD-XXX 格式的案件編號");
            }
          } else {
            const errText = await detailRes.text();
            console.error("❌ 查詢詳細資料失敗:", errText);
          }
        } catch (fetchErr) {
          console.warn("⚠️ 取得自動編號詳細資料失敗:", fetchErr.message);
        }
      }

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
