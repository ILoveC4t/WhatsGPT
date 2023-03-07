const { messageHandler } = require('../handlers/whatsapp/whatsapp');

async function run(client, msg) {
    try {
        const chat = await msg.getChat();
        await chat.sendSeen();
        await messageHandler(msg);
    } catch (err) {
        console.log(err);
    }
}

module.exports = run