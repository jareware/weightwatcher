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
exports.getCurrentIdentity = function(sensorModules) {
    var idProvider = _(sensorModules).pluck('getCurrentIdentity').compact().first();
    return idProvider ? idProvider() : Q.reject('No identity-providing sensors available (that\'s odd)');
};

// Promises the current reading of the named sensor (the given sensorConfig is passed along)
exports.getCurrentReading = function(sensorModules, sensorName, sensorConfig) {
    var readingProvider = _(sensorModules).where({ sensorName: sensorName }).pluck('getCurrentReading').first();
    return readingProvider ? readingProvider(sensorConfig[sensorName]) : Q.reject('No such sensor "' + sensorName + '"');
};

// Promises the module currently responsible for persisting log entries
exports.getPersistenceLayer = function() {
    return Q(require('./persistence/json'));
};

// Promises the global configuration object, prepared to contain config for given modules
exports.getCurrentConfiguration = function(sensorModules) {
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
};

// Promises to write the current readings of all applicable sensors to a log entry
exports.writeLogEntry = function(sensorModules, sensorConfig, currentIdentity, persistenceLayer) {
    return Q.all(sensorModules.map(function(sensorModule) {
        return sensorModule.getCurrentReading(sensorConfig[sensorModule.sensorName]);
    })).then(function(data) {
        return _(sensorModules).pluck('sensorName').zip(data).object().value();
    }).then(function(payload) {
        return Q(persistenceLayer.writeLogEntry(currentIdentity, payload)).then(function() {
            return payload;
        });
    });
};
