var GIT_LOG = 'git log -1 --pretty=format:"%H %ad" --date=iso';

var Q = require('q');
var exec = require('./../utils/process').exec;

exports.entryIdentityProvider = function() {
    return exec(GIT_LOG).then(function(stdout) {
        var match = stdout.match(/^(\w+) (.*)$/);
        if (match) {
            return match[1]
        } else {
            return Q.reject('Unparseable git output: ' + stdout);
        }
    });
};
