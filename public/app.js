function showRepair(){

document.getElementById("content").innerHTML = `

<div class="card">

<h2>我要報修</h2>

<input id="reporter" placeholder="填報人">

<input id="equipment" placeholder="設備名稱">

<textarea id="description"
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

function showStatus(){

document.getElementById("content").innerHTML = `

<div class="card">

<h2>進度查詢</h2>

<input placeholder="案件編號">

<button>

查詢

</button>

</div>

`;

}

function showDispatch(){

document.getElementById("content").innerHTML = `

<div class="card">

<h2>維修派工</h2>

<input placeholder="案件編號">

<input placeholder="派工人員">

<button>

更新案件

</button>

</div>

`;

}

async function submitRepair(){

alert("下一步接Ragic");

}
