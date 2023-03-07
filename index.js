const config = require('./config.json');

const whatsappweb = require('whatsapp-web.js')
const fse = require('fs-extra');

global.projectRoot = __dirname;

const client = new whatsappweb.Client({
    authStrategy: new whatsappweb.LocalAuth({
        clientId: config.clientId,
    }),
    puppeteer: {
        headless: true,
        // fix for Goofy linux behavior
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    }
});

async function main() {
    fse.readdirSync('./events/').forEach(file => {
        const eventName = file.split('.')[0];
        const eventFunction = require(`./events/${file}`);
        client.on(eventName, (...args) => eventFunction(client, ...args));
    });
    
    client.initialize();
}
main();

module.exports = client;