let currentUserId = "";

// 1. 初始化 WOFF 並取得目前使用者的 profile (userId)
if (typeof woff !== "undefined") {
  woff.init({ woffId: "WiPs90_DcB_oVcPYkXSOrg" }) // 您的 WOFF ID
    .then(() => {
      // 外部瀏覽器開啟時若未登入，會自動引導登入
      if (!woff.isLoggedIn && woff.isLoggedIn()) {
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

    const formData = new FormData(repairForm);

    // 💡 動態將目前開啟表單使用者的 userId 帶入表單資料中
    if (currentUserId) {
      formData.append("userId", currentUserId);
    }

    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        body: formData
      });

      const result = await response.json();

      if (response.ok && result.success) {
        alert(`🎉 報修案件建立成功！案件單號：${result.repairId}`);
        repairForm.reset();

        // 送出成功後自動關閉 WOFF 視窗
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
