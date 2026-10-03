const fetch = require("node-fetch");

/**
 * 建立報修記錄並寫入 Ragic
 * @param {Object} data - 前端傳來的表單資料
 */
async function createRepairRecord(data) {
    // 取得 Ragic API 相關設定（建議從環境變數讀取，或替換為你的 Ragic API URL 與 Key）
    const ragicApiUrl = process.env.RAGIC_API_URL;
    const ragicApiKey = process.env.RAGIC_API_KEY;

    if (!ragicApiUrl) {
        throw new Error("缺少 RAGIC_API_URL 環境變數");
    }

    // 組織要寫入 Ragic 的資料格式
    const payload = {
        // 根據你的 Ragic 欄位名稱進行對應
        "填報人": data.reporter || "",
        "設備名稱": data.equipmentName || "",
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

    if (!response.ok) {
        throw new Error(`Ragic 寫入失敗: ${JSON.stringify(result)}`);
    }

    return result;
}

// 確保正確導出函式供 server.js 呼叫
module.exports = {
    createRepairRecord
};
