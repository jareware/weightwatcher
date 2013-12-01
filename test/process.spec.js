var assert = require('assert'); // http://nodejs.org/api/assert.html

var process = require('../src/utils/process');

describe('utils/process', function() {

    describe('exec', function() {

        it('resolves with stdout on success', function(done) {
            process.exec('echo hello').then(function(stdout) {
                assert.strictEqual(stdout, 'hello\n');
            }).done(done);
        });

        it('rejects if something in stderr (regardless of exit value)', function(done) {
            process.exec('echo fail 1>&2').then(undefined, function(stderr) {
                assert.strictEqual(stderr, 'fail\n');
            }).done(done);
        });

        it('rejects if non-zero exit value (regardless of stderr)', function(done) {
            process.exec('mv nonexistantfile 2>&1').then(undefined, function(stderr) {
                assert.strictEqual(stderr, '');
            }).done(done);
        });

        it('rejects with stderr on failure', function(done) {
            process.exec('mv nonexistantfile').then(undefined, function(stderr) {
                assert.strictEqual(!!stderr.match(/^usage: mv/), true);
            }).done(done);
        });

    });

});



