let currentUserId = "";

// 1. 初始化 WOFF 取得 profile (userId)
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

    // 從網址列或 WOFF 取得 userId
    const urlParams = new URLSearchParams(window.location.search);
    const userIdFromUrl = urlParams.get("userId") || urlParams.get("user_id");
    const finalUserId = currentUserId || userIdFromUrl || "";

    const reporter = document.getElementById("reporter")?.value || "";
    const equipment = document.getElementById("equipment")?.value || "";
    const priority = document.getElementById("priority")?.value || "";
    const description = document.getElementById("description")?.value || "";

    // 使用 URLSearchParams 打包，確保 Express 內建解析器 100% 讀得到
    const params = new URLSearchParams();
    params.append("reporter", reporter);
    params.append("equipment", equipment);
    params.append("name", reporter);
    params.append("device", equipment);
    params.append("priority", priority);
    params.append("description", description);
    params.append("userId", finalUserId);

    try {
      const response = await fetch("/api/repairs", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded"
        },
        body: params.toString()
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
