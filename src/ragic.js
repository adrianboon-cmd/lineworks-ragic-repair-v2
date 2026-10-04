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
// 查詢報修案件（根據填報人或案件編號篩選）
async function searchRepairRecords(keyword) {
    try {
        const apiKey = process.env.RAGIC_API_KEY;
        const ragicUrl = process.env.RAGIC_BASE_URL; // 改成跟 Render 上一致的名稱
      
        if (!ragicUrl || !apiKey) {
            throw new Error("缺少 Ragic API 設定");
        }

        // 呼叫 Ragic API 取得整張表單的資料
        const response = await axios.get(`${ragicUrl}?apiKey=${apiKey}`);
        const allData = response.data;

        let results = [];
        // Ragic 回傳的通常是帶有 ID 作為 Key 的物件
        for (const recordId in allData) {
            if (Object.prototype.hasOwnProperty.call(allData, recordId)) {
                const item = allData[recordId];
                
                const repairNo = String(item["案件編號"] || "");
                const reporter = String(item["填報人"] || "");
                const equipmentName = String(item["設備名稱"] || "");

                // 只要案件編號、填報人或設備名稱包含關鍵字，就納入搜尋結果
                if (
                    repairNo.includes(keyword) || 
                    reporter.includes(keyword) || 
                    equipmentName.includes(keyword)
                ) {
                    results.push({
                        repairNo: repairNo,
                        repairTime: item["填報時間"] || "",
                        reporter: reporter,
                        equipmentName: equipmentName,
                        description: item["故障描述"] || "",
                        status: item["案件狀態"] || "處理中",
                        progress: item["維修進度"] || "尚未更新",
                        expectedDate: item["預計處理日期"] || "未排定"
                    });
                }
            }
        }

        // 依案件編號或時間由新到舊排序
        results.reverse();
        return results;
    } catch (error) {
        console.error("Ragic 查詢失敗:", error.response?.data || error.message);
        throw error;
    }
}

// 記得把新函式 export 出去
module.exports = {
    createRepairRecord,
    searchRepairRecords
};
