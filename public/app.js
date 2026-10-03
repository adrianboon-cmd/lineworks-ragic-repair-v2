// 💡 從 URL Query 參數或 WOFF Profile 中取得 userId (參考 visit-report 機制)
function getUserId() {
  const urlParams = new URLSearchParams(window.location.search);
  let uid = urlParams.get("userId") || urlParams.get("user_id") || urlParams.get("uid");

  if (!uid && typeof woff !== "undefined" && woff.getProfile) {
    woff.getProfile()
      .then((profile) => {
        if (profile && profile.userId) {
          window.currentUserId = profile.userId;
        }
      })
      .catch(() => {});
  }
  return uid || window.currentUserId || "";
}

// 網頁載入時初始化 WOFF
if (typeof woff !== "undefined" && woff.init) {
  woff.init({ woffId: "WiPs90_DcB_oVcPYkXSOrg" }).catch(() => {});
}

document.addEventListener("DOMContentLoaded", () => {
  const repairForm = document.getElementById("repairForm");
  const submitBtn = document.getElementById("submitBtn");

  if (!repairForm) return;

  repairForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "正在送出報修單...";

    // 1. 取得 userId
    let userId = getUserId();

    // 如果還是沒抓到，嘗試從 woff 再同步讀一次
    if (!userId && typeof woff !== "undefined" && woff.getProfile) {
      try {
        const profile = await woff.getProfile();
        if (profile && profile.userId) userId = profile.userId;
      } catch (err) {}
    }

    const formData = new FormData();
    
    const reporter = document.getElementById("reporter")?.value || "";
    const equipment = document.getElementById("equipment")?.value || "";
    const priority = document.getElementById("priority")?.value || "";
    const description = document.getElementById("description")?.value || "";
    const photoInput = document.getElementById("photo");

    formData.append("reporter", reporter);
    formData.append("equipment", equipment);
    formData.append("priority", priority);
    formData.append("description", description);
    
    formData.append("name", reporter);
    formData.append("device", equipment);

    if (userId) {
      formData.append("userId", userId);
    }

    if (photoInput && photoInput.files[0]) {
      formData.append("photo", photoInput.files[0]);
    }

    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`🎉 報修案件建立成功！案件單號：${result.repairId || result.id}`);
        repairForm.reset();

        if (typeof woff !== "undefined" && woff.closeWindow) {
          woff.closeWindow();
        }
      } else {
        alert(`❌ 建立失敗：${result.message || result.error || "未知錯誤"}`);
      }
    } catch (err) {
      console.error("提交錯誤:", err);
      alert("❌ 無法連接伺服器，請稍後再試...");
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});
