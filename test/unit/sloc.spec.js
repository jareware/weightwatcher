var assert = require('assert'); // http://nodejs.org/api/assert.html
var sloc = require('../../src/sensors/sloc');

var FIXTURE_PATH = __dirname + '/../fixture/';

describe('sensors/sloc', function() {

    describe('extendSums', function() {

        it('does basic merge', function() {
            var original = { foo: 1 };
            sloc.__test.extendSums(original, { foo: 100 });
            assert.deepEqual(original, { foo: 101 })
        });

        it('creates new properties as necessary', function() {
            var original = { foo: 1 };
            sloc.__test.extendSums(original, { bar: 100 });
            assert.deepEqual(original, { foo: 1, bar: 100 })
        });

        it('ignores non-numeric properties in source', function() {
            var original = { foo: 1 };
            sloc.__test.extendSums(original, { foo: 'abc', bar: {} });
            assert.deepEqual(original, { foo: 1 })
        });

        it('ignores non-numeric properties in target', function() {
            var original = { foo: 'foo' };
            sloc.__test.extendSums(original, { foo: 123 });
            assert.deepEqual(original, { foo: 'foo' })
        });

    });

    describe('resolveConfigPaths', function() {

        it('produces expected paths', function() {
            var newConfig = sloc.__test.resolveConfigPaths({
                pwd: '/dev/../dev/null',
                includeGlobs: {
                    all: '**/*.{html,js,css}'
                },
                excludeGlobs: [
                    'node_modules/**/*'
                ]
            });
            assert.deepEqual(newConfig, {
                pwd: '/dev/null',
                includeGlobs: {
                    all: '/dev/null/**/*.{html,js,css}'
                },
                excludeGlobs: [
                    '/dev/null/node_modules/**/*'
                ]
            })
        });

    });

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



