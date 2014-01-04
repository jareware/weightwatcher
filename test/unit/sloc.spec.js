var assert = require('assert'); // http://nodejs.org/api/assert.html
var sloc = require('../../src/sensors/sloc');

var FIXTURE_PATH = __dirname + '/../fixture/';

describe('sensors/sloc', function() {

    describe('getCurrentReading', function() {

        it('counts lines and greps correctly', function(done) {
            sloc.getCurrentReading({
                pwd: FIXTURE_PATH + 'demo-workspace-1'
            }).then(function(reading) {
                assert.deepEqual(reading, {
                    all: {
                        files: 1 + 1 + 1,
                        sloc: 1 + 2 + 5,
                        todos: 0 + 0 + 1
                    }
                });
            }).done(done);
        });

        it('supports custom includes', function(done) {
            sloc.getCurrentReading({
                pwd: FIXTURE_PATH + 'demo-workspace-1',
                greps: {},
                includeGlobs: {
                    bees: 'b*.js'
                }
            }).then(function(reading) {
                assert.deepEqual(reading, {
                    bees: {
                        files: 1 + 1,
                        sloc: 1 + 5
                    }
                });
            }).done(done);
        });

    });

});



