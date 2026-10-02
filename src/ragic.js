const axios = require("axios");
const config = require("./config");

async function createRepair(data) {

  const url =
    `${config.ragic.baseUrl}?api&version=2025-01-01`;

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

const response = await axios.get(
  `${url}&APIKey=${config.ragic.apiKey}`
);

  return response.data;
}

async function findRepair(ticketNumber) {
console.log("API KEY EXISTS:", !!config.ragic.apiKey);
  
  const url =
    `${config.ragic.baseUrl}?api&version=2025-01-01`;

  const response = await axios.get(
    url,
    {
      auth: {
        username: config.ragic.apiKey,
        password: ""
      }
    }
  );

  const data = response.data;
  
console.log(
  JSON.stringify(
    response.data,
    null,
    2
  )
);
  const records =
    Object.values(data);

  const record =
    records.find(
      r =>
        r[
          config.ragic.fields.ticketNumber
        ] === ticketNumber
    );

  return record;
}

module.exports = {
  createRepair,
  findRepair
};
