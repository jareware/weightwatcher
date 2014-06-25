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

    // Expose specific internals for unit-testing only:
    __test: {
        // TODO
    }

};

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
exports.getCurrentTimestamp = function(configFilePath) {
    return Q.all([
        exports.getAvailableSensors(),
        exports.getCurrentConfiguration(configFilePath)
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
exports.getCurrentReading = function(sensorName, configFilePath) {
    return Q.all([
        exports.getAvailableSensors(),
        exports.getCurrentConfiguration(configFilePath)
    ]).spread(function(sensorModules, config) {
        var readingProvider = _(sensorModules).where({ sensorName: sensorName }).pluck('getCurrentReading').first();
        return readingProvider ? readingProvider(config[sensorName]) : Q.reject('No such sensor "' + sensorName + '"');
    });
};

// Promises the module currently responsible for persisting log entries
exports.getPersistenceLayer = function() {
    return Q(require('./persistence/json'));
};

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
exports.writeLogEntry = function(sensorNames, configFilePath) {
    return Q.all([
        exports.getCurrentConfiguration(configFilePath),
        exports.getCurrentTimestamp(configFilePath),
        exports.getPersistenceLayer()
    ]).spread(function(config, currentTimestamp, persistenceLayer) {
        var readings = _.map(sensorNames, function(sensorName) {
            return exports.getCurrentReading(sensorName, configFilePath);
        });
        return Q.all([ sensorNames, Q.all(readings) ]).spread(function(names, data) {
            return _(names).zip(data).object().value();
        }).then(function(payload) {
            return Q(persistenceLayer.writeLogEntry(config, currentTimestamp, payload)).then(function() {
                return payload;
            });
        });
    });
};

// Promises to output the HTML viewer application to the given path
exports.outputViewerHTML = function(outputPath, configFilePath) {
    var outputFile = path.join(path.resolve(outputPath), 'weightwatcher.html');
    return Q().then(function() {
        return FS.makeTree(outputPath); // create the destination directories if missing
    }).then(function() {
        return exports.getCurrentConfiguration(configFilePath);
    }).then(function(config) {
        return Q.all([ 'viewer.html', 'viewer.css', 'viewer.js' ].map(function(inputFile) {
            return FS.read(path.join(VIEWER_PATH, inputFile));
        }).concat(FS.read(config.dataFile)));
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
};
