var path = require('path');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var git = require('../../src/sensors/git');
var Q = require('q');

function assertDeepEqual(actual, expected) {
    try {
        assert.deepEqual(actual, expected);
    } catch (e) {
        console.log('\nactual:\n', actual, '\nexpected:\n', expected);
        throw e;
    }
}

describe('sensors/git', function() {

    describe('getContributors', function() {

        it('commands git & parses output expectedly', function(done) {
            var actualCommand;
            var expectedCommand = 'cd /dev/null; git log --pretty=format:"%an" --after={2014-03-26} --before={2014-04-01} --all';
            var execImplementation = function(command) {
                actualCommand = command;
                return Q('James Bond\nJames Bond\nErnst Blofeld\nJames Bond\n');
            };
            var promisedResult = git.__test.getContributors({ pwd: '/dev/null' }, '2014-04-01', execImplementation);
            var expectedResult = [ 'Ernst Blofeld', 'James Bond' ];
            promisedResult.then(function(actualResult) {
                assertDeepEqual(actualCommand, expectedCommand)
                assertDeepEqual(actualResult, expectedResult)
                done();
            });
        });

    });

});



