const qrcode = require('qrcode-terminal');

async function run(client, qr) {
    qrcode.generate(qr, {small: true});
}

module.exports = run