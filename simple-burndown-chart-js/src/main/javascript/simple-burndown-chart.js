(function() {
var margin = {top: 20, right: 20, bottom: 30, left: 50},
    width = 960 - margin.left - margin.right,
    height = 500 - margin.top - margin.bottom;


d3.csv("data.csv", function(error, data) {
var parseDate = d3.time.format("%Y-%b-%d").parse;
  var timeDomain = [];
  var lastDate;
  data.forEach(function(d) {
    d.date = parseDate(d.date);
    d.hours = parseInt(d.hours, 10);
    // collect each input value for the time domain (xaxis)
    // but skip duplicated values.
    if (!lastDate || lastDate.getTime() != d.date.getTime()) {
        timeDomain.push(d.date);
    }
    lastDate = d.date;
  });

  var x = d3.time.scale();

  var y = d3.scale.linear()
      .range([height, 0]);

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

  var svg = d3.select("#chart")
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
  y.domain([0, d3.max(data, function(d) { return d.hours; })]);

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
  var ideal = [data[0],{date: data[data.length - 1].date, hours: 0}];
  svg.append("path")
      .datum(ideal)
      .attr("class", "ideal")
      .attr("d", line);


  // remove any data points, that have no data yet
  for (var i = data.length - 1; i >= 0; i--) {
    if (data[i].hours === -1) {
      data.splice(i, 1);
    }
  }
  svg.append("path")
      .datum(data)
      .attr("class", "line")
      .attr("d", line);
});
})();

