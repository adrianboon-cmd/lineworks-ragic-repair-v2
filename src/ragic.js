const fetch = require("node-fetch");

/**
 * 建立報修記錄並寫入 Ragic
 * @param {Object} data - 前端傳來的表單資料
 */
async function createRepairRecord(data) {
    const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
    const ragicApiKey = process.env.RAGIC_API_KEY;

    if (!ragicApiUrl) {
        throw new Error("缺少 RAGIC_BASE_URL 環境變數");
    }

    // 組織要寫入 Ragic 的資料格式（確保對應前端傳來的欄位）
    const payload = {
        "填報人": data.reporter || "",
        "設備名稱": data.equipmentName || "",
        "緊急程度": data.urgency || "",
        "故障描述": data.description || "",
        "照片": data.photoUrl || ""
    };

    console.log("正在發送請求至 Ragic...", payload);

    const response = await fetch(ragicApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(ragicApiKey ? { "Authorization": `Basic ${Buffer.from(ragicApiKey + ":").toString("base64")}` } : {})
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("Ragic API 回應結果:", result);

    if (!response.ok) {
        throw new Error(`Ragic 寫入失敗: ${JSON.stringify(result)}`);
    }

    return result;
}

module.exports = {
    createRepairRecord
};
