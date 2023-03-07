const config = require('../../config.json');
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: config.openaiKey,
});
const openai = new OpenAIApi(configuration);

const chatGptConfig = {
    model: "gpt-3.5-turbo",
    temperature: 0.7,
    max_tokens: config.maxReplyTokens,
    frequency_penalty: 0,
    presence_penalty: 0
}

async function getResponse(context) {
    return new Promise(async (resolve, reject) => {
        try {
            let gptConfigTemp = chatGptConfig;
            gptConfigTemp.messages = context;
            const response = await openai.createChatCompletion(gptConfigTemp);
            let result = response.data.choices[0].message.content
            resolve(result)
        } catch (err) {
            console.log(err.response.data.error)
            reject(err)
        }
    })
}

module.exports = {
    getResponse
}