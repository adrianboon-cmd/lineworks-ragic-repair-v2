let currentUserId = "";

async function initWoff() {
    if (typeof woff !== "undefined") {
        try {
            await woff.init({ woffId: "WiPs90_DcB_oVcPYkXSOrg" });
            if (woff.isLoggedIn && woff.isLoggedIn()) {
                const profile = await woff.getProfile();
                if (profile && profile.userId) {
                    currentUserId = profile.userId;
                    console.log("【WOFF 成功】取得 UserId:", currentUserId);
                }
            } else {
                // 若未登入，強制要求 WOFF 登入
                woff.login();
            }
        } catch (err) {
            console.error("【WOFF 錯誤】初始化失敗，請確認是否在 LINE WORKS App 內開啟:", err);
        }
    } else {
        console.warn("【警告】未檢測到 WOFF SDK，請在 LINE WORKS 應用程式內開啟此網頁。");
    }
}

initWoff();

document.getElementById("repairForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    // 如果還是空的，再次嘗試取得
    if (!currentUserId && typeof woff !== "undefined" && woff.getProfile) {
        try {
            const profile = await woff.getProfile();
            if (profile && profile.userId) {
                currentUserId = profile.userId;
            }
        } catch (e) {
            console.error("提交瞬間取得 Profile 失敗:", e);
        }
    }

    console.log("最終送出的 UserId 狀態:", currentUserId ? currentUserId : "【注意】目前 userId 為空，無法發送聊天室通知！");

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "資料傳送中...";

    const reporter = document.getElementById("reporter").value;
    const equipmentName = document.getElementById("equipmentName").value;
    const urgency = document.getElementById("urgency").value;
    const description = document.getElementById("description").value;
    const repairTime = new Date().toLocaleString('zh-TW', { hour12: false });
    
    const imageInput = document.getElementById("image");
    let imageBase64 = null;
    let imageName = null;

    if (imageInput && imageInput.files && imageInput.files[0]) {
        const file = imageInput.files[0];
        imageName = file.name;
        imageBase64 = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    const payload = {
        reporter,
        equipmentName,
        urgency,
        description,
        repairTime,
        userId: currentUserId,
        imageBase64,
        imageName
    };

    try {
        const response = await fetch("/api/repairs", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.success) {
            document.getElementById("repairForm").style.display = "none";
            document.getElementById("resultContainer").style.display = "block";

            document.getElementById("resRepairNo").textContent = result.repairNo || "已建立";
            document.getElementById("resReporter").textContent = reporter;
            document.getElementById("resEquipment").textContent = equipmentName;
            document.getElementById("resUrgency").textContent = urgency;
            document.getElementById("resDescription").textContent = description;
            document.getElementById("resTime").textContent = repairTime;
        } else {
            alert("送出失敗: " + (result.error || "未知錯誤"));
        }
    } catch (error) {
        console.error("提交錯誤:", error);
        alert("網路異常或伺服器錯誤，請稍後再試。");
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = "送出報修單";
    }
});

document.getElementById("newRepairBtn").addEventListener("click", function() {
    document.getElementById("repairForm").reset();
    document.getElementById("repairForm").style.display = "block";
    document.getElementById("resultContainer").style.display = "none";
});
