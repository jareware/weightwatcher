var _ = require('lodash');
var Q = require('q');
var FS = require('q-io/fs');
var path = require('path');

var SENSOR_PATH = __dirname + '/sensors';
var VIEWER_PATH = __dirname + '/viewer';
var DEFAULT_GLOBAL_EXCLUDES = '**/.*';
var DATA_FILE = 'weightwatcher-data.json';

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

// Promises the current timestamp for a new log entry being written
exports.getCurrentTimestamp = function() {
    return Q.all([
        exports.getAvailableSensors(),
        exports.getCurrentConfiguration()
    ]).spread(function(sensorModules, config) {
        var tsProvider = _(sensorModules).filter(function(sensorModule) {
            return !!sensorModule.getCurrentTimestamp;
        }).first();
        if (tsProvider) {
            return tsProvider.getCurrentTimestamp(config[tsProvider.sensorName]);
        } else {
            return Q.reject('No timestamp-providing sensors available (that\'s odd)');
        }
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
                    // Augment each sensor's config with the implicit values:
                    pwd: path.resolve('.'),
                    exclude: DEFAULT_GLOBAL_EXCLUDES
                });
            });
            return config;
        });
    });
};

// Promises to write the current readings of all named sensors to a log entry
exports.writeLogEntry = function(sensorNames) {
    return Q.all([
        exports.getCurrentConfiguration(),
        exports.getCurrentTimestamp(),
        exports.getPersistenceLayer()
    ]).spread(function(sensorConfig, currentTimestamp, persistenceLayer) {
        var readings = _.map(sensorNames, exports.getCurrentReading);
        return Q.all([ sensorNames, Q.all(readings) ]).spread(function(names, data) {
            return _(names).zip(data).object().value();
        }).then(function(payload) {
            return Q(persistenceLayer.writeLogEntry(currentTimestamp, payload)).then(function() {
                return payload;
            });
        });
    });
};

// Promises to output the HTML viewer application to the given path
exports.outputViewerHTML = function(outputPath) {
    return FS.makeTree(outputPath).then(function() {
        return FS.list(VIEWER_PATH).then(function(files) {
            return Q.all(files.map(function(file) {
                return FS.copy(path.join(VIEWER_PATH, file), path.join(outputPath, file));
            }));
        });
    }).then(function() {
        return FS.copy(DATA_FILE, path.join(outputPath, DATA_FILE));
    }).then(function() {
        return path.join(path.resolve(outputPath), 'index.html');
    });
};
