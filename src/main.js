var _ = require('lodash');
var Q = require('q');
var FS = require('q-io/fs');
var path = require('path');

var SENSOR_PATH = __dirname + '/sensors';

// Promises an array of modules, with the "sensorName" property attached
// TODO: Priority ordering..?
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

// Promises the currently applicable identity for a new log entry being written
exports.getCurrentIdentity = function() {
    return exports.getAvailableSensors().then(function(sensorList) {
        return sensorList.filter(function(sensor) {
            return !!sensor.getCurrentIdentity;
        });
    }).then(function(applicableSensorList) {
        if (applicableSensorList.length) {
            return applicableSensorList[0].getCurrentIdentity();
        } else {
            return Q.reject('No identity-providing sensors available (that\'s odd)');
        }
    });
};

// Promises the module currently responsible for persisting log entries
function getPersistenceLayer() {
    return Q(require('./persistence/json'));
}

// Promises to write the current readings of all applicable sensors to a log entry
// TODO: Serialize requests for currentReadings..?
exports.writeLogEntry = function() {
    var sensors = exports.getAvailableSensors();
    var names = sensors.then(_).invoke('pluck', 'sensorName').invoke('value');
    var readings = sensors.then(_).invoke('invoke', 'getCurrentReading').invoke('value').then(Q.all);
    var entryData = Q.all([ names, readings ]).spread(function(names, readings) {
        return _(names).zip(readings).object().value();
    });
    return Q.all([ getPersistenceLayer(), exports.getCurrentIdentity(), entryData ])
        .spread(function(persistenceLayer, entryUID, entryData) {
            return persistenceLayer.writeLogEntry(entryUID, entryData);
        });
};
