var _ = require('lodash');
var Q = require('q');
var FS = require('q-io/fs');
var path = require('path');

var SENSOR_PATH = __dirname + '/sensors';

// Promises an array of modules, with the "sensorName" property attached
exports.getAvailableSensors = function() {
    return FS.list(SENSOR_PATH).then(function(fileNames) {
        return fileNames.map(function(fileName) {
            var module = require(path.join(SENSOR_PATH, fileName));
            module.sensorName = path.basename(fileName, '.js');
            return module;
        });
    });
};

// Promises the currently applicable identity for a new log entry being written
exports.getCurrentIdentity = function() {
    return exports.getAvailableSensors().then(function(sensorModules) {
        var idProvider = _(sensorModules).pluck('getCurrentIdentity').compact().first();
        return idProvider ? idProvider() : Q.reject('No identity-providing sensors available (that\'s odd)');
    });

};

// Promises the current reading of the named sensor
exports.getCurrentReading = function(sensorName) {
    return Q.all([
        exports.getAvailableSensors(),
        exports.getCurrentConfiguration()
    ]).spread(function(sensorModules, config) {
        var readingProvider = _(sensorModules).where({ sensorName: sensorName }).pluck('getCurrentReading').first();
        return readingProvider ? readingProvider(config[sensorName]) : Q.reject('No such sensor "' + sensorName + '"');
    });
};

// Promises the module currently responsible for persisting log entries
exports.getPersistenceLayer = function() {
    return Q(require('./persistence/json'));
};

// Promises the resolved global configuration object, with sensor config under keys named after them
exports.getCurrentConfiguration = function() {
    return Q.all([
        exports.getAvailableSensors()
    ]).spread(function(sensorModules) {
        var configFile = path.resolve('./weightwatcher-config.js');
        return FS.isFile(configFile).then(function(isFile) {
            return isFile ? require(configFile) : {};
        }).then(function(config) {
            _(sensorModules).pluck('sensorName').each(function(sensorName) {
                config[sensorName] = config[sensorName] || {};
                _.extend(config[sensorName], {
                    pwd: path.resolve('.') // augment the config with implicit values
                });
            });
            return config;
        });
    });
};

// Promises to write the current readings of all applicable sensors to a log entry
exports.writeLogEntry = function() {
    return Q.all([
        exports.getAvailableSensors(),
        exports.getCurrentConfiguration(),
        exports.getCurrentIdentity(),
        exports.getPersistenceLayer()
    ]).spread(function(sensorModules, sensorConfig, currentIdentity, persistenceLayer) {
        var names = _.pluck(sensorModules, 'sensorName');
        var readings = _.map(names, exports.getCurrentReading);
        return Q.all([ names, Q.all(readings) ]).spread(function(names, data) {
            return _(names).zip(data).object().value();
        }).then(function(payload) {
            return Q(persistenceLayer.writeLogEntry(currentIdentity, payload)).then(function() {
                return payload;
            });
        });
    });
};
