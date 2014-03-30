var Q = require('q');
var FS = require('q-io/fs');

var DEFAULT_DATA_FILE = '.weightwatcher-data.json';

return module.exports = {

    // MODULE PUBLIC API:
    writeLogEntry: writeLogEntry

};

function getExistingData(dataFile) {
    return FS.read(dataFile).then(JSON.parse).fail(function() {
        return Q({}); // default to an empty object (and "redeem" the promise)
    });
}

// Promises to (over)write the given data to a log entry
function writeLogEntry(config, entryUID, entryData) {
    var dataFile = config.dataFile || DEFAULT_DATA_FILE;
    return getExistingData(dataFile).then(function(existingData) {
        existingData[entryUID] = entryData;
        existingData = JSON.stringify(existingData, undefined, 4);
        return FS.write(dataFile, existingData);
    });
}
