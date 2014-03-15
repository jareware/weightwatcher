var path = require('path');
var _ = require('lodash');
var Q = require('q');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var main = require('../../src/main');

var PWD = path.resolve(__dirname + '/../fixture/main');
var SAMPLE_MODULES = [
    { sensorName: 'sloc' },
    { sensorName: 'madeUpSensor' }
];

function diff(actual, expected) {
    console.log('\n--- actual ---\n', actual, '\n--- expected ---\n', expected);
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
            main.getCurrentConfiguration().then(function(actual) {
                var expected = {
                    // This is a top-level config:
                    foobar: 'bazbar',
                    // This sensor has some custom config:
                    sloc: {
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
                // diff(actual, expected);
                assert.deepEqual(actual, expected);
            }).done(done);
        });

        it('defaults to empty config if file not found', function(done) {
            process.chdir('..');
            main.getAvailableSensors = _.constant(Q(SAMPLE_MODULES));
            main.getCurrentConfiguration().then(function(actual) {
                var expected = {
                    sloc: {
                        pwd: path.resolve(PWD + '/..'),
                        exclude: '**/.*'
                    },
                    madeUpSensor: {
                        pwd: path.resolve(PWD + '/..'),
                        exclude: '**/.*'
                    }
                };
                // diff(actual, expected);
                assert.deepEqual(actual, expected);
            }).done(done);
        });

    });

    describe('writeLogEntry', function() {

        it('persists the expected data', function(done) {
            var entries = [];
            main.getPersistenceLayer = _.constant({
                writeLogEntry: function(entryUID, entryData) {
                    entries.push(Array.prototype.slice.call(arguments));
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
            main.writeLogEntry().then(function(returnValue) {
                assert.deepEqual(entries, [[ '12:34:56', { fakeSensor: { count: 123 }}]]);
                assert.deepEqual(returnValue, { fakeSensor: { count: 123 }});
            }).done(done);

        });

    });

});
