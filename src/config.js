const requiredVariables = [
  "RAGIC_API_KEY",
  "RAGIC_BASE_URL",
  "WOFF_ID"
];

function validateEnvironment() {
  const missing = requiredVariables.filter(
    (name) => !process.env[name]
  );

  if (missing.length > 0) {
    console.warn(
      "Missing environment variables: " + missing.join(", ")
    );
  }
}

validateEnvironment();

module.exports = {
  port: process.env.PORT || 3000,

  ragic: {
    apiKey: process.env.RAGIC_API_KEY,
    baseUrl:
      process.env.RAGIC_BASE_URL ||
      "https://ap3.ragic.com/fujifilmDemo/line-works/1",

    fields: {
      ticketNumber: process.env.RAGIC_FIELD_TICKET_NUMBER || "",
      status: process.env.RAGIC_FIELD_STATUS || "1054237",
      reporter: process.env.RAGIC_FIELD_REPORTER || "1054240",
      equipment: process.env.RAGIC_FIELD_EQUIPMENT || "1054241",
      description: process.env.RAGIC_FIELD_DESCRIPTION || "1054242",
      photo: process.env.RAGIC_FIELD_PHOTO || "1054243",
      assignee: process.env.RAGIC_FIELD_ASSIGNEE || "1054331",
      dueDate: process.env.RAGIC_FIELD_DUE_DATE || "1054332",
      progress: process.env.RAGIC_FIELD_PROGRESS || "1054333",
      updatedAt: process.env.RAGIC_FIELD_UPDATED_AT || "1054334",
      lineworksUserId:
        process.env.RAGIC_FIELD_LINEWORKS_USER_ID || "1054335",
      priority: process.env.RAGIC_FIELD_PRIORITY || "1054336"
    }
  },

  lineworks: {
    clientId: process.env.LW_CLIENT_ID,
    clientSecret: process.env.LW_CLIENT_SECRET,
    serviceAccount: process.env.LW_SERVICE_ACCOUNT,
    privateKey: process.env.LW_PRIVATE_KEY,
    botId: process.env.LW_BOT_ID,
    woffId:
      process.env.WOFF_ID ||
      "3Wjwqq3UyBqY3x0VGQWr2Q",
    adminUserIds: (process.env.ADMIN_USER_IDS || "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
  }
};
