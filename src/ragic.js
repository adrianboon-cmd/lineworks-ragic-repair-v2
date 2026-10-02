const axios = require("axios");
const config = require("./config");

async function createRepair(data) {

  const url =
    `${config.ragic.baseUrl}` +
    `?api&version=2025-01-01`;

  const payload = {};

  payload[config.ragic.fields.reporter] =
    data.reporter;

  payload[config.ragic.fields.equipment] =
    data.equipment;

  payload[config.ragic.fields.description] =
    data.description;

  payload[config.ragic.fields.priority] =
    data.priority;

  payload[config.ragic.fields.status] =
    "待處理";

  payload[config.ragic.fields.updatedAt] =
    new Date().toISOString();

  const response = await axios.post(
    url,
    payload,
    {
      auth: {
        username: config.ragic.apiKey,
        password: ""
      }
    }
  );

  return response.data;
}

module.exports = {
  createRepair
};
