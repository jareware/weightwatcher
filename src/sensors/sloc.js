var _ = require('lodash');
var Q = require('q');
var fs = require('fs');
var path = require('path');
var glob = require('glob');
var minimatch = require('minimatch');

var DEFAULT_CONFIG = {
    pwd: '.',
    sourceGlob: '**/*.{html,js,css}',
    ignoreGlobs: [ 'node_modules/**/*' ],
    greps: {
        todo: /TODO/
    }
};

// Returns an object containing all interesting information regarding given path
function analysePath(config) {
    return glob.sync(path.join(config.pwd, config.sourceGlob)).filter(function(filePath) { // note that this glob will ignore dotfiles
        return !_.some(config.ignoreGlobs, function(ignore) {
            return minimatch(filePath, path.join(config.pwd, ignore), { matchBase: true });
        });
    }).map(function(filePath) {
        return analyseFile(config, filePath);
    }).reduce(function(memo, fileDetails) {
        memo.files++;
        memo.sloc += fileDetails.sloc;
        _.each(fileDetails.greps, function(count, title) {
            memo.greps[title] += count;
        });
        return memo;
    }, {
        files: 0,
        sloc: 0,
        greps: _(config.greps).map(function(needle, title) {
            return [ title, 0 ];
        }).object().value()
    })
}

// Returns an object containing all interesting information regarding given file
function analyseFile(config, filePath) {
    var source = fs.readFileSync(filePath).toString();
    return {
        filename: filePath,
        sloc: source.split('\n').length,
        greps: _(config.greps).map(function(needle, title) {
            return [ title, source.split(needle).length - 1 ]
        }).object().value()
    };
}

// Promises the current value(s) of this sensor
exports.getCurrentReading = function(config) {
    config = _.extend({}, DEFAULT_CONFIG, config);
    config.pwd = path.resolve(config.pwd); // make sure we have an absolute path, so minimatching works as expected
    return Q(analysePath(config));
};
