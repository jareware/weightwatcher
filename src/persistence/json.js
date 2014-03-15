var Q = require('q');
var FS = require('q-io/fs');

var DATA_FILE = 'weightwatcher-data.json';

return module.exports = {

    // MODULE PUBLIC API:
    writeLogEntry: writeLogEntry

};

function getExistingData() {
    return FS.read(DATA_FILE).then(JSON.parse).fail(function() {
        return Q({}); // default to an empty object
    });
}

// Promises to (over)write the given data to a log entry
function writeLogEntry(entryUID, entryData) {
    return getExistingData().then(function(existingData) {
        existingData[entryUID] = entryData;
        existingData = JSON.stringify(existingData, undefined, 4);
        return FS.write(DATA_FILE, existingData);
    });
}
