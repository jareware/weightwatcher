// This script implements a man-in-the-middle WebSocket proxy for use with the Chrome DevTools

var fs = require('fs');
var WebSocket = require('ws');
var WebSocketServer = require('ws').Server;

var LOG_FILE = 'devtools-log.json';
var TARGET_DEBUGGEE = 'ws://localhost:9222/devtools/page/83DE8737-1CEC-6FC0-37B2-8DB8774BA1CC';
var PROXY_PORT = 9223;

var debuggee = new WebSocket(TARGET_DEBUGGEE);
var proxyServer = new WebSocketServer({ port: PROXY_PORT });
var log = [];

debuggee.on('open', function() {
    console.log('Connected to debuggee');
});

proxyServer.on('connection', function(connection) {

    console.log('Debugger connected');

    connection.on('message', function(message) {
        var json = JSON.parse(message);
        console.log('Relaying debugger request #' + json.id);
        log.push({ debuggerRequest: json });
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, undefined, 4));
        debuggee.send(message);
    });

    debuggee.on('message', function(message) {
        var json = JSON.parse(message);
        if (json.id) {
            console.log('Relaying debuggee response #' + json.id);
            var correspondingRequest = log.filter(function(item) {
                return item.debuggerRequest && item.debuggerRequest.id === json.id;
            });
            if (correspondingRequest.length === 1) {
                correspondingRequest[0].debuggeeResponse = json;
            } else {
                throw new Error('Request/response ID mismatch :(');
            }
        } else {
            console.log('Relaying debuggee message');
            log.push({ debuggeeMessage: json });
        }
        fs.writeFileSync(LOG_FILE, JSON.stringify(log, undefined, 4));
        connection.send(message);
    });

});
