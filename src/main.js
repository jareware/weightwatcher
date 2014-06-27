var _ = require('lodash');
var Q = require('q');
var FS = require('q-io/fs');
var path = require('path');

var SENSOR_PATH = __dirname + '/sensors';
var VIEWER_PATH = __dirname + '/viewer';
var DEFAULT_GLOBAL_EXCLUDES = '**/.*';

return module.exports = {

    // MODULE PUBLIC API:
    getCurrentConfiguration: getCurrentConfiguration,
    getCurrentReading: getCurrentReading,
    writeLogEntry: writeLogEntry,
    outputViewerHTML: outputViewerHTML

};

// Promises the current timestamp for a new log entry being written
function getCurrentTimestamp(config) {
    var sensorNames = _.keys(config.sensors);
    var sensorModules = _.map(sensorNames, loadSensorModule);
    return Q.all(sensorModules).then(function(sensorModules) {
        return _(sensorNames).zipObject(sensorModules).map(function(sensorModule, sensorName) {
            if (sensorModule.getCurrentTimestamp) {
                return _.partial(sensorModule.getCurrentTimestamp, config.sensors[sensorName]);
            }
        }).compact().first();
    }).then(function(provider) {
        return provider ? provider() : Q.reject('No timestamp-providing sensors configured (consider configuring at least the "git" sensor)');
    });
}

// Promises to load the implementation for the named sensor module
function loadSensorModule(sensorName) {
    var candidate = path.join(SENSOR_PATH, sensorName + '.js');
    return FS.isFile(candidate).then(function(isFile) {
        return isFile ? require(candidate) : Q.reject('Sensor module file "' + candidate + '" not found');
    });
}

// Promises the current reading of the named sensor
function getCurrentReading(config, sensorName) {
    if (!_.isObject(config.sensors[sensorName])) {
        return Q.reject('Sensor "' + sensorName + '" has not been configured');
    }
    return loadSensorModule(sensorName).then(function(sensorModule) {
        if (!_.isFunction(sensorModule.getCurrentReading)) {
            return Q.reject('Sensor "' + sensorName + '" does not implement the getCurrentReading method');
        }
        return sensorModule.getCurrentReading(config.sensors[sensorName]);
    });
}

// Promises the module currently responsible for persisting log entries
function getPersistenceLayer() {
    return Q(require('./persistence/json'));
}

// Promises the resolved global configuration object
function getCurrentConfiguration(configFilePath) {
    if (!configFilePath) {
        return Q.reject('No config file path specified for reading configuration');
    }
    var configFile = path.resolve(configFilePath);
    return FS.isFile(configFile).then(function(isFile) {
        return isFile ? require(configFile) : Q.reject('Configuration file "' + configFilePath + '" unreadable');
    }).then(function(config) {
        if (!_.isObject(config)) {
            return Q.reject('No config object in file "' + configFilePath + '"');
        }
        var defaultConfig = { global: {}, sensors: {} };
        var extendedSensorConfig = _(config.sensors).map(function(sensorConfig, sensorName) {
            return [ sensorName, _.extend(sensorConfig, {
                // Augment each sensor's config with the implicit values:
                pwd: path.resolve('.'),
                exclude: DEFAULT_GLOBAL_EXCLUDES
            }) ];
        }).object().value();
        return _.extend(defaultConfig, config, { sensors: extendedSensorConfig });
    });
}

// Promises to write the current readings of all named sensors to a log entry
function writeLogEntry(config, sensorNames) {
    var currentReadings = _.map(sensorNames, _.partial(getCurrentReading, config));
    return Q.all([
        getCurrentTimestamp(config),
        getPersistenceLayer(),
        Q.all(currentReadings)
    ]).spread(function(currentTimestamp, persistenceLayer, readings) {
        var entryData = _.zipObject(sensorNames, readings);
        return persistenceLayer.writeLogEntry(config, currentTimestamp, entryData).then(function() {
            return entryData;
        });
    });
}

// Promises to output the HTML viewer application to the given path
function outputViewerHTML(config, outputPath) {
    if (!config.global.dataFile) {
        return Q.reject('No data file configured (config.global.dataFile should point to one)');
    }
    var outputFile = path.join(path.resolve(outputPath), 'weightwatcher.html');
    return FS.makeTree(outputPath).then(function() { // create the destination directories if missing
        return Q.all([ 'viewer.html', 'viewer.css', 'viewer.js' ].map(function(inputFile) {
            return FS.read(path.join(VIEWER_PATH, inputFile));
        }).concat(FS.read(config.global.dataFile)));
    }).spread(function(htmlContent, cssContent, jsContent, dataContent) {
        var inlinedSources = {
            'WEIGHTWATCHER_DATA = undefined':               'WEIGHTWATCHER_DATA = ' + dataContent,
            '<link href="viewer.css" rel="stylesheet" />':  '<style>\n' + cssContent + '</style>',
            '<script src="viewer.js"></script>':            '<script>\n' + jsContent + '</script>'
        };
        _.each(inlinedSources, function(replace, search) {
            htmlContent = htmlContent.replace(search, replace);
        });
        return FS.write(outputFile, htmlContent);
    }).then(function() {
        return outputFile;
    });
}
