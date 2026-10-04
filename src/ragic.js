const fetch = require("node-fetch");
const FormData = require("form-data");

async function createRepairRecord(data) {
  const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
  const ragicApiKey = process.env.RAGIC_API_KEY;

  if (!ragicApiUrl) {
    throw new Error("缺少 Ragic API 網址環境變數");
  }

  // 使用 Ragic 標準的 multipart/form-data 格式
  const form = new FormData();
  
  // 填入一般文字欄位
  form.append(process.env.RAGIC_FIELD_REPORTER || "1054240", data.reporter || "");
  form.append(process.env.RAGIC_FIELD_EQUIPMENT || "1054238", data.equipmentName || "");
  form.append(process.env.RAGIC_FIELD_PRIORITY || "1054336", data.urgency || "一般");
  form.append(process.env.RAGIC_FIELD_DESCRIPTION || "1054242", data.description || "");
  form.append(process.env.RAGIC_FIELD_TIME || "1054239", data.repairTime || "");

  // 如果有圖片，將 Base64 轉回 Buffer，並以檔案串流形式加入 FormData
  if (data.imageBase64) {
    let base64Data = data.imageBase64;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    
    const buffer = Buffer.from(base64Data, 'base64');
    const filename = data.imageName || "repair_photo.jpg";

    // 將檔案附加到 Ragic 圖片欄位 1054243
    form.append("1054243", buffer, {
      filename: filename,
      contentType: 'image/jpeg'
    });
  }

  console.log("正在以 multipart/form-data 方式發送資料至 Ragic...");

  const response = await fetch(ragicApiUrl, {
    method: "POST",
    headers: {
      ...(ragicApiKey && { 'Authorization': `Basic ${Buffer.from(ragicApiKey + ':').toString('base64')}` }),
      ...form.getHeaders() // 自動帶入 multipart 必要的 headers
    },
    body: form
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
