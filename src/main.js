var Q = require('q');
var FS = require('q-io/fs');
var path = require('path');

var SENSOR_PATH = __dirname + '/sensors';

// Promises an array of modules, with the "sensorName" property attached
exports.getAvailableSensors = function() {
    return FS.list(SENSOR_PATH).then(function(fileNames) {
        return fileNames.map(function(fileName) {
            var module = require(SENSOR_PATH + '/' + fileName);
            module.sensorName = path.basename(fileName, '.js');
            return module;
        });
    });
};

// Promises the instance of the named sensor module
exports.getNamedSensor = function(name) {
    return exports.getAvailableSensors().then(function(sensorList) {
        return sensorList.filter(function(sensor) {
            return sensor.sensorName === name;
        });
    }).then(function(sensorList) {
        if (sensorList.length === 1) {
            return sensorList[0];
        } else {
            return Q.reject('Unknown sensor name "' + name + '"');
        }
    });
};
