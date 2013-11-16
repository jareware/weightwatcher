var fs = require('fs');
var http = require('http');
var WebSocket = require('ws');

//var URL_TO_PROFILE = 'http://localhost:8000/';
var URL_TO_PROFILE = 'http://www.futurice.com/';
var TARGET_DEBUGGEE = 'http://localhost:9222/';

http.get(TARGET_DEBUGGEE + 'json', function(res) {
    res.setEncoding('utf8');
    res.on('data', function(body) { // assume a single chunk
        var parsed = JSON.parse(body);
        var availableTabs = parsed.filter(function(tab) {
            return !!tab.webSocketDebuggerUrl;
        });
        if (availableTabs.length === 0) {
            throw new Error('No debuggable tabs available');
        }
        connectToDebuggee(availableTabs[0].webSocketDebuggerUrl);
    });
}).on('error', function(e) {
    console.log("Got error: " + e.message);
});

function connectToDebuggee(wsURL) {

    var idCounter = 1;
    var responseCounter = 0;
    var debuggee = new WebSocket(wsURL);
    var timeStart, timeDOMLoad, timeLoad;

    debuggee.on('open', function() {

        console.log('Connected to debuggee at ' + wsURL);

        send({
            "method": "Network.enable"
        });
        send({
            "method": "Page.enable"
        });
        send({
            "method": "Network.setCacheDisabled",
            "params": {
                "cacheDisabled": true
            }
        });
        send({
            "method": "Network.clearBrowserCache",
            "params": {
                "cacheDisabled": true
            }
        });
//        send({
//            "method": "Runtime.evaluate",
//            "params": {
//                "expression": "window.location.href = 'http://futurice.com/'"
//            }
//        });

    });

    debuggee.on('message', function(message) {

        var parsed = JSON.parse(message);
//        console.log(message + '\n');

        if (parsed.id < idCounter && --responseCounter === 0) {
            responseCounter = NaN;
            console.log('Preparations done, navigating');
            send({
                "method": "Page.navigate",
                "params": {
                    "url": URL_TO_PROFILE
                }
            });
        }

        if (parsed.method === 'Network.responseReceived' && parsed.params.response.url === URL_TO_PROFILE) {
            timeStart = parsed.params.response.timing.requestTime;
            console.log('timeStart = ' + timeStart);
        }

        if (parsed.method === 'Page.domContentEventFired') {
            timeDOMLoad = parsed.params.timestamp;
            console.log('timeDOMLoad = ' + timeDOMLoad);
        }

        if (parsed.method === 'Page.loadEventFired') {
            timeLoad = parsed.params.timestamp;
            console.log('timeLoad = ' + timeLoad);
        }

        if (timeStart && timeDOMLoad && timeLoad) {
            console.log('\nDONE:');
            console.log('DOMContentLoaded:', Math.round((timeDOMLoad - timeStart) * 1000), 'ms');
            console.log('load:', Math.round((timeLoad - timeStart) * 1000), 'ms');
            process.exit(0);
        }

    });

    function send(message) {
        responseCounter++;
        message.id = idCounter++;
        var json = JSON.stringify(message);
//        console.log('-----> ' + json + '\n');
        debuggee.send(json);
    }

}
