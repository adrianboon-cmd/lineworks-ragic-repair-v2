const fetch = require("node-fetch");

async function createRepairRecord(data) {
  const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
  const ragicApiKey = process.env.RAGIC_API_KEY;

  if (!ragicApiUrl) {
    throw new Error("缺少 Ragic API 網址環境變數");
  }

  // 建立對應 Ragic 各欄位的 Payload（明確指定圖片欄位編號 1054243）
  const payload = {
    [process.env.RAGIC_FIELD_REPORTER || "1054240"]: data.reporter || "",
    [process.env.RAGIC_FIELD_EQUIPMENT || "1054238"]: data.equipmentName || "",
    [process.env.RAGIC_FIELD_PRIORITY || "1054336"]: data.urgency || "一般",
    [process.env.RAGIC_FIELD_DESCRIPTION || "1054242"]: data.description || "",
    [process.env.RAGIC_FIELD_TIME || "1054239"]: data.repairTime || ""
  };

  // 處理前端傳過來的 Base64 圖片並放入 1054243 欄位
  if (data.imageBase64) {
    let base64Data = data.imageBase64;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }

    payload["1054243"] = {
      name: data.imageName || "repair_photo.jpg",
      file: base64Data
    };
  }

  console.log("正在發送包含圖片 (欄位 1054243) 的 Payload 至 Ragic...");

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
