let currentUserId = ""; // 1. 初始化 WOFF 取得 userId (供備用或追蹤用)

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

document.getElementById("repairForm").addEventListener("submit", async function(event) {
    event.preventDefault();

    const submitBtn = document.getElementById("submitBtn");
    submitBtn.disabled = true;
    submitBtn.textContent = "資料傳送中...";

    // 取得表單欄位值
    const reporter = document.getElementById("reporter").value;
    const equipmentName = document.getElementById("equipmentName").value;
    const urgency = document.getElementById("urgency").value;
    const description = document.getElementById("description").value;
    const repairTime = document.getElementById("repairTime") ? document.getElementById("repairTime").value : new Date().toISOString();
    
    // 取得上傳的圖片檔案
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
console.log("前端準備送出的 imageBase64 內容:", imageBase64);
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
            alert("報修單送出成功！");
            document.getElementById("repairForm").reset();
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
