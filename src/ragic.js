const FormData = require("form-data");
const fetch = require("node-fetch");
const formidable = require("formidable");
const fs = require("fs");
const config = require("./config");

async function createRepairWithPhoto(req) {
  const form = formidable({ multiples: false, keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return reject(new Error("解析報修表單失敗"));
      }

      const { reporter, equipment, priority, description } = fields;
      const photoFile = files.photo;

      if (!reporter || !equipment || !description || !priority) {
        return reject(new Error("填報人、設備名稱、故障描述與緊急程度皆為必填！"));
      }

      // 1. 取得 Ragic 原始 API Key (去除前後空白)
      let rawApiKey =
        process.env.RAGIC_API_KEY ||
        (config.ragic && config.ragic.apiKey) ||
        config.RAGIC_API_KEY ||
        "";

      let apiKey = rawApiKey.trim();

      if (!apiKey) {
        return reject(new Error("伺服器未設定有效的 RAGIC_API_KEY"));
      }

      // 2. 取得 Target URL
      let targetUrl =
        process.env.RAGIC_FORM_URL ||
        process.env.RAGIC_BASE_URL ||
        (config.ragic && config.ragic.baseUrl) ||
        "https://ap3.ragic.com/fujifilmDemo/line-works/1";

      if (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://")) {
        targetUrl = `https://${targetUrl}`;
      }

      // 3. 建立 FormData 並填入資料
      const ragicFormData = new FormData();
      ragicFormData.append("1054240", reporter);        // 填報人
      ragicFormData.append("1054241", equipment);       // 設備名稱
      ragicFormData.append("1054242", description);     // 故障描述
      ragicFormData.append("1054336", priority);        // 緊急程度
      ragicFormData.append("1054237", "待處理");       // 案件狀態

      // 帶入照片 (欄位 ID: 1054243)
      if (photoFile && photoFile.size > 0) {
        try {
          const fileStream = fs.createReadStream(photoFile.filepath);
          ragicFormData.append("1054243", fileStream, {
            filename: photoFile.originalFilename,
            contentType: photoFile.mimetype
          });
          console.log(`準備上傳照片：${photoFile.originalFilename}`);
        } catch (fileErr) {
          console.error("照片處理失敗:", fileErr);
        }
      }

      // 4. 組裝網址 (將 API Key 直接帶在網址上)
      const targetUrlWithKey = `${targetUrl}?api&api_key=${encodeURIComponent(apiKey)}`;

      try {
        console.log(`正在發送請求至 Ragic...`);

        const response = await fetch(targetUrlWithKey, {
          method: "POST",
          headers: ragicFormData.getHeaders(),
          body: ragicFormData
        });

        const ragicResult = await response.json();

        if (response.ok && ragicResult.status === "ok") {
          console.log(`案件建立成功！ID: ${ragicResult.id}`);
          if (photoFile && photoFile.filepath) {
            fs.unlink(photoFile.filepath, () => {});
          }

          resolve({
            success: true,
            repairId: ragicResult.id
          });
        } else {
          console.error("Ragic API error:", JSON.stringify(ragicResult));
          reject(new Error(ragicResult.msg || "Ragic 資料庫權限或建立失敗"));
        }
      } catch (fetchErr) {
        console.error("Fetch to Ragic failed:", fetchErr);
        reject(new Error(`無法連接至 Ragic 資料庫: ${fetchErr.message}`));
      }
    });
  });
}

module.exports = {
  createRepair: createRepairWithPhoto
};
