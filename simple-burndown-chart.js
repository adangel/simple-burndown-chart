/*
 *   Licensed under the Apache License, Version 2.0 (the "License");
 *   you may not use this file except in compliance with the License.
 *   You may obtain a copy of the License at
 *
 *         http://www.apache.org/licenses/LICENSE-2.0
 *
 *   Unless required by applicable law or agreed to in writing, software
 *   distributed under the License is distributed on an "AS IS" BASIS,
 *   WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *   See the License for the specific language governing permissions and
 *   limitations under the License.
 */

(function() {

    window.SBD = {
        render: function(data, c) {
            var config = createConfiguration(c),
                parseDate = d3.time.format(config.dateFormat).parse;

            if (typeof(data) === "string") {
                if (data.indexOf("{") === 0) {
                    renderData(JSON.parse(data));
                } else {
                    d3.xhr(data, "application/json", function(error, request) {
                        renderData(JSON.parse(request.responseText));
                    });
                }
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
                conf.showGrid = c.showGrid || false;
                conf.showComments = c.showComments || false;
                conf.dateFormat = c.dateFormat || "%Y-%b-%d";
                return conf;
            }

            function renderData(data) {
                var chart, svg = d3.select(config.chartNodeSelector);
                svg.selectAll("*").remove();
                if (svg.node().nodeName !== "svg") {
                    svg = svg.append("svg:svg");
                }
                svg.attr("width", config.width + config.margin.left + config.margin.right)
                   .attr("height", config.height + config.margin.top + config.margin.bottom);
                svg = svg.append("g")
                   .attr("transform", "translate(" + config.margin.left + "," + config.margin.top + ")");

                parseDates(data);
                chart = renderAxis(d3, svg, data.timeDomain, data.burndowns);
                renderIdealLine(d3, svg, chart.line, data.start, data.plannedHours, data.end);
                renderBurnDown(d3, svg, chart, data.burndowns);
                renderComments(d3, svg, chart, data);
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

                /** http://www.d3noob.org/2013/01/adding-grid-lines-to-d3js-graph.html */
                if (config.showGrid) {
                    svg.append("g")
                        .attr("class", "grid")
                        .attr("transform", "translate(0," + config.height + ")")
                        .call(xAxis.tickSize(-config.height, 0, 0).tickFormat(""));

                    svg.append("g")
                        .attr("class", "grid")
                        .call(yAxis.ticks(10).tickSize(-config.width, 0, 0).tickFormat(""));
                }

                return {
                    line: d3.svg.line()
                            .x(function(d) { return x(d.date); })
                            .y(function(d) { return y(d.hours); }),
                    x: x,
                    y: y};
            }

            function renderIdealLine(d3, svg, line, startDate, plannedHours, endDate) {
                var ideal = [{date: startDate, hours: plannedHours}, {date: endDate, hours: 0}];

                svg.append("path")
                    .datum(ideal)
                    .attr("class", "ideal")
                    .attr("d", line);
            }

            function renderBurnDown(d3, svg, chart, burndowns) {
                svg.append("path")
                    .datum(burndowns)
                    .attr("class", "line")
                    .attr("d", chart.line);
            }

            function renderComments(d3, svg, chart, data) {
                if (!config.showComments) {
                    return;
                }

                var group = svg.append("g"),
                    maxX = config.width,
                    maxY = config.height,
                    dateFormatter = d3.time.format("%a, %e %b %Y");

                group.selectAll("path")
                    .data(data.burndowns)
                    .enter().append("path")
                        .attr("transform", function(d) { return "translate(" + chart.x(d.date) + "," + chart.y(d.hours) + ")"; })
                        .attr("d", d3.svg.symbol())
                        .on("mouseover", function(d) {
                            var x = chart.x(d.date) + 20,
                                y = chart.y(d.hours) - 50,
                                margin = 10,
                                width = 200,
                                height = 100;

                            if (x + width > maxX) {
                                x = maxX - width;
                            }
                            if (y + height > maxY) {
                                y = maxY - height;
                            }
                            if (x < 0) {
                                x = margin;
                            }
                            if (y < 0) {
                                y = margin;
                            }

                            group.append("rect")
                                .attr("x", x)
                                .attr("y", y)
                                .attr("width", width)
                                .attr("height", height)
                                .attr("rx", 20)
                                .attr("ry", 20)
                                .attr("class", "comment");

                            // using foreignObject, see http://ajaxian.com/archives/foreignobject-hey-youve-got-html-in-my-svg
                            var div = group.append("foreignObject")
                                .attr("x", x + margin)
                                .attr("y", y + margin)
                                .attr("width", width - 2 * margin)
                                .attr("height", height - 2 * margin)
                                .append("xhtml:body")
                                .append("xhtml:div");

                            div.append("div").text(dateFormatter(d.date));
                            div.append("div").html('<div class="comment">Hours: ' + d.hours + "</div>");

                            if (d.comment) {
                                div.append("div").html('<div class="comment">' + d.comment + "</div>");
                            }
                        })
                        .on("mouseout", function() {
                            group.selectAll("foreignObject").remove();
                            var toDelete = document.getElementsByTagName("foreignObject");
                            for (var i = 0; i < toDelete.length; i++) {
                                toDelete[i].parentNode.removeChild(toDelete[i]);
                            }
                            group.selectAll("rect").remove();
                        });
            }
        }
    };
})();

