document.getElementById("queryForm").addEventListener("submit", async function(event) {
    event.preventDefault();
    const keyword = document.getElementById("keyword").value.trim();
    const resultListDiv = document.getElementById("resultList");
    
    resultListDiv.innerHTML = "<p>查詢中，請稍候...</p>";

    try {
        const response = await fetch(`/api/query?keyword=${encodeURIComponent(keyword)}`);
        const result = await response.json();

        if (result.success && result.data.length > 0) {
            let html = `<h3>查詢結果 (${result.data.length} 筆)</h3>`;
            result.data.forEach(item => {
                html += `
                    <div class="success-box" style="margin-bottom: 15px; text-align: left;">
                        <p><strong>案件編號：</strong>${item.repairNo || ''}</p>
                        <p><strong>填報時間：</strong>${item.repairTime || ''}</p>
                        <p><strong>填報人：</strong>${item.reporter || ''}</p>
                        <p><strong>設備名稱：</strong>${item.equipmentName || ''}</p>
                        <p><strong>故障描述：</strong>${item.description || ''}</p>
                        <p><strong>案件狀態：</strong><span style="color: blue;">${item.status || '處理中'}</span></p>
                        <p><strong>維修進度：</strong>${item.progress || '尚未更新'}</p>
                        <p><strong>預計處理日期：</strong>${item.expectedDate || '未排定'}</p>
                    </div>
                `;
            });
            resultListDiv.innerHTML = html;
        } else {
            resultListDiv.innerHTML = `<p style="color: red;">找不到符合「${keyword}」的報修案件。</p>`;
        }
    } catch (error) {
        console.error("查詢錯誤:", error);
        resultListDiv.innerHTML = `<p style="color: red;">查詢發生錯誤，請稍後再試。</p>`;
    }
});
