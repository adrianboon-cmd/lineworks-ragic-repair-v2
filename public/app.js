let currentUserId = "";

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

// 點擊「申請新的報修」
document.getElementById("newRepairBtn").addEventListener("click", function() {
    document.getElementById("repairForm").reset();
    document.getElementById("repairForm").style.display = "block";
    document.getElementById("resultContainer").style.display = "none";
});

// 點擊「關閉」按鈕：優化處理方式
document.getElementById("closeWindowBtn").addEventListener("click", function() {
    if (typeof woff !== "undefined" && woff.closeWindow) {
        woff.closeWindow();
    } else {
        // 如果在一般瀏覽器無法直接關閉，改為導向空白頁或清除畫面
        try {
            window.close();
        } catch (e) {
            // 若瀏覽器阻擋 window.close()，直接清空畫面並顯示感謝提示
            document.body.innerHTML = `
                <div style="text-align: center; margin-top: 50px; font-family: sans-serif;">
                    <h2>😊 感謝您的填寫</h2>
                    <p>您已完成報修，可以安全關閉此分頁或返回 LINE WORKS。</p>
                    <button onclick="location.reload()" style="padding: 10px 20px; background: #007bff; color: white; border: none; border-radius: 5px; cursor: pointer;">返回填寫新表單</button>
                </div>
            `;
        }
    }
});
