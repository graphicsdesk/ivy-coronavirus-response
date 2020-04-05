import { scaleTime, scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { line as d3Line } from 'd3-shape';
import { f } from 'd3-jetpack/essentials';
import covidData from '../../data/covid.json';

const margin = { top: 50, right: 50, bottom: 50, left: 50 };

const width = 800;
const height = 600;
const gWidth = width - margin.left - margin.right;
const gHeight = height - margin.top - margin.bottom;

const data = covidData
  .filter(d => d.Country === 'US')
  .map(d => ({
    cases: d.Confirmed,
    country: d.Country,
    date: new Date(d.Date),
  }));

// Create x scale
const xScale = scaleTime()
  .domain(extent(data, d => d.date))
  .range([ 0, gWidth ]);
// Create y scale
const yScale = scaleLinear()
  .domain(extent(data, d => d.cases))
  .range([ gHeight, 0 ]);

// Create line generator
const line = d3Line()
  .x(d => xScale(d.date))
  .y(d => yScale(d.cases));

// Add svg using margins
const svg = select('#lede')
  .append('svg')
  .at({ width, height })
  .append('g')
  .translate([ margin.left, margin.top ]);

// Call the x-axis in a group tag
svg.append('g.x-axis')
  .translate([ 0, gHeight ])
  .call(axisBottom(xScale));

// Call the y axis in a group tag
svg.append('g.y-axis')
  .call(axisLeft(yScale));

// Append the path and bind the data
svg.append('path.line')
  .datum(data)
  .attr('d', line);

// // 12. Appends a circle for each datapoint 
// svg.selectAll(".dot")
//     .data(dataset)
//   .enter().append("circle") // Uses the enter().append() method
//     .attr("class", "dot") // Assign a class for styling
//     .attr("cx", function(d, i) { return xScale(i) })
//     .attr("cy", function(d) { return yScale(d.y) })