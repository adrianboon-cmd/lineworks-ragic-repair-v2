const fetch = require("node-fetch");

async function createRepairRecord(data) {
    const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
    const ragicApiKey = process.env.RAGIC_API_KEY;

    if (!ragicApiUrl) {
        throw new Error("缺少 Ragic API 網址環境變數");
    }

    // 對應 Ragic 各欄位的 Field ID
    const payload = {
        [process.env.RAGIC_FIELD_REPORTER || "1054240"]: data.reporter || "",
        [process.env.RAGIC_FIELD_EQUIPMENT || "1054241"]: data.equipmentName || "",
        [process.env.RAGIC_FIELD_PRIORITY || "1054336"]: data.urgency || "一般",
        [process.env.RAGIC_FIELD_DESCRIPTION || "1054242"]: data.description || "",
        // 請確保這裡有對應到你的填報時間 Field ID（假設環境變數是 RAGIC_FIELD_TIME）
        [process.env.RAGIC_FIELD_TIME || "你的填報時間FieldID"]: data.repairTime || "", 
        [process.env.RAGIC_FIELD_PHOTO || "1054243"]: data.photoUrl || ""
    };

    console.log("正在發送帶有 Field ID 的 Payload 至 Ragic:", payload);

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
