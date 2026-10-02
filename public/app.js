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

async function submitRepair() {

    alert("Step 1");

    const response = await fetch("/health");

    alert("Step 2");

    const result = await response.json();

    alert(JSON.stringify(result));

}
