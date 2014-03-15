var cp = require('child_process');
var Q = require('q');

return module.exports = {

    // MODULE PUBLIC API:
    exec: exec

};

// Promises shell output for given command, rejecting on either non-zero exit code or any stderr-output
function exec(command) {
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
