var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var minimatch = require('minimatch');

var DEFAULT_CONFIG = {
    pwd: '.',
    includeGlobs: {
        all: '**/*.{html,js,css}'
    },
    excludeGlobs: [
        'node_modules/**/*'
    ],
    greps: {
        todos: /TODO/
    }
};

// Modifies (IN-PLACE!) the first given object by incrementing its counters based on the second given object
function extendSums(intoObject, fromObject) {
    _.each(fromObject, function(value, key) {
        if (_.isNumber(value)) {
            if (!_.has(intoObject, key)) {
                intoObject[key] = 0;
            } else if (!_.isNumber(intoObject[key])) {
                return;
            }
            intoObject[key] += value;
        }
    });
    return intoObject;
}

// Returns an updated version of the given config, with the "pwd" applied to all paths, and paths resolved
function resolveConfigPaths(config) {
    var prefix = function(glob) {
        return path.join(path.resolve(config.pwd), glob);
    };
    return _.extend({}, config, {
        pwd: prefix('.'),
        includeGlobs: _.mapValues(config.includeGlobs, prefix),
        excludeGlobs: _.map(config.excludeGlobs, prefix)
    });
}

// Returns a list of file paths that match the given includeGlob, excluding ones that match one or more given excludeGlobs
function listFiles(includeGlob, excludeGlobs) {
    return glob.sync(includeGlob).filter(function(filePath) {
        return !_.some(excludeGlobs, function(excludeGlob) {
            return minimatch(filePath, excludeGlob, { matchBase: true });
        });
    })
}

// Returns an object containing all interesting information regarding given path
function analyzeFiles(config, includeGlob) {
    var toAnalyzedFiles = _.partial(analyzeFile, config);
    var fileList = listFiles(includeGlob, config.excludeGlobs);
    return fileList.map(toAnalyzedFiles).reduce(extendSums, {})
}

// Returns an object containing all interesting information regarding given file
function analyzeFile(config, filePath) {
    try {
        var source = fs.readFileSync(filePath).toString();
        var standardProps = {
            files: 1,
            sloc: source.split('\n').length
        };
        var grepProps = _.mapValues(config.greps, function(needle) {
            return source.split(needle).length - 1;
        });
        return _.extend(standardProps, grepProps);
    } catch (e) { // filePath probably wasn't a file at all -> contribute nothing
        return {};
    }
}

// Promises the current value(s) of this sensor
exports.getCurrentReading = function(config) {
    config = resolveConfigPaths(_.extend({}, DEFAULT_CONFIG, config));
    var toResults = _.partial(analyzeFiles, config);
    return Q(_.mapValues(config.includeGlobs, toResults));
};

// Export specific internals for unit-testing only
exports.__test = {
    extendSums: extendSums,
    resolveConfigPaths: resolveConfigPaths
}
