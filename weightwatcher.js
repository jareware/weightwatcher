#!/usr/bin/env node

var program = require('commander');
var _ = require('lodash');
var Q = require('q');
var main = require('./src/main');

program
    .version('0.0.0')
    .option('-l, --list-sensors', 'print out the currently available sensors')
    .option('-i, --read-identity', 'print out the identity that would be used')
    .option('-s, --read-sensor [name]', 'print out the current reading of named sensor')
    .option('-w, --write-entry', 'store the current readings of all sensors to a log entry')
    .parse(process.argv);

function output(input) {
    console.log(input);
}

if (program.listSensors) {

    main.getAvailableSensors().then(_).invoke('pluck', 'sensorName').invoke('each', output).done();

} else if (program.readIdentity) {

    main.getAvailableSensors().then(main.getCurrentIdentity).then(output).done();

} else if (typeof program.readSensor === 'string') {

    Q.all([
        main.getAvailableSensors(),
        program.readSensor,
        main.getCurrentConfiguration(program.readSensor)
    ]).spread(main.getCurrentReading).then(output).done();

} else if (program.writeEntry) {

    main.getAvailableSensors().then(function(sensorModules) {
        return Q.all([
            sensorModules,
            main.getCurrentConfiguration(sensorModules),
            main.getCurrentIdentity(sensorModules),
            main.getPersistenceLayer()
        ]);
    }).spread(main.writeLogEntry).then(output).done();

} else {

    program.help();

}
