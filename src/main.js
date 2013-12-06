var Q = require('q');
var FS = require('q-io/fs');
var path = require('path');

var SENSOR_PATH = __dirname + '/sensors';

// Returns an array of modules, with the "sensorName" property attached
exports.getAvailableSensors = function() {
    return FS.list(SENSOR_PATH).then(function(fileNames) {
        return fileNames.map(function(fileName) {
            var module = require(SENSOR_PATH + '/' + fileName);
            module.sensorName = path.basename(fileName, '.js');
            return module;
        });
    });
};
