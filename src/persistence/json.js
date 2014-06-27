var Q = require('q');
var FS = require('q-io/fs');

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
    var dataFile = config.global.dataFile;
    if (!dataFile) {
        return Q.reject('No data file configured (config.global.dataFile should point to one)');
    }
    return getExistingData(dataFile).then(function(existingData) {
        existingData[entryUID] = entryData;
        existingData = JSON.stringify(existingData, undefined, 4);
        return FS.write(dataFile, existingData);
    });
}
