#!/usr/bin/env node

var program = require('commander');
var main = require('./src/main');

program
    .version('0.0.0')
    .option('-l, --list-sensors', 'Print out the currently available sensors')
    .option('-r, --read-sensor [name]', 'Read and print out the current value of named sensor')
    .parse(process.argv);

if (typeof program.readSensor === 'string') {
    console.log('TODO: read: ', program.readSensor);
} else if (program.listSensors) {
    main.getAvailableSensors().then(function(sensorList) {
        sensorList.forEach(function(sensor) {
            console.log(sensor.sensorName);
        });
    }).done();
} else {
    program.help();
}
