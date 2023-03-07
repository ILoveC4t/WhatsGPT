const config = require('../../config.json');
const client = require('../../index');
const { MessageTypes } = require('whatsapp-web.js')
const { getResponse } = require('../ai/gpt');
const contextManager = require('./subHandlers/context');
const audioHandler = require('./subHandlers/audio');
const { cacheMessage, getMessages } = require('./subHandlers/messageCache');

const fse = require('fs-extra');

let queue = {};
setInterval(() => {
    for (let id in queue) {
        msg.getChat().sendStateTyping()
        if (queue[id].time + 5000 < Date.now()) {
            messageResponder(queue[id].msg);
            delete queue[id];
        }
    }
}, 500);

const knownTypes = [
    MessageTypes.TEXT,
    MessageTypes.AUDIO,
    MessageTypes.VOICE
]

async function getContent(msg) {
    let content = null;
    switch (msg.type) {
        case MessageTypes.TEXT:
            content = msg.caption || msg.body;
            break;
        case MessageTypes.AUDIO:
        case MessageTypes.VOICE:
            const audioLength = Number(msg.duration);
            if (audioLength > config.maxAudioDuration) {
                await messageResponder(msg, [`Sorry, I can't transcribe audio messages longer than ${await secondsToTimeStr(config.maxAudioDuration)}.`]);
                return;
            }
            const transcribed = await audioHandler(msg);
            if (transcribed && transcribed.length > 0) content = `Transcribed Content: ${transcribed}`;
            else content = "Audio message could not be transcribed.";
            break;
        default:
            return
    }
    if (content) await cacheMessage(msg, content);
    return content;
}

async function messageHandler(msg) {
    const chat = await msg.getChat();
    if (msg.from.id === 'status@broadcast') return;
    if (msg.fromMe) return;

    if (chat.isGroup) {
        await messageResponder(msg, ["Sorry, right now I can't respond to group chats."]);
        return;
    }

    if (!knownTypes.includes(msg.type)) {
        await messageResponder(msg, ["Sorry, I can't respond to that type of message."]);
        return;
    }

    const content = await getContent(msg);
    if (!content) {
        await messageResponder(msg, ["Sorry, something went wrong while parsing your Messages content."]);
        return;
    }
    queue[msg.id.id] = {
        msg,
        time: Date.now()
    }
}

async function messageResponder(msg, response) {
    const chat = await msg.getChat();
    const chatID = chat.id._serialized;
    console.log(chatID);
    const messages = await getMessages(chatID);
    const context = await contextManager(messages);
    if (!response) {
        response = await getResponse(context);
    }
    let responseMessage = null;
    if (response) {
        responseMessage = await chat.sendMessage(response);
    } else {
        responseMessage = await chat.sendMessage("Sorry, I couldn't think of anything to say.");
    }
    await cacheMessage(responseMessage, response);
    context.push(response);
    await logHandler(chatID, context);
}

async function logHandler(chatID, context) {
    const logPath = './logs';
    const logDir = `${logPath}/${chatID}`;
    const logFile = `log-${Date.now()}.json`;
    await fse.ensureDir(logDir);
    await fse.writeJSON(`${projectRoot}/${logDir}/${logFile}`, context);
    await logCleaner(chatID);
}

async function logCleaner(chatID) {
    const logPath = `${projectRoot}/logs/${chatID}`;
    const files = await fse.readdir(logPath);
    const namesDates = files.map(file => {
        return {
            name: file,
            date: Number(file.split('-')[1].split('.')[0])
        }
    });
    namesDates.sort((a, b) => b.date - a.date);
    const toDelete = namesDates.slice(10);
    for (let i = 0; i < toDelete.length; i++) {
        await fse.remove(`${logPath}/${toDelete[i].name}`);
    }
}

async function secondsToTimeStr(seconds) {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const timeStr = `${hrs > 0 ? `${hrs} hours, ` : ''}${mins > 0 ? `${mins} minutes, ` : ''}${secs} seconds`;
    return timeStr;
}

module.exports = {
    messageHandler
}
