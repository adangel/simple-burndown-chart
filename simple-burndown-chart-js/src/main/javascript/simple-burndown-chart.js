(function() {
    var parseDate = d3.time.format("%Y-%b-%d").parse;

    window.SBD = {
        render: function(data, c) {
            var config = createConfiguration(c);

            if (typeof(data) === "string") {
                d3.xhr(data, "application/json", function(error, request) {
                    renderData(JSON.parse(request.responseText));
                });
            } else if (typeof(data) === "object") {
                renderData(data);
            } else {
                throw "No data provided for simple burndown chart!"
            }

            function createConfiguration(c) {
                var c = c || {}, conf = {};
                conf.margin = c.margin || {top: 20, right: 20, bottom: 30, left: 50};
                conf.width = (c.width || 960) - conf.margin.left - conf.margin.right;
                conf.height = (c.height || 500) - conf.margin.top - conf.margin.bottom;
                conf.chartNodeSelector = c.chartNodeSelector || "#chart";
                return conf;
            }

            function renderData(data) {
                var svg = d3.select(config.chartNodeSelector)
                        .attr("width", config.width + config.margin.left + config.margin.right)
                        .attr("height", config.height + config.margin.top + config.margin.bottom)
                        .append("g")
                        .attr("transform", "translate(" + config.margin.left + "," + config.margin.top + ")"),
                    line;

                parseDates(data);
                line = renderAxis(d3, svg, data.timeDomain, data.burndowns);
                renderIdealLine(d3, svg, line, data.start, data.plannedHours, data.end);
                renderBurnDown(d3, svg, line, data.burndowns);
            }

            function parseDates(data) {
                var i;
                data.start = parseDate(data.start);
                data.end = parseDate(data.end);
                // parse time domain
                for (i = 0; i < data.timeDomain.length; i++) {
                    data.timeDomain[i] = parseDate(data.timeDomain[i]);
                }
                // parse burndowns
                for (i = 0; i < data.burndowns.length; i++) {
                    data.burndowns[i].date = parseDate(data.burndowns[i].date);
                }
            }

            function renderAxis(d3, svg, timeDomain, burndowns) {
                var x, y, xAxis, yAxis, currentX, diff, i, timeOutputRange = [];

                x = d3.time.scale();
                y = d3.scale.linear().range([config.height, 0]);

                // calculate the output range for the x axis.
                // input range is timeDomain.
                currentX = 0;
                diff = config.width / (timeDomain.length - 1);
                for (i = 0; i < timeDomain.length; i++) {
                    timeOutputRange.push(currentX);
                    currentX += diff;
                }
                x.range(timeOutputRange);
                x.domain(timeDomain);
                y.domain([0, d3.max(burndowns, function(d) { return d.hours; })]);

                xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(function() { return timeDomain; });

                yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + config.height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("y", "-1em")
                    .attr("x", 0)
                    .style("text-anchor", "end")
                    .text("Hours");

                return d3.svg.line()
                    .x(function(d) { return x(d.date); })
                    .y(function(d) { return y(d.hours); });
            }

            function renderIdealLine(d3, svg, line, startDate, plannedHours, endDate) {
                var ideal = [{date: startDate, hours: plannedHours}, {date: endDate, hours: 0}];

                svg.append("path")
                    .datum(ideal)
                    .attr("class", "ideal")
                    .attr("d", line);
            }

            function renderBurnDown(d3, svg, line, burndowns) {
                svg.append("path")
                    .datum(burndowns)
                    .attr("class", "line")
                    .attr("d", line);
            }
        }
    };
})();

