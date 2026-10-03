const FormData = require("form-data");
const fetch = require("node-fetch");
const formidable = require("formidable");
const fs = require("fs");
const config = require("./config"); // 假設 config.js 裡面有 RAGIC_API_KEY 和 RAGIC_FORM_URL

/**
 * 將圖片檔案與報修資料一同建立到 Ragic
 * @param {object} req - Express 的 Request 物件 (包含檔案)
 */
async function createRepairWithPhoto(req) {
  // 1. 使用 formidable 解析包含檔案的 Request
  const form = formidable({ multiples: false, keepExtensions: true });

  return new Promise((resolve, reject) => {
    form.parse(req, async (err, fields, files) => {
      if (err) {
        console.error("Form parsing error:", err);
        return reject(new Error("解析報修表單失敗"));
      }

      // 提取文字欄位
      const { reporter, equipment, priority, description } = fields;

      // 提取照片檔案
      const photoFile = files.photo; // 'photo' 對應前端的 name="photo"

      if (!reporter || !equipment || !description || !priority) {
        return reject(new Error("填報人、設備名稱、故障描述與緊急程度皆為必填！"));
      }

      // 2. 建立要傳送到 Ragic 的 FormData
      const ragicFormData = new FormData();

      // **請確認以下 Field ID 是否與您的 Ragic 表單一致**
      // 從您的截圖看：
      // 案件狀態 (100)
      // 填報人 (102)
      // 設備名稱 (103)
      // 故障描述 (104)
      // 照片 (可能在 104-107 之間，例如 2000108)
      // 緊急程度 (112)

      ragicFormData.append("102", reporter);        // 填報人
      ragicFormData.append("103", equipment);       // 設備名稱
      ragicFormData.append("104", description);     // 故障描述
      ragicFormData.append("112", priority);        // 緊急程度
      ragicFormData.append("100", "待處理");       // 案件狀態 (預設)

      // 如果有上傳照片，將照片流也 append 進去
      if (photoFile && photoFile.size > 0) {
        try {
          const fileStream = fs.createReadStream(photoFile.filepath);
          // 在這裡，我們假設 Ragic 的「照片」欄位 Field ID 為 2000108
          // **這行最重要，如果照片沒進去，通常是這個 ID 錯了**
          ragicFormData.append("2000108", fileStream, {
            filename: photoFile.originalFilename,
            contentType: photoFile.mimetype
          });
          console.log(`準備上傳照片：${photoFile.originalFilename}`);
        } catch (fileErr) {
          console.error("照片處理失敗:", fileErr);
          // 檔案流處理失敗，但不中斷文字欄位的建立
        }
      }

      // 3. 呼叫 Ragic API 送出資料
      try {
        console.log(`正在將案件寫入 Ragic...`);
        const response = await fetch(`${config.RAGIC_FORM_URL}?api`, {
          method: "POST",
          headers: {
            // 重要：Ragic 需要 API Key 以及 FormData 的 header
            Authorization: `Basic ${Buffer.from(config.RAGIC_API_KEY + ":").toString("base64")}`,
            ...ragicFormData.getHeaders()
          },
          body: ragicFormData
        });

        const ragicResult = await response.json();

        if (response.ok && ragicResult.status === "ok") {
          console.log(`案件建立成功！ID: ${ragicResult.id}`);
          // formidable 預設會把檔案存在臨時目錄，這裏可以清理
          if (photoFile) fs.unlinkSync(photoFile.filepath);

          resolve({
            success: true,
            repairId: ragicResult.id // 傳回新建立的案件編號
          });
        } else {
          console.error("Ragic API error:", JSON.stringify(ragicResult));
          reject(new Error(ragicResult.msg || "Ragic 資料庫建立失敗"));
        }
      } catch (fetchErr) {
        console.error("Fetch to Ragic failed:", fetchErr);
        reject(new Error(`無法連接至 Ragic 資料庫: ${fetchErr.message}`));
      }
    });
  });
}

// 修改匯出的函式名稱
module.exports = {
  createRepair: createRepairWithPhoto // 覆蓋舊的 createRepair
};
