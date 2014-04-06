var _ = require('lodash');
var Q = require('q');
var exec = require('../utils/process').exec;

var GIT_LOG = 'git log -1 --pretty=format:"%H\n%ai\n%an\n%B"';
var HASH_LEN = 8;
var DEFAULT_CONTRIB_CUTOFF_DAYS = 7;

return module.exports = {

    // MODULE PUBLIC API:
    getCurrentTimestamp: getCurrentTimestamp,
    getCurrentReading: getCurrentReading,

    // Expose specific internals for unit-testing only:
    __test: {
        getContributors: getContributors
    }

};

// Allows this sensor to provide a timestamp for a log entry
function getCurrentTimestamp(sensorConfig) {
    return getCurrentCommit(sensorConfig).get('date');
}

// Promises the current value(s) of this sensor
function getCurrentReading(sensorConfig) {
    return getCurrentCommit(sensorConfig).then(function(commit) {
        return getContributors(sensorConfig, commit.date.substr(0, 10)).then(function(contributors) {
            return {
                hash: commit.hash,
                contributors: contributors
            };
        });
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

function getRangeStartDate(rangeEndDate, numberOfDays) {
    if (rangeEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return new Date(new Date(rangeEndDate).getTime() - (numberOfDays - 1) * 24 * 60 * 60 * 1000).toISOString().substr(0, 10);
    } else {
        throw new Error('Unparseable rangeEndDate: ' + rangeEndDate);
    }
}

function getContributors(sensorConfig, rangeEndDate, execImplementation) {
    if (!rangeEndDate.match(/^\d{4}-\d{2}-\d{2}$/)) {
        return Q.reject('Unparseable rangeEndDate: ' + rangeEndDate);
    }
    var rangeStartDate = getRangeStartDate(rangeEndDate, sensorConfig.contributionDaysCutoff || DEFAULT_CONTRIB_CUTOFF_DAYS);
    var cmd = 'cd ' + sensorConfig.pwd + '; git log --pretty=format:"%an" --after={' + rangeStartDate + '} --before={' + rangeEndDate + '} --all';
    return (execImplementation || exec)(cmd).then(function(output) {
        return _(output.split('\n')).uniq().compact().sort().value();
    });
}
