(function() { "use strict";

    var gitData;

//    $.getJSON('.weightwatcher-data.json', init);

    init(WEIGHTWATCHER_DATA);

    return; // only function defs beyond this

    function init(rawData) {
        gitData = getGitData(rawData);
        renderChart(combineSeries(rawData));
    }

    function combineSeries(rawData) {
        var gitSeries = getGitSeries(rawData);
        var slocSeries = getSLOCSeries(rawData);
        var combinedSeries = gitSeries.concat(slocSeries);
        combinedSeries.forEach(function(currentSeries) {
            currentSeries.data.sort(function(a, b) {
                return a[0] - b[0]; // sort by timestamps
            });
        });
        return combinedSeries;
    }

    function getGitData(rawData) {
        var gitData = {};
        Object.keys(rawData).forEach(function(identity) {
            var entry = rawData[identity];
            gitData[parseDate(identity).getTime()] = entry.git.hash;
        });
        return gitData;
    }

    // @see http://stackoverflow.com/questions/2587345/javascript-date-parse
    // @example "2013-01-07 17:34:24 +0200" => Date object
    function parseDate(dateTimeString) {
        return new Date(dateTimeString.replace(' ', 'T').replace(' ', ''));
    }

    function getGitSeries(rawData) {
        var data = [];
        Object.keys(rawData).forEach(function(identity) {
            var entry = rawData[identity];
            if (!entry.git) {
                return;
            }
            data.push([ parseDate(identity).getTime(), entry.git.contributors.length ]);
        });
        return [{
            data: data,
            name: 'Contributors',
            type: 'line'
        }];
    }

    function getSLOCSeries(rawData) {
        var seriesMap = {};
        Object.keys(rawData).forEach(function(identity) {
            var entry = rawData[identity];
            if (!entry.source) {
                return;
            }
            Object.keys(entry.source).forEach(function(category) { // e.g. "Web code"
                Object.keys(entry.source[category]).forEach(function(metric) { // e.g. "files"
                    var key = category + ': ' + metric;
                    if (!seriesMap[key]) {
                        seriesMap[key] = [];
                    }
                    seriesMap[key].push([ parseDate(identity).getTime(), entry.source[category][metric] ]);
                });
            });
        });
        return Object.keys(seriesMap).map(function(key) {
            return {
                type: 'line',
                name: key,
                data: seriesMap[key]
            };
        });
    }

    function showDetailsAt(timestamp) {
        var selectedCommit = gitData[timestamp];
        var prevTimestamp = Object.keys(gitData).map(function(ts) { return window.parseInt(ts, 10); }).filter(function(ts) { return ts < timestamp; }).sort().reverse()[0];
        var prevCommit = gitData[prevTimestamp];
        var commitRange = prevCommit + '..' + selectedCommit;
        var logFormatOpts = '--pretty=format:"%h (%ad) %an: %s" --date=iso';
        $('#details').text(
            '$ git diff --stat ' + commitRange + '\n' +
                '$ git log ' + logFormatOpts + ' --ancestry-path ' + commitRange + '\n' +
                '$ git log ' + logFormatOpts + ' --merges ' + commitRange + '\n' +
                '$ git log ' + logFormatOpts + ' --no-merges ' + commitRange + '\n' +
                '$ gitk ' + commitRange + '\n' +
                ''
        );
    }

    function renderChart(series) {

        var focusedX;

        $('#chart').highcharts({
            chart: {
                zoomType: 'xy',
                spacingRight: 20
            },
            title: {
                text: 'Weightwatcher'
            },
            subtitle: {
                text: document.ontouchstart === undefined ?
                    'Click and drag in the plot area to zoom in' :
                    'Pinch the chart to zoom in'
            },
            xAxis: {
                type: 'datetime',
                maxZoom: undefined, // 5 * 24 * 3600000, // 5 days
                title: {
                    text: null
                }
            },
            yAxis: {
                allowDecimals: false,
                min: 0,
                title: {
                    text: null
                }
            },
            tooltip: {
                shared: false,
                formatter: function() {
                    focusedX = this.x; // make note of the position in case the user wants details
                    var date = new Date(this.x).toISOString().replace('T', ' ').replace(/\..*$/, '');
                    var data = this.series.name + ': ' + this.y;
                    var more = 'Click for details...';
                    return [ date, data, more ].join('<br>');
                }
            },
            legend: {
                layout: 'vertical',
                align: 'right',
                verticalAlign: 'middle',
                borderWidth: 0
            },
            plotOptions: {
                series: {
                    events: {
                        click: function() {
                            showDetailsAt(focusedX);
                        }
                    }
                },
                line: {
                    lineWidth: 1,
                    marker: {
                        enabled: false
                    },
                    shadow: false,
                    states: {
                        hover: {
                            lineWidth: 1
                        }
                    },
                    threshold: null
                }
            },
            series: series
        });

    }

})();
