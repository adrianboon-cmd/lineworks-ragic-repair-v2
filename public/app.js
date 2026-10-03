let currentUserId = "";

// 1. 初始化 WOFF 取得 userId (供備用或追蹤用)
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
        
        const originalBtnText = submitBtn ? submitBtn.textContent : "送出";
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = "正在送出報修單...";
        }

        // 收集表單各手動輸入欄位的值
        const formData = {
            reporter: document.getElementById("reporter")?.value || "",
            equipmentName: document.getElementById("equipmentName")?.value || "",
            urgency: document.getElementById("urgency")?.value || "一般",
            description: document.getElementById("description")?.value || "",
            userId: currentUserId
        };

        console.log("準備送出的表單資料:", formData);

        try {
            const response = await fetch("/api/repairs", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(formData)
            });

            const result = await response.json();

            if (response.ok && result.success) {
                const repairNo = result.repairNo || "已成功建立";
                alert(`報修單已成功送出！\n您的案件編號為: ${repairNo}`);
                repairForm.reset();
            } else {
                alert(`送出失敗: ${result.error || "未知錯誤"}`);
            }
        } catch (error) {
            console.error("連線錯誤:", error);
            alert("無法連接伺服器，請稍後再試...");
        } finally {
            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = originalBtnText;
            }
        }
    });
});
