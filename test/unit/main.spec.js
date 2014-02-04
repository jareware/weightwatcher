var path = require('path');
var assert = require('assert'); // http://nodejs.org/api/assert.html
var main = require('../../src/main');

var WORKSPACE_PATH = __dirname + '/../fixture/demo-workspace-config';
var SAMPLE_MODULES = [
    { sensorName: 'sloc' },
    { sensorName: 'madeUpSensor' }
];

describe('main', function() {

    describe('getCurrentConfiguration', function() {

        var pwd;

        beforeEach(function() {
            pwd = process.cwd();
            process.chdir(WORKSPACE_PATH); // switch pwd
        });

        afterEach(function() {
            process.chdir(pwd); // restore pwd
        });

        it('loads config and augments with implicit "pwd" key', function(done) {
            main.getCurrentConfiguration(SAMPLE_MODULES).then(function(config) {
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
            main.getCurrentConfiguration(SAMPLE_MODULES).then(function(config) {
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

});
