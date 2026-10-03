document.addEventListener("DOMContentLoaded", () => {
  const repairForm = document.getElementById("repairForm");
  const submitBtn = document.getElementById("submitBtn");

  if (!repairForm) return;

  repairForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // 阻止表單預設重新整理

    // 變更按鈕狀態為發送中
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "正在送出報修單...";

    const formData = new FormData(repairForm);

    try {
      // 修正為 server.js 定義的 /api/repairs 路由
      const response = await fetch("/api/repairs", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`🎉 報修案件建立成功！案件單號：${result.repairId}`);
        repairForm.reset(); // 清空表單內容
      } else {
        alert(`❌ 建立失敗：${result.message || result.error || "未知錯誤"}`);
      }
    } catch (err) {
      console.error("提交錯誤:", err);
      alert("❌ 無法連接伺服器，請稍後再試。");
    } finally {
      // 恢復按鈕狀態
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
