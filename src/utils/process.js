var cp = require('child_process');
var Q = require('q');

exports.exec = function(command) {
    var def = Q.defer();
    cp.exec(command, function(error, stdout, stderr) {
        if (error || stderr) {
            def.reject(stderr + '');
        } else {
            def.resolve(stdout + '');
        }
    });
    return def.promise;
};
