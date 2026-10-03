const fetch = require("node-fetch");

async function createRepairRecord(data) {
    const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
    const ragicApiKey = process.env.RAGIC_API_KEY;

    if (!ragicApiUrl) {
        throw new Error("缺少 Ragic API 網址環境變數");
    }

    // 這裡的 Key 需要完全對應 Ragic 欄位（如果是欄位代號，請改成如 field_1 這種格式）
    const payload = {
        "填報人": data.reporter || "",
        "設備名稱": data.equipmentName || "",
        "緊急程度": data.urgency || "",
        "故障描述": data.description || "",
        "照片": data.photoUrl || ""
    };

    console.log("正在發送 Payload 至 Ragic:", payload);

    const response = await fetch(ragicApiUrl, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            ...(ragicApiKey ? { "Authorization": `Basic ${Buffer.from(ragicApiKey + ":").toString("base64")}` } : {})
        },
        body: JSON.stringify(payload)
    });

    const result = await response.json();
    console.log("Ragic 回應結果:", result);

    if (!response.ok) {
        throw new Error(`Ragic 寫入失敗: ${JSON.stringify(result)}`);
    }

    return result;
}

module.exports = {
    createRepairRecord
};
