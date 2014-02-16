var path = require('path');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var sloc = require('../../src/sensors/sloc');

var PWD = path.resolve(__dirname + '/../fixture/sloc') + '/';

function assertDeepEqual(actual, expected) {
    try {
        assert.deepEqual(actual, expected);
    } catch (e) {
        console.log('\nactual:\n', actual, '\nexpected:\n', expected);
        throw e;
    }
}

describe('sensors/sloc', function() {

    describe('extendSums', function() {

        it('does basic merge', function() {
            var original = { foo: 1 };
            sloc.__test.extendSums(original, { foo: 100 });
            assertDeepEqual(original, { foo: 101 })
        });

        it('creates new properties as necessary', function() {
            var original = { foo: 1 };
            sloc.__test.extendSums(original, { bar: 100 });
            assertDeepEqual(original, { foo: 1, bar: 100 })
        });

        it('ignores non-numeric properties in source', function() {
            var original = { foo: 1 };
            sloc.__test.extendSums(original, { foo: 'abc', bar: {} });
            assertDeepEqual(original, { foo: 1 })
        });

        it('ignores non-numeric properties in target', function() {
            var original = { foo: 'foo' };
            sloc.__test.extendSums(original, { foo: 123 });
            assertDeepEqual(original, { foo: 'foo' })
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
            assertDeepEqual(actual, expected);
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
            assertDeepEqual(actual, expected);
        });

    });

    describe('listFiles', function() {

        it('expands given globs, allowing symlinks', function() {
            var actual = sloc.__test.listFiles([ PWD + '*.js' ], [], true);
            var expected = [
                PWD + 'bar.js',
                PWD + 'baz.js',
                PWD + 'foo.js',
                PWD + 'symlinked-file-outside.js',
                PWD + 'symlinked-file.js',
                PWD + 'trap.js' // this is a directory, but that's OK
            ];
            assertDeepEqual(actual, expected);
        });

        it('expands given globs, disallowing symlinks', function() {
            var actual = sloc.__test.listFiles([ PWD + '**/*.js' ], []);
            var expected = [
                PWD + 'bar.js',
                PWD + 'baz.js',
                PWD + 'foo.js',
                PWD + 'node_modules/some-module/some-module.js',
                PWD + 'some-other-dependency/node_modules/some-module/some-module.js',
                PWD + 'trap.js'
            ];
            assertDeepEqual(actual, expected);
        });

        it('deduplicates matches', function() {
            var actual = sloc.__test.listFiles([ PWD + 'b*.js', PWD + 'bar.js' ], []);
            var expected = [
                PWD + 'bar.js',
                PWD + 'baz.js'
            ];
            assertDeepEqual(actual, expected);
        });

        it('respects given ignore globs', function() {
            var actual = sloc.__test.listFiles([ PWD + '*.js' ], [ PWD + 'b*.js' ]);
            var expected = [
                PWD + 'foo.js',
                PWD + 'trap.js' // this is a directory, but that's OK
            ];
            assertDeepEqual(actual, expected);
        });

    });

    describe('getCurrentReading', function() {

        it('counts lines and greps correctly', function(done) {
            sloc.getCurrentReading({
                pwd: PWD,
                exclude: '**/.*',
                'Web code': {
                    include: '**/*.{html,js,css}',
                    exclude: '**/node_modules/**/*',
                    TODO: /TODO/
                }
            }).then(function(reading) {
                assertDeepEqual(reading, {
                    'Web code': {
                        files: 1 + 1 + 1,
                        lines: 1 + 2 + 5,
                        TODO:  0 + 0 + 1
                    }
                });
            }).done(done);
        });

    });

});



