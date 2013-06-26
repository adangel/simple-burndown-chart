(function() {

    window.SBD = {
        render: function(data, c) {
            var c = c || {},
                margin = c.margin || {top: 20, right: 20, bottom: 30, left: 50},
                width = (c.width || 960) - margin.left - margin.right,
                height = (c.height || 500) - margin.top - margin.bottom,
                chartNodeSelector = c.chartNodeSelector || "#chart",
                parseDate = d3.time.format("%Y-%b-%d").parse;

            if (typeof(data) === "string") {
                d3.xhr(data, "application/json", function(error, request) {
                    renderData(JSON.parse(request.responseText));
                });
            } else if (typeof(data) === "object") {
                renderData(data);
            } else {
                throw "No data provided for simple burndown chart!"
            }

            function renderData(data) {
                var startDate = parseDate(data.start),
                    endDate = parseDate(data.end),
                    plannedHours = data.plannedHours;

                // parse time domain
                var timeDomain = [];
                for (var i = 0; i < data.timeDomain.length; i++) {
                    timeDomain[i] = parseDate(data.timeDomain[i]);
                }

                // parse burndowns
                for (var i = 0; i < data.burndowns.length; i++) {
                    data.burndowns[i].date = parseDate(data.burndowns[i].date);
                }

                var x = d3.time.scale(),
                    y = d3.scale.linear().range([height, 0]);

                var xAxis = d3.svg.axis()
                    .scale(x)
                    .orient("bottom")
                    .ticks(function() { return timeDomain; });

                var yAxis = d3.svg.axis()
                    .scale(y)
                    .orient("left");

                var line = d3.svg.line()
                    .x(function(d) { return x(d.date); })
                    .y(function(d) { return y(d.hours); });

                var svg = d3.select(chartNodeSelector)
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom)
                    .append("g")
                    .attr("transform", "translate(" + margin.left + "," + margin.top + ")");


                // calculate the output range for the x axis.
                // input range is timeDomain.
                var timeOutputRange = [];
                var currentX = 0;
                var diff = width / (timeDomain.length - 1);
                for (var i = 0; i < timeDomain.length; i++) {
                    timeOutputRange.push(currentX);
                    currentX += diff;
                }
                x.range(timeOutputRange);
                x.domain(timeDomain);
                y.domain([0, d3.max(data.burndowns, function(d) { return d.hours; })]);

                svg.append("g")
                    .attr("class", "x axis")
                    .attr("transform", "translate(0," + height + ")")
                    .call(xAxis);

                svg.append("g")
                    .attr("class", "y axis")
                    .call(yAxis)
                    .append("text")
                    .attr("y", "-1em")
                    .attr("x", 0)
                    .style("text-anchor", "end")
                    .text("Hours");

                // take the first data point and the date of the last point
                var ideal = [{date: startDate, hours: plannedHours}, {date: endDate, hours: 0}];
                svg.append("path")
                    .datum(ideal)
                    .attr("class", "ideal")
                    .attr("d", line);

                svg.append("path")
                    .datum(data.burndowns)
                    .attr("class", "line")
                    .attr("d", line);
            }
        }
    };
})();

