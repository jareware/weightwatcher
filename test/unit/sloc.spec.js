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
                    files: 2,
                    sloc: 3,
                    greps: {
                        todo: 1
                    }
                });
            }).done(done);
        });

    });

});



