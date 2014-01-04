var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var minimatch = require('minimatch');

var DEFAULT_CONFIG = {
    pwd: '.',
    includeGlobs: {
        main: '**/*.{html,js,css}'
    },
    excludeGlobs: [ 'node_modules/**/*' ],
    greps: {
        todos: /TODO/
    }
};

// Returns an object containing all interesting information regarding given path
function analysePath(config, includeGlob) {
    return glob.sync(path.join(config.pwd, includeGlob)).filter(function(filePath) { // note that this glob will ignore dotfiles
        return !_.some(config.excludeGlobs, function(ignore) {
            return minimatch(filePath, path.join(config.pwd, ignore), { matchBase: true });
        });
    }).map(function(filePath) {
        return analyseFile(config, filePath);
    }).reduce(function(memo, fileDetails) {
        memo.files += fileDetails.files;
        memo.sloc += fileDetails.sloc;
        _.each(fileDetails.greps, function(count, label) {
            memo[label] += count;
        });
        return memo;
    }, _.extend({
        files: 0,
        sloc: 0
    }, _(config.greps).map(function(x, label) {
        return [ label, 0 ];
    }).object().value()))
}

// Returns an object containing all interesting information regarding given file
function analyseFile(config, filePath) {
    try {
        var source = fs.readFileSync(filePath).toString();
        return {
            filename: filePath,
            files: 1,
            sloc: source.split('\n').length,
            greps: _(config.greps).map(function(needle, label) {
                return [ label, source.split(needle).length - 1 ]
            }).object().value()
        };
    } catch (e) {
        return {
            filename: filePath,
            files: 0,
            sloc: 0,
            greps: {}
        };
    }
}

// Promises the current value(s) of this sensor
exports.getCurrentReading = function(config) {
    config = _.extend({}, DEFAULT_CONFIG, config);
    config.pwd = path.resolve(config.pwd); // make sure we have an absolute path, so minimatching works as expected
    var obj = {};
    _(config.includeGlobs).each(function(includeGlob, label) {
        obj[label] = analysePath(config, includeGlob);
    });
    return Q(obj);
};
