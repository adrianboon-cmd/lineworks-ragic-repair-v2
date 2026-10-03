const fetch = require("node-fetch");

async function setupPersistentMenu() {
    const botId = process.env.BOT_ID || "13282881";
    const botSecret = process.env.BOT_SECRET;

    if (!botSecret) {
        console.error("❌ 錯誤：缺少 BOT_SECRET 環境變數");
        process.exit(1);
    }

    console.log("正在取得 LINE WORKS Bot Token...");
    const tokenResponse = await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/token`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "consumerKey": botSecret
        }
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) {
        console.error("❌ 取得 Bot Token 失敗:", JSON.stringify(tokenData));
        process.exit(1);
    }

    const accessToken = tokenData.token || tokenData.access_token;
    console.log("✅ 成功取得 Bot Token，正在設定 WOFF 常駐選單...");

    const menuResponse = await fetch(`https://www.worksapis.com/v1.0/bots/${botId}/persistentmenu`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${accessToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            content: {
                actions: [
                    {
                        type: "uri",
                        label: "線上報修",
                        uri: "https://lineworks-ragic-repair-v2.onrender.com/"
                    }
                ]
            }
        })
    });

    const resText = await menuResponse.text();
    if (!menuResponse.ok) {
        console.error("❌ 設定常駐選單失敗:", resText);
        process.exit(1);
    }

    console.log("🎉 Persistent menu 常駐選單設定成功！", resText);
}

setupPersistentMenu();
