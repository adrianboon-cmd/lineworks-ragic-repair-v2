const fetch = require("node-fetch");
const FormData = require("form-data");

// 您原本寫好的建立報修單（完全不動）
async function createRepairRecord(data) {
    const ragicApiUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;
    const ragicApiKey = process.env.RAGIC_API_KEY;

    if (!ragicApiUrl) {
        throw new Error("缺少 Ragic API 網址環境變數");
    }

    const form = new FormData();
    form.append(process.env.RAGIC_FIELD_REPORTER || "1054240", data.reporter || "");
    form.append(process.env.RAGIC_FIELD_EQUIPMENT || "1054241", data.equipmentName || ""); 
    form.append(process.env.RAGIC_FIELD_PRIORITY || "1054336", data.urgency || "general");
    form.append(process.env.RAGIC_FIELD_DESCRIPTION || "1054242", data.description || "");
    form.append(process.env.RAGIC_FIELD_TIME || "1054239", data.repairTime || "");

    if (data.imageBase64) {
        let base64Data = data.imageBase64;
        if (base64Data.includes(',')) {
            base64Data = base64Data.split(',')[1];
        }
        const buffer = Buffer.from(base64Data, 'base64');
        const filename = data.imageName || 'repair_image.jpg';
        form.append('1054243', buffer, { filename: filename });
    }

    const response = await fetch(`${ragicApiUrl}?api&v=3`, {
        method: 'POST',
        headers: {
            ...form.getHeaders(),
            'api-key': ragicApiKey
        },
        body: form
    });

    return await response.json();
}

// 使用您原本熟悉的 fetch 來實作查詢功能
async function searchRepairRecords(keyword) {
    try {
        const apiKey = process.env.RAGIC_API_KEY;
        const ragicUrl = process.env.RAGIC_BASE_URL || process.env.RAGIC_API_URL;

        if (!ragicUrl || !apiKey) {
            throw new Error("缺少 Ragic API 設定");
        }

        const response = await fetch(`${ragicUrl}?api&v=3`, {
            method: 'GET',
            headers: { 'api-key': apiKey }
        });
        
        const allData = await response.json();
        let results = [];

        for (const recordId in allData) {
            if (Object.prototype.hasOwnProperty.call(allData, recordId)) {
                const item = allData[recordId];
                
                const repairNo = String(item["1054238"] || recordId);
                const repairTime = String(item["1054239"] || "");
                const reporter = String(item["1054240"] || "");
                const equipmentName = String(item["1054241"] || "");
                const description = String(item["1054242"] || "");
                const assignee = String(item["1054331"] || "尚未指派");
                const progress = String(item["1054333"] || "處理中");
                const updateTime = String(item["1054334"] || "無");

                if (
                    repairNo.includes(keyword) || 
                    reporter.includes(keyword) || 
                    equipmentName.includes(keyword) ||
                    description.includes(keyword)
                ) {
                    results.push({
                        repairNo,
                        repairTime,
                        reporter,
                        equipmentName,
                        description,
                        assignee,
                        progress,
                        updateTime
                    });
                }
            }
        }

        results.reverse();
        return results;
    } catch (error) {
        console.error("Ragic 查詢失敗:", error.message);
        throw error;
    }
}

module.exports = {
    createRepairRecord,
    searchRepairRecords
};
