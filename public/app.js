let currentUserId = "";

// 1. 初始化 WOFF 並取得目前使用者的 profile (userId)
if (typeof woff !== "undefined") {
  woff.init({ woffId: "WiPs90_DcB_oVcPYkXSOrg" })
    .then(() => {
      if (woff.isLoggedIn && woff.isLoggedIn()) {
        return woff.getProfile();
      } else if (woff.getProfile) {
        return woff.getProfile();
      }
    })
    .then((profile) => {
      if (profile && profile.userId) {
        currentUserId = profile.userId;
        console.log("成功取得 LINE WORKS UserId:", currentUserId);
      }
    })
    .catch((err) => console.error("WOFF 取得 Profile 失敗:", err));
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

    const formData = new FormData();
    
    // 取得 HTML 欄位值並統一對齊後端名稱
    const reporter = document.getElementById("reporter")?.value || "";
    const equipment = document.getElementById("equipment")?.value || "";
    const priority = document.getElementById("priority")?.value || "";
    const description = document.getElementById("description")?.value || "";
    const photoInput = document.getElementById("photo");

    formData.append("reporter", reporter);
    formData.append("equipment", equipment);
    formData.append("priority", priority);
    formData.append("description", description);
    
    // 同時帶入 name / device 避免後端欄位解析落差
    formData.append("name", reporter);
    formData.append("device", equipment);

    // 💡 關鍵：明確帶入 userId
    if (currentUserId) {
      formData.append("userId", currentUserId);
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

        // 自動關閉 WOFF 視窗
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
