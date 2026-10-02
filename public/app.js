function showRepair() {

    document.getElementById("content").innerHTML = `
        <div class="card">

            <h2>我要報修</h2>

            <input
                id="reporter"
                placeholder="填報人">

            <input
                id="equipment"
                placeholder="設備名稱">

            <textarea
                id="description"
                placeholder="故障描述"></textarea>

            <select id="priority">
                <option>一般</option>
                <option>緊急</option>
            </select>

            <button onclick="submitRepair()">
                送出報修
            </button>

        </div>
    `;
}

function showStatus() {

    document.getElementById("content").innerHTML = `
        <div class="card">

            <h2>進度查詢</h2>

            <input
                id="ticketNumber"
                placeholder="案件編號">

            <button>
                查詢
            </button>

        </div>
    `;
}

function showDispatch() {

    document.getElementById("content").innerHTML = `
        <div class="card">

            <h2>維修派工</h2>

            <input
                id="ticket"
                placeholder="案件編號">

            <input
                id="assignee"
                placeholder="派工人員">

            <button>
                更新案件
            </button>

        </div>
    `;
}

async function submitRepair() {

    const reporter =
        document.getElementById("reporter").value;

    const equipment =
        document.getElementById("equipment").value;

    const description =
        document.getElementById("description").value;

    const priority =
        document.getElementById("priority").value;

    try {

        const response = await fetch(
            "/api/repairs",
            {
                method: "POST",
                headers: {
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify({
                    reporter,
                    equipment,
                    description,
                    priority
                })
            }
        );

        const result =
            await response.json();

        alert("案件建立成功");

        console.log(result);

    }
    catch (error) {

        console.error(error);

        alert("建立失敗");
    }
}
