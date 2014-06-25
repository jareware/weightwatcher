var path = require('path');
var _ = require('lodash');
var Q = require('q');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var main = require('../../src/main');

var PWD = path.resolve(__dirname + '/../fixture/main');

function assertDeepEqual(actual, expected) {
    try {
        assert.deepEqual(actual, expected);
    } catch (e) {
        console.log('\nactual:\n', actual, '\nexpected:\n', expected);
        throw e;
    }
}

describe('main', function() {

    describe('getCurrentConfiguration', function() {

        var backupPwd;

        beforeEach(function() {
            backupPwd = process.cwd();
            process.chdir(PWD); // switch pwd
        });

        afterEach(function() {
            process.chdir(backupPwd); // restore pwd
        });

        it('loads config and augments with implicit keys', function(done) {
            main.getCurrentConfiguration('test-config-1.js').then(function(actual) {
                assertDeepEqual(actual.global, {
                    // The global parts can be pretty much anything:
                    foobar: 'bazbar'
                });
                assertDeepEqual(actual.sensors.source, {
                    // These are automatically given to all sensor configs:
                    pwd: PWD,
                    exclude: '**/.*',
                    // These are custom config for the sensor:
                    what: 'ever'
                });
            }).done(done);
        });

        it('won\'t go bonkers with an empty config', function(done) {
            main.getCurrentConfiguration('test-config-2.js').then(function(actual) {
                assertDeepEqual(actual.global, {});
                assertDeepEqual(actual.sensors, {});
            }).done(done);
        });

    });

    describe('writeLogEntry', function() {

        it('persists the expected data', function(done) {
            var entries = [];
            main.getPersistenceLayer = _.constant({
                writeLogEntry: function(config, entryUID, entryData) {
                    entries.push([ entryUID, entryData ]);
                }
            });
            main.getAvailableSensors = _.constant(Q([{
                sensorName: 'fakeSensor',
                getCurrentTimestamp: function() {
                    return '12:34:56';
                },
                getCurrentReading: function() {
                    return { count: 123 };
                }
            }]));
            main.writeLogEntry([ 'fakeSensor' ], '.weightwatcher-config.js').then(function(returnValue) {
                assertDeepEqual(entries, [[ '12:34:56', { fakeSensor: { count: 123 }}]]);
                assertDeepEqual(returnValue, { fakeSensor: { count: 123 }});
            }).done(done);

        });

    });

});
