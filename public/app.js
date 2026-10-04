let currentUserId = "";

// 初始化 WOFF 取得使用者資訊
async function initWoff() {
    if (typeof woff !== "undefined") {
        try {
            await woff.init({ woffId: "-VMtnIBToJBYVu2OoHwKTw" });
            if (woff.isLoggedIn && woff.isLoggedIn()) {
                const profile = await woff.getProfile();
                if (profile && profile.userId) {
                    currentUserId = profile.userId;
                    console.log("成功取得 LINE WORKS UserId:", currentUserId);
                }
            } else {
                // 若未登入，強制導向登入
                woff.login();
            }
        } catch (err) {
            console.error("WOFF 初始化失敗:", err);
        }
    } else {
        console.warn("未偵測到 WOFF SDK");
    }
}

// 頁面載入時執行
window.addEventListener("DOMContentLoaded", () => {
    initWoff();
});

document.getElementById("repairForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    // 提交前最後一次確認
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

    console.log("準備送出，當前 userId 狀態:", currentUserId);

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
        userId: currentUserId, // 傳遞抓到的 userId
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
