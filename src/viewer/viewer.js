(function() { "use strict";

    var gitData;

    $.getJSON('weightwatcher-data.json', function(rawData) {
        gitData = getGitData(rawData);
        renderChart(combineSeries(rawData));
    });

    return;

    function combineSeries(rawData) {
        var series = getSLOCSeries(rawData);
        series.forEach(function(currentSeries) {
            currentSeries.data.sort(function(a, b) {
                return a[0] - b[0]; // sort by timestamps
            });
        });
        return series;
    }

    function getGitData(rawData) {
        var gitData = {};
        Object.keys(rawData).forEach(function(identity) {
            var entry = rawData[identity];
            gitData[new Date(identity).getTime()] = entry.git.hash;
        });
        return gitData;
    }

    function getSLOCSeries(rawData) {
        var seriesMap = {};
        Object.keys(rawData).forEach(function(identity) {
            var entry = rawData[identity];
            if (!entry.sloc) {
                return;
            }
            Object.keys(entry.sloc).forEach(function(category) { // e.g. "Web code"
                Object.keys(entry.sloc[category]).forEach(function(metric) { // e.g. "files"
                    var key = category + ': ' + metric;
                    if (!seriesMap[key]) {
                        seriesMap[key] = [];
                    }
                    seriesMap[key].push(
                        [ new Date(identity).getTime(), entry.sloc[category][metric] ]
                    );
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