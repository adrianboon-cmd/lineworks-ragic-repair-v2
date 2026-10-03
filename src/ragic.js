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
    [process.env.RAGIC_FIELD_EQUIPMENT || "1054238"]: data.equipmentName || "",
    [process.env.RAGIC_FIELD_PRIORITY || "1054336"]: data.urgency || "一般",
    [process.env.RAGIC_FIELD_DESCRIPTION || "1054242"]: data.description || "",
    [process.env.RAGIC_FIELD_TIME || "1054239"]: data.repairTime || "",
    // 完整的 Ragic 圖片附件上傳格式
    ...(data.photoUrl && {
      [process.env.RAGIC_FIELD_PHOTO || "1054243"]: {
        name: data.photoUrl.name,
        file: data.photoUrl.value
      }
    })
  };

  console.log("正在發送帶有 Field ID 與圖片的 Payload 至 Ragic:", JSON.stringify({ ...payload, [process.env.RAGIC_FIELD_PHOTO || "1054243"]: payload[process.env.RAGIC_FIELD_PHOTO || "1054243"] ? "[Base64 Image Data]" : undefined }, null, 2));

  const response = await fetch(ragicApiUrl, {
    method: "POST",
    headers: {
      ...(ragicApiKey && { 'Authorization': `Basic ${Buffer.from(ragicApiKey + ':').toString('base64')}` }),
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const result = await response.json();
  console.log("Ragic API 回應:", result);

  if (!response.ok) {
    throw new Error(`Ragic API 寫入失敗: ${JSON.stringify(result)}`);
  }

  return result;
}

module.exports = {
  createRepairRecord
};
