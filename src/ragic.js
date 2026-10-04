const fetch = require("node-fetch");

async function createRepairRecord(data) {
  const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
  const ragicApiKey = process.env.RAGIC_API_KEY;

  if (!ragicApiUrl) {
    throw new Error("缺少 Ragic API 網址環境變數");
  }

  // 建立對應 Ragic 各欄位的 Payload
  const payload = {
    [process.env.RAGIC_FIELD_REPORTER || "1054240"]: data.reporter || "",
    [process.env.RAGIC_FIELD_EQUIPMENT || "1054238"]: data.equipmentName || "",
    [process.env.RAGIC_FIELD_PRIORITY || "1054336"]: data.urgency || "一般",
    [process.env.RAGIC_FIELD_DESCRIPTION || "1054242"]: data.description || "",
    [process.env.RAGIC_FIELD_TIME || "1054239"]: data.repairTime || ""
  };

  // 💡 關鍵修正：嚴格按照 Ragic 規格處理圖片上傳欄位 1054243
  if (data.imageBase64) {
    let base64String = data.imageBase64;
    
    // 如果含有 data:image/xxx;base64, 前綴，必須切掉，只留純 base64 內容
    if (base64String.includes(',')) {
      base64String = base64String.split(',')[1];
    }

    payload["1054243"] = {
      name: data.imageName || "repair_image.jpg",
      file: base64String
    };
  }

  console.log("正在發送包含圖片的 Payload 至 Ragic...");

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
