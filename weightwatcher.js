#!/usr/bin/env node

var program = require('commander');
var main = require('./src/main');

program
    .version('0.0.0')
    .option('-l, --list-sensors', 'Print out the currently available sensors')
    .option('-r, --read-sensor [name]', 'Read and print out the current value of named sensor')
    .parse(process.argv);

if (typeof program.readSensor === 'string') {
    main.getNamedSensor(program.readSensor).then(function(sensor) {
        return sensor.getCurrentReading();
    }).then(function(reading) {
        console.log(reading);
    }).done();
} else if (program.listSensors) {
    main.getAvailableSensors().then(function(sensorList) {
        sensorList.forEach(function(sensor) {
            console.log(sensor.sensorName);
        });
    }).done();
} else {
    program.help();
}
