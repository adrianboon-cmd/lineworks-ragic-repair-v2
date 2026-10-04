const axios = require("axios");
const FormData = require("form-data");

async function createRepairRecord(data) {
  const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
  const ragicApiKey = process.env.RAGIC_API_KEY;

  if (!ragicApiUrl) {
    throw new Error("缺少 Ragic API 網址環境變數");
  }

  // 使用 FormData 包裝文字與檔案，符合 Ragic 附件上傳需求
  const form = new FormData();

  form.append(process.env.RAGIC_FIELD_REPORTER || "1054240", data.reporter || "");
  form.append(process.env.RAGIC_FIELD_EQUIPMENT || "1054238", data.equipmentName || "");
  form.append(process.env.RAGIC_FIELD_PRIORITY || "1054336", data.urgency || "一般");
  form.append(process.env.RAGIC_FIELD_DESCRIPTION || "1054242", data.description || "");
  form.append(process.env.RAGIC_FIELD_TIME || "1054239", data.repairTime || "");

  // 檢查並附加圖片檔案
  if (data.photoFile && data.photoFile.buffer) {
    form.append(
      process.env.RAGIC_FIELD_PHOTO || "1054243",
      data.photoFile.buffer,
      {
        filename: data.photoFile.originalname || "repair_image.jpg",
        contentType: data.photoFile.mimetype || "image/jpeg"
      }
    );
  }

  console.log("正在以 multipart/form-data 傳送資料至 Ragic...");

  const response = await axios.post(ragicApiUrl, form, {
    headers: {
      ...(ragicApiKey && { 'Authorization': `Basic ${Buffer.from(ragicApiKey + ':').toString('base64')}` }),
      ...form.getHeaders()
    }
  });

  console.log("Ragic API 回應:", response.data);
  return response.data;
}

module.exports = {
  createRepairRecord
};
