var Q = require('q');
var exec = require('./../utils/process').exec;

var GIT_LOG = 'git log -1 --pretty=format:"%H\n%ai\n%an\n%B"';

// Allows this sensor to provide identity for a log entry
exports.entryIdentityProvider = function() {
    return exports.getCurrentReading().get('hash');
};

// Promises the current value(s) of this sensor
exports.getCurrentReading = function() {
    return exec(GIT_LOG).then(function(output) {
        output = output.split('\n');
        if (output.length < 4) {
            return Q.reject('Unparseable git output: ' + output);
        } else {
            return {
                hash: output[0],
                date: output[1],
                author: output[2],
                message: output.slice(3).join('\n').trim()
            };
        }
    });
};
