function showRepair() {
  document.getElementById("content").innerHTML = `
    <div class="card">
      <h2>我要報修</h2>

      <label for="reporter">填報人</label>
      <input
        id="reporter"
        type="text"
        placeholder="請輸入填報人"
        required
      >

      <label for="equipment">設備名稱</label>
      <input
        id="equipment"
        type="text"
        placeholder="請輸入設備名稱"
        required
      >

      <label for="description">故障描述</label>
      <textarea
        id="description"
        placeholder="請描述設備異常情況"
        required
      ></textarea>

      <label for="priority">緊急程度</label>
      <select id="priority">
        <option value="一般">一般</option>
        <option value="緊急">緊急</option>
      </select>

      <button
        id="submitButton"
        type="button"
        onclick="submitRepair()"
      >
        送出報修
      </button>

      <div id="submitMessage"></div>
    </div>
  `;
}

async function submitRepair() {
  const reporter =
    document.getElementById("reporter").value.trim();

  const equipment =
    document.getElementById("equipment").value.trim();

  const description =
    document.getElementById("description").value.trim();

  const priority =
    document.getElementById("priority").value;

  const submitButton =
    document.getElementById("submitButton");

  const submitMessage =
    document.getElementById("submitMessage");

  if (!reporter || !equipment || !description) {
    alert("請完成填報人、設備名稱與故障描述");
    return;
  }

  submitButton.disabled = true;
  submitButton.textContent = "送出中...";
  submitMessage.textContent = "";

  try {
    const response = await fetch(
      "/api/repairs",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          reporter,
          equipment,
          description,
          priority
        })
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(
        result.message || "案件建立失敗"
      );
    }

    document.getElementById(
      "content"
    ).innerHTML = `
      <div class="card success-card">
        <h2>✅ 報修成功</h2>
        <p>設備：${escapeHtml(equipment)}</p>
        <p>緊急程度：${escapeHtml(priority)}</p>
        <p>報修資料已寫入 Ragic。</p>

        <button
          type="button"
          onclick="showRepair()"
        >
          再建立一筆
        </button>
      </div>
    `;
  } catch (error) {
    console.error(error);

    submitMessage.textContent =
      `建立失敗：${error.message}`;

    alert(`建立失敗：${error.message}`);
  } finally {
    if (document.body.contains(submitButton)) {
      submitButton.disabled = false;
      submitButton.textContent = "送出報修";
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
