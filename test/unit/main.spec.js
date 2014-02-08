var path = require('path');
var _ = require('lodash');
var Q = require('q');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var main = require('../../src/main');

var WORKSPACE_PATH = __dirname + '/../fixture/demo-workspace-config';
var SAMPLE_MODULES = [
    { sensorName: 'sloc' },
    { sensorName: 'madeUpSensor' }
];

describe('main', function() {

    describe('getCurrentConfiguration', function() {

        var backupModule;
        var backupPwd;

        beforeEach(function() {
            backupModule = _.clone(main);
            backupPwd = process.cwd();
            process.chdir(WORKSPACE_PATH); // switch pwd
        });

        afterEach(function() {
            _.extend(main, backupModule); // revert possible mocks
            process.chdir(backupPwd); // restore pwd
        });

        it('loads config and augments with implicit "pwd" key', function(done) {
            main.getAvailableSensors = _.constant(Q(SAMPLE_MODULES));
            main.getCurrentConfiguration().then(function(config) {
                assert.deepEqual(config, {
                    foobar: 'bazbar',
                    sloc: {
                        pwd: path.resolve(WORKSPACE_PATH), // this is automatically given to all sensor configs
                        includeGlobs: 'bla'
                    },
                    madeUpSensor: {
                        pwd: path.resolve(WORKSPACE_PATH) // this is automatically given to all sensor configs
                    }
                });
            }).done(done);
        });

        it('defaults to empty config if file not found', function(done) {
            process.chdir('..');
            main.getAvailableSensors = _.constant(Q(SAMPLE_MODULES));
            main.getCurrentConfiguration().then(function(config) {
                assert.deepEqual(config, {
                    sloc: {
                        pwd: path.resolve(WORKSPACE_PATH + '/..') // this is automatically given to all sensor configs
                    },
                    madeUpSensor: {
                        pwd: path.resolve(WORKSPACE_PATH + '/..') // this is automatically given to all sensor configs
                    }
                });
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
                getCurrentIdentity: function() {
                    return 'id#1';
                },
                getCurrentReading: function() {
                    return { count: 123 };
                }
            }]));
            main.writeLogEntry().then(function(returnValue) {
                assert.deepEqual(entries, [[ 'id#1', { fakeSensor: { count: 123 }}]]);
                assert.deepEqual(returnValue, { fakeSensor: { count: 123 }});
            }).done(done);

        });

    });

});
