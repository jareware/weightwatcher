var path = require('path');
var _ = require('lodash');
var Q = require('q');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var main = require('../../src/main');

var PWD = path.resolve(__dirname + '/../fixture/main');
var SAMPLE_MODULES = [
    { sensorName: 'source' },
    { sensorName: 'madeUpSensor' }
];

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

        var backupModule;
        var backupPwd;

        beforeEach(function() {
            backupModule = _.clone(main);
            backupPwd = process.cwd();
            process.chdir(PWD); // switch pwd
        });

        afterEach(function() {
            _.extend(main, backupModule); // revert possible mocks
            process.chdir(backupPwd); // restore pwd
        });

        it('loads config and augments with implicit keys', function(done) {
            main.getAvailableSensors = _.constant(Q(SAMPLE_MODULES));
            main.getCurrentConfiguration('weightwatcher-config.js').then(function(actual) {
                var expected = {
                    // This is a top-level config:
                    foobar: 'bazbar',
                    // This sensor has some custom config:
                    source: {
                        // These are automatically given to all sensor configs:
                        pwd: PWD,
                        exclude: '**/.*',
                        // These are custom config for the sensor:
                        what: 'ever'
                    },
                    // This sensor doesn't have any config so it just gets the defaults:
                    madeUpSensor: {
                        // These are automatically given to all sensor configs:
                        pwd: PWD,
                        exclude: '**/.*'
                    }
                };
                assertDeepEqual(actual, expected);
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
