const WebSocketClient = require('websocket').client;
const config = require('./config');
const mustache = require('mustache');

const seen = new Set();

const kamadanClient = new WebSocketClient();
const twilioClient = require('twilio')(config.connection.twilioSid, config.connection.twilioToken);
const matches = config.matches.map((match) => {
    const regex = new RegExp(match.regex, 'i');
    return {
        matches: (message) => {
            return regex.test(message);
        },
        message: match.message,
        target: match.target,
    };
});

function filter(data) {
    console.log('Testing ' + data.message + ' [' + data.id + ']');
    for (const match of matches) {
        if (match.matches(data.message)) {
            const vars = {
                name: data.name,
                message: data.message,
            }
            const body = mustache.render(match.message, vars);
            console.log('*******creating message');
            console.log(JSON.stringify(body, null, 2));
            // twilioClient.messages
            //     .create({
            //         body,
            //         from: config.connection.twilioNumber,
            //         to: config.connection.targetPhoneNumbers[match.target],
            //     })
            //     .done();
        }
    }
}

kamadanClient.on('connectFailed', (error) => {
    console.log('Could not connect to server: ' + error.toString());
});

kamadanClient.on('connect', (connection) => {
    console.log('Connected to Kamadan trade chat');

    connection.on('error', (error) => {
        console.log('Error with connection: ' + error.toString()); 
    });

    connection.on('close', (error) => {
        console.log('Connection to Kamadan closed.');
    });

    connection.on('message', (message) => {
        const blob = JSON.parse(message.utf8Data);
        if (!seen.has(blob.message)) {
            seen.add(blob.message);
            filter(blob);
        }
    });
});

kamadanClient.connect(config.connection.kamadanUrl);