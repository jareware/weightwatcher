var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var minimatch = require('minimatch');

return module.exports = {

    // MODULE PUBLIC API:
    getCurrentReading: getCurrentReading,

    // Expose specific internals for unit-testing only:
    __test: {
        extendSums: extendSums,
        normalizeConfig: normalizeConfig,
        listFiles: listFiles
    }

};

// Promises the current value(s) of this sensor
function getCurrentReading(sensorConfig) {

    var config = normalizeConfig(sensorConfig);
    var categories = _.omit(config, 'pwd', 'exclude');

    return Q(_.mapValues(categories, function(category) {

        var categoryGreps = _.omit(category, 'include', 'exclude');
        var toAnalyzedFiles = _.partial(analyzeFile, categoryGreps);
        var combinedExcludes = config.exclude.concat(category.exclude);
        var matchingFiles = listFiles(category.include, combinedExcludes);

        return matchingFiles.map(toAnalyzedFiles).reduce(extendSums, {});

    }));

}

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

// Returns a config object with all standard properties filled in, and all paths/globs resolved to absolute ones
function normalizeConfig(config) {

    function expandPath(pathSpec) {
        if (_.isString(pathSpec)) {
            return expandPath([ pathSpec ]);
        } else if (_.isArray(pathSpec)) {
            return _.map(pathSpec, function(glob) {
                return path.join(path.resolve(config.pwd), glob);
            });
        } else {
            return [];
        }
    }

    var standardFields = {
        pwd: path.resolve(config.pwd),
        exclude: expandPath(config.exclude)
    };

    var categoryFields = _(config).omit('pwd', 'exclude').mapValues(function(category) {
        if (_.isString(category)) {
            return {
                include: expandPath(category),
                exclude: []
            };
        } else {
            var standardFields = _(category).pick('include', 'exclude').defaults({ exclude: [] }).mapValues(expandPath).value();
            return _.extend(category, standardFields);
        }
    }).value();

    return _.extend(categoryFields, standardFields);

}

// Returns a list of file paths that match the given includeGlobs, excluding ones that match one or more given excludeGlobs
function listFiles(includeGlobs, excludeGlobs, allowSymlinks) {
    return _(includeGlobs).map(function(includeGlob) {
        return glob.sync(includeGlob);
    }).flatten().filter(function(filePath) {
        try {
            return allowSymlinks || fs.realpathSync(filePath) === filePath;
        } catch (e) {
            return false; // happens when fs.realpathSync() attempts to stat a broken symlink -> ignore
        }
    }).unique().filter(function(filePath) {
        return !_.some(excludeGlobs, function(excludeGlob) {
            return minimatch(filePath, excludeGlob);
        });
    }).value();
}

// Returns an object containing all interesting information regarding given file
function analyzeFile(greps, filePath) {
    try {
        var source = fs.readFileSync(filePath).toString();
        var standardProps = {
            files: 1,
            lines: source.split('\n').length
        };
        var grepProps = _.mapValues(greps, function(needle) {
            return source.split(needle).length - 1;
        });
        return _.extend(standardProps, grepProps);
    } catch (e) { // filePath probably wasn't a file at all -> contribute nothing
        return {};
    }
}
