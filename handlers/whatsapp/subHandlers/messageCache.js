// I like this a lot better than sqlite3
const sqllite = require('better-sqlite3');
const path = require('path');
const nodeSchedule = require('node-schedule');
const fse = require('fs-extra');
const { MessageTypes } = require('whatsapp-web.js');
const gpt3encoder = require('gpt-3-encoder');

// could be better but its ok like this
// heee heee im just goofy like that
const schedule = nodeSchedule.scheduleJob('0 * * * *', cleanup);

const dbPath = path.join(projectRoot, 'cache', 'cache.db');
await fse.ensureDir(path.join(projectRoot, 'cache'));
const db = sqllite(dbPath);

db.prepare('CREATE TABLE IF NOT EXISTS chats (chatID TEXT PRIMARY KEY)').run();

async function getMessages(chatID) {

    return new Promise(async (resolve, reject) => {
        try {
            if (!await authorCheck(chatID)) {
                console.log('Sussy Chat ID: ', chatID);
                reject('Sussy Chat ID');
            }
            const getMessagesQuery = [`SELECT * FROM "${chatID}" ORDER BY timestamp DESC LIMIT 50`];
            const messages = db.prepare(getMessagesQuery[0]).all();
            resolve(messages);
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function cacheMessage(msg, transcription) {
    return new Promise(async (resolve, reject) => {
        try {
            const paredMsgObj = {};
            paredMsgObj.chatID = (await msg.getChat()).id._serialized;
            paredMsgObj.fromMe = msg.fromMe ? 1 : 0;
            paredMsgObj.id = msg.id.id;
            paredMsgObj.time = msg.timestamp;
            paredMsgObj.type = msg.type;
            switch(msg.type) {
                case MessageTypes.TEXT:
                    paredMsgObj.body = msg.caption || msg.body;
                    break;
                case MessageTypes.AUDIO:
                case MessageTypes.VOICE:
                    paredMsgObj.body = transcription;
                    break;
                default:
                    if (msg.caption) {
                        paredMsgObj.body = msg.caption;
                        break;
                    }
                    return;
            }
            paredMsgObj.tokens = gpt3encoder.encode(paredMsgObj.body).length;
            if (!await authorCheck(paredMsgObj.chatID)) {
                console.log('Sussy Message Object: ', paredMsgObj);
                reject('Sussy Message Object');
            }
            await prepareUserTable(paredMsgObj.chatID);
            const insertQuery = [`INSERT INTO "${paredMsgObj.chatID}" (messageID, body, type, timestamp, tokens, fromMe) VALUES (?, ?, ?, ?, ?, ?)`, [paredMsgObj.id, paredMsgObj.body, paredMsgObj.type, paredMsgObj.time, paredMsgObj.tokens, paredMsgObj.fromMe]];
            db.prepare(insertQuery[0]).run(...insertQuery[1]);
            resolve();
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function prepareUserTable(chatID) {
    return new Promise(async (resolve, reject) => {
        try {
            const insertUserQuery = [`INSERT OR IGNORE INTO chats (chatID) VALUES (?)`, [chatID]];
            db.prepare(insertUserQuery[0]).run(...insertUserQuery[1]);
            const createTableQuery = [`CREATE TABLE IF NOT EXISTS "${chatID}" (id INTEGER PRIMARY KEY AUTOINCREMENT, messageID TEXT UNIQUE, body TEXT, type TEXT, timestamp INTEGER, tokens INTEGER, fromMe INTEGER)`];
            db.prepare(createTableQuery[0]).run();
            resolve();
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });
}

async function cleanup() {
    return new Promise(async (resolve, reject) => {
        try {
            const chatsQuery = [`SELECT * FROM chats`];
            const chats = await db.all(...chatsQuery);
            const promises = chats.map(user => {
                const cleanUpQuery = [`DELETE FROM "${user.chatID}" WHERE id NOT IN (SELECT id FROM "${user.chatID}" ORDER BY id DESC LIMIT 100)`];
                db.prepare(cleanUpQuery[0]).run();
            });
            await Promise.all(promises);
            resolve();
        } catch (err) {
            console.log(err);
            reject(err);
        }
    });    
}

// I dont think theres an actual risk of sql injection but muh best practices
// jk i couldnt tell ya why i did this
async function authorCheck(chatID) {
    const author = chatID.split('@')
    if (author[1] !== 'c.us') {
        return false;
    }
    if (isNaN(parseInt(author[0]))) {
        return false;
    }
    return true;
}

module.exports = {
    cacheMessage,
    getMessages
}
