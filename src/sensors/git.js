var _ = require('lodash');
var Q = require('q');
var exec = require('../utils/process').exec;

var GIT_LOG = 'git log -1 --pretty=format:"%H\n%ai\n%an\n%B"';
var HASH_LEN = 8;

return module.exports = {

    // MODULE PUBLIC API:
    getCurrentTimestamp: getCurrentTimestamp,
    getCurrentReading: getCurrentReading,

};

// Allows this sensor to provide a timestamp for a log entry
function getCurrentTimestamp(sensorConfig) {
    return getCurrentCommit(sensorConfig).get('date');
}

// Promises the current value(s) of this sensor
function getCurrentReading(sensorConfig) {
    return getCurrentCommit(sensorConfig).then(function(commit) {
        return _.pick(commit, 'hash');
    });
}

// Promises the "git log" object for the HEAD commit
function getCurrentCommit(sensorConfig) {
    var cmd = 'cd ' + sensorConfig.pwd + ';' + GIT_LOG;
    return exec(cmd).then(function(output) {
        output = output.split('\n');
        if (output.length < 4) {
            return Q.reject('Unparseable git output: ' + output);
        } else {
            return {
                hash: output[0].substr(0, HASH_LEN),
                date: output[1],
                author: output[2],
                message: output.slice(3).join('\n').trim()
            };
        }
    });
}
