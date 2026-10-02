const axios = require("axios");
const config = require("./config");

async function createRepair(data) {
  const url =
    `${config.ragic.baseUrl}?api&version=2025-01-01`;

  if (!config.ragic.apiKey) {
    throw new Error(
      "Render 尚未設定 RAGIC_API_KEY"
    );
  }

  const payload = {};

  payload[config.ragic.fields.reporter] =
    data.reporter;

  payload[config.ragic.fields.equipment] =
    data.equipment;

  payload[config.ragic.fields.description] =
    data.description;

  payload[config.ragic.fields.priority] =
    data.priority || "一般";

  payload[config.ragic.fields.status] =
    "待處理";

  payload[config.ragic.fields.updatedAt] =
    new Date().toISOString();

  console.log(
    "正在建立 Ragic 案件:",
    JSON.stringify({
      reporter: data.reporter,
      equipment: data.equipment,
      priority: data.priority
    })
  );

  const response = await axios.post(
    url,
    payload,
    {
      headers: {
        Authorization:
          `Basic ${config.ragic.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json"
      },
      timeout: 15000
    }
  );

  console.log(
    "Ragic API 回傳:",
    JSON.stringify(response.data)
  );

  if (
    response.data &&
    response.data.status === "ERROR"
  ) {
    throw new Error(
      response.data.msg ||
      "Ragic 建立案件失敗"
    );
  }

  return response.data;
}

module.exports = {
  createRepair
};
