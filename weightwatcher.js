#!/usr/bin/env node

var program = require('commander');
var main = require('./src/main');

program
    .version('0.0.0')
    .option('-l, --list-sensors', 'Print out the currently available sensors')
    .option('-i, --read-identity', 'Print out the identity that would be used')
    .option('-s, --read-sensor [name]', 'Read and print out the current value of named sensor')
    .parse(process.argv);

function output(input) {
    console.log(input);
}

if (typeof program.readSensor === 'string') {
    main
        .getNamedSensor(program.readSensor)
        .invoke('getCurrentReading')
        .then(output)
        .done();
} else if (program.readIdentity) {
    main
        .getCurrentIdentity()
        .then(output)
        .done();
} else if (program.listSensors) {
    main
        .getAvailableSensors()
        .then(function(sensorList) {
            sensorList.forEach(function(sensor) {
                output(sensor.sensorName);
            });
        }).done();
} else {
    program.help();
}
