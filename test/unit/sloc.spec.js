var assert = require('assert'); // http://nodejs.org/api/assert.html
var sloc = require('../../src/sensors/sloc');

var WORKSPACE_PATH = __dirname + '/../fixture/demo-workspace-sloc';

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

    describe('normalizeConfig', function() {

        it('resolves paths and globs with the pwd', function() {
            var input = {
                pwd: '/dev/../dev/null',
                exclude: [ 'node_modules/**/*' ],
                'Web code': {
                    include: [ '**/*.{html,js,css}' ],
                    exclude: [ 'ignored.js' ],
                    'Some random grep': /grep/
                }
            };
            var actual = sloc.__test.normalizeConfig(input);
            var expected = {
                pwd: '/dev/null',
                exclude: [ '/dev/null/node_modules/**/*' ],
                'Web code': {
                    include: [ '/dev/null/**/*.{html,js,css}' ],
                    exclude: [ '/dev/null/ignored.js' ],
                    'Some random grep': /grep/
                }
            };
            assert.deepEqual(actual, expected);
        });

        it('supports shorthands for inclusions and omitting properties', function() {
            var input = {
                pwd: '/',
                'JS': '*.js',
                'HTML': {
                    include: '*.html'
                }
            };
            var actual = sloc.__test.normalizeConfig(input);
            var expected = {
                pwd: '/',
                exclude: [],
                'JS': {
                    include: [ '/*.js' ],
                    exclude: []
                },
                'HTML': {
                    include: [ '/*.html' ],
                    exclude: []
                }
            };
            assert.deepEqual(actual, expected);
        });

    });

    xdescribe('getCurrentReading', function() {

        it('counts lines and greps correctly', function(done) {
            sloc.getCurrentReading({
                pwd: WORKSPACE_PATH
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
                pwd: WORKSPACE_PATH,
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



