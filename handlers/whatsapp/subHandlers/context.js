const config = require('../../../config.json');

async function contextManager(cache) {
  const context = [];
  let tokensTotal = 0;
  for (let i = cache.length - 1; i >= 0; i--) {
    const message = cache[i];
    const content = message.body
    const tokens = message.tokens;
    if (tokensTotal + tokens > config.contextTokens) break;
    if (tokens > config.contextTokens) break;
    if (cache[i].fromMe) {
        context.push({
          role: 'assistant',
          content: content  
        })
    } else {
        context.push({
          role: 'user',
          content: content  
        })
    }
  }
  return context
}

module.exports = contextManager;