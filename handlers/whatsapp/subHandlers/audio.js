const fse = require('fs-extra');
const ffmpeg = require('fluent-ffmpeg');
const stream = require('stream');

const { transcribe } = require('../../ai/whisper');

async function audioHandler(msg) {
    const messageID = msg.id.id;
    await fse.ensureDir(`./cache/`);
    const attachment = await msg.downloadMedia();
    const base64 = attachment.data;
    const buffer = Buffer.from(base64, 'base64');
    const inputStream = new stream.PassThrough();
    inputStream.end(buffer);
    const mp3 = `./cache/${messageID}.mp3`;  
    await new Promise((resolve, reject) => {    
        ffmpeg(inputStream)
            .inputFormat('ogg')
            .toFormat('mp3')
            .outputOptions('-ac 1')
            .on('error', (err) => {
                console.error(err);
                reject(err);
            })
            .on('end', () => {
                resolve();
            })
            .save(mp3);
    });
    // I spent a literal hour trying to figure out how to do this thing without
    // Writing to a file, but eh...
    content = await transcribe(mp3);
    await fse.remove(mp3);
    return content;
}

module.exports = audioHandler;
