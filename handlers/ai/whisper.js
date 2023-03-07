const config = require('../../config.json');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: config.openaiKey,
});
const openai = new OpenAIApi(configuration);
const fse = require('fs-extra');

async function transcribe(audio) {
    return new Promise(async (resolve, reject) => {
        try {
            const response = await openai.createTranscription(await fse.createReadStream(audio), "whisper-1");
            resolve(response.data.text);
        } catch (err) {
            console.log(err.response.data.error)
            reject(err);
        }
    });
}

module.exports = {
    transcribe
}