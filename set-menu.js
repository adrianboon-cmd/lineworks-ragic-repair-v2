const fetch = require("node-fetch");
const jwt = require("jsonwebtoken");

function generateJwt() {
    const clientId = process.env.LINE_WORKS_CLIENT_ID;
    const serviceAccount = process.env.LINE_WORKS_SERVICE_ACCOUNT;
    const privateKey = process.env.LINE_WORKS_PRIVATE_KEY;

    if (!clientId || !privateKey || !serviceAccount) return null;

    const now = Math.floor(Date.now() / 1000);
    const payload = { iss: clientId, sub: serviceAccount, iat: now, exp: now + 3600 };
    return jwt.sign(payload, privateKey.replace(/\\n/g, '\n'), { algorithm: 'RS256' });
}

async function getAccessToken() {
    const assertion = generateJwt();
    if (!assertion) return null;

    const response = await fetch("https://auth.worksmobile.com/oauth2/v2.0/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
            assertion: assertion,
            client_id: process.env.LINE_WORKS_CLIENT_ID,
            client_secret: process.env.LINE_WORKS_CLIENT_SECRET,
            scope: "bot"
        })
    });

    const data = await response.json();
    return data.access_token;
}

async function setPersistentMenu() {
    const accessToken = await getAccessToken();
    if (!accessToken) {
        console.error("❌ 無法取得 Access Token");
        return;
    }

    const botNo = process.env.LINE_WORKS_BOT_NO;
    const woffUrl = "https://woff.worksmobile.com/woff/hF-5w0yJz-rK-1MfqDtOeA";

    // LINE WORKS 官方正確的 Persistent Menu API payload 格式
    const menuPayload = {
        name: "設備報修",
        content: {
            type: "link",
            title: "🔧 設備報修",
            link: woffUrl
        }
    };

    // 正確的 API 路徑是 /persistent-menu
    const response = await fetch(`https://www.worksapis.com/v1.0/bots/${botNo}/persistent-menu`, {
        method: "PUT",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(menuPayload)
    });

    if (response.ok) {
        console.log("✅ 成功建立 Bot 常駐選單 (Persistent Menu)！");
    } else {
        const err = await response.text();
        console.error("❌ 建立選單失敗:", err);
    }
}

setPersistentMenu();
