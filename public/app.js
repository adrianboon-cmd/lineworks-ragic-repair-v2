function showRepair() {
  document.getElementById("content").innerHTML = `
    <div class="card repair-card">
      <div class="form-header">
        <h2>🛠️ LINE WORKS 設備報修</h2>
        <p class="subtitle">請填寫故障狀況並上傳照片，系統將自動建立 Ragic 報修單。</p>
      </div>

      <form id="repairForm" onsubmit="event.preventDefault(); submitRepair();">
        <div class="form-group">
          <label for="reporter">👤 填報人 <span class="required">*</span></label>
          <input id="reporter" name="reporter" type="text" placeholder="請輸入您的姓名" required>
        </div>

        <div class="form-group">
          <label for="equipment">💻 設備名稱 <span class="required">*</span></label>
          <input id="equipment" name="equipment" type="text" placeholder="例如：pc、大廳影印機" required>
        </div>

        <div class="form-group">
          <label for="priority">🚨 緊急程度 <span class="required">*</span></label>
          <select id="priority" name="priority" required>
            <option value="一般">🟢 一般</option>
            <option value="緊急">🔴 緊急</option>
          </select>
        </div>

        <div class="form-group">
          <label for="description">📝 故障描述 <span class="required">*</span></label>
          <textarea id="description" name="description" rows="4" placeholder="請詳細說明設備問題（例如：無法開機、持續發出異音）" required></textarea>
        </div>

        <div class="form-group">
          <label for="photo">📸 故障照片（可選）</label>
          <input id="photo" name="photo" type="file" accept="image/*">
          <p class="help-text">只支援圖片檔案 (jpg, png)</p>
        </div>

        <button id="submitButton" type="submit" class="btn-submit">送出報修案件</button>
      </form>

      <div id="submitMessage" class="status-message"></div>
    </div>
  `;
}

async function submitRepair() {
  const form = document.getElementById("repairForm");
  const formData = new FormData(form);

  const reporter = formData.get("reporter").trim();
  const equipment = formData.get("equipment").trim();
  const description = formData.get("description").trim();

  const submitButton = document.getElementById("submitButton");
  const submitMessage = document.getElementById("submitMessage");

  if (!reporter || !equipment || !description) {
    submitMessage.innerHTML = `<span class="error">⚠️ 請確認填報人、設備名稱與故障描述皆已填寫！</span>`;
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "⏳ 圖片與資料傳送中...";
  submitMessage.textContent = "";

  try {
    // 這裡使用 FormData 直接傳送，包含圖片檔案
    const response = await fetch("/api/repairs", {
      method: "POST",
      body: formData // 不需要設定 Content-Type，瀏覽器會自動處理
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.message || "案件建立失敗");
    }

    // 顯示成功畫面，並列出成功建立的案件編號（如果有的話）
    const repairId = result.result?.repairId ? `（案件編號：${result.result.repairId}）` : "";

    document.getElementById("content").innerHTML = `
      <div class="card success-card">
        <div class="success-icon">✅</div>
        <h2>報修單已成功建立！</h2>
        <div class="summary-box">
          <p><strong>填報人：</strong> ${escapeHtml(reporter)}</p>
          <p><strong>設備名稱：</strong> ${escapeHtml(equipment)}</p>
          <p><strong>緊急程度：</strong> ${escapeHtml(formData.get("priority"))}</p>
          <p><strong>故障描述：</strong> ${escapeHtml(description)}</p>
          ${formData.get("photo").name ? `<p><strong>已上傳照片：</strong> ${escapeHtml(formData.get("photo").name)}</p>` : ""}
        </div>
        <p class="note">案件已同步至 Ragic 報修系統（狀態：待處理）${repairId}。</p>

        <button type="button" class="btn-secondary" onclick="showRepair()">再建立一筆報修</button>
      </div>
    `;
  } catch (error) {
    console.error(error);
    submitMessage.innerHTML = `<span class="error">❌ 建立失敗：${escapeHtml(error.message)}</span>`;
  } finally {
    if (document.body.contains(submitButton)) {
      submitButton.disabled = false;
      submitButton.textContent = "送出報修案件";
    }
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
