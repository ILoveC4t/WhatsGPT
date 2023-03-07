async function run(client) {
    console.log('Client is now Listening!')
    //every minute send presence update
    //idk if i didnt do it it would go offline after a while
    //docs dont say anything about it
    setInterval(async () => {
        client.sendPresenceAvailable();
    }, 60000);
}

module.exports = run