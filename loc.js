var fs = require('fs');
var glob = require('glob');
var minimatch = require('minimatch');

var PATH = './';

var fileCache = {};
var config = {
    javascript: {
        all: PATH + '{app/scripts,test/unit}/**/*.js',
        views: PATH + 'app/scripts/views/**/*.js',
        tests: PATH + 'test/unit/**/*.js'
    }
};

console.log(getJSMetrics(config.javascript));

function getJSMetrics(config) {
    return Object.keys(config).map(function(category) {
        return {
            category: category,
            metrics: analysePath(config[category])
        };
    });
}

function analysePath(sourceGlob) {
    return glob.sync(sourceGlob).map(analyseFile).reduce(function(memo, fileDetails) {
        memo.files++;
        memo.sloc += fileDetails.sloc;
        return memo;
    }, {
        files: 0,
        sloc: 0
    })
}

function analyseFile(filePath) {
    return fileCache[filePath] || (fileCache[filePath] = {
        filename: filePath,
        sloc: fs.readFileSync(filePath).toString().split('\n').length
    });
}
