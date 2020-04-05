import { scaleTime, scaleLinear } from 'd3-scale';
import { extent } from 'd3-array';
import { axisBottom, axisLeft } from 'd3-axis';
import { select } from 'd3-selection';
import { line as d3Line } from 'd3-shape';
import { f } from 'd3-jetpack/essentials';

import 'intersection-observer';
import scrollama from 'scrollama';

import covidData from '../../data/covid.json';

/**
 * Preprocess data
 */

// Turn date strings into date objects
for (let i = 0; i < covidData.length; i++)
  covidData[i].date = new Date(covidData[i].date);

/**
 * Make charts
 */

const margin = { top: 20, right: 10, bottom: 50, left: 50 };

class Graph {
  width = document.body.clientWidth;
  height = document.body.clientHeight;
  gWidth = this.width - margin.left - margin.right;
  gHeight = this.height - margin.top - margin.bottom;

  // Create scales on dimensions
  xScale = scaleLinear().range([ 0, this.gWidth ]);
  yScale = scaleLinear().range([ this.gHeight, 0 ]);

  // Create line generator
  lineGenerator = d3Line();

  svg = select('#chart-container')
    .append('svg')
    .at({ width: this.width, height: this.height })
    .append('g')
    .translate([ margin.left, margin.top ]);

  xAxis = this.svg.append('g.x-axis').translate([ 0, this.gHeight ]);
  yAxis = this.svg.append('g.y-axis');
  linesContainer = this.svg.append('g.lines-container');

  rescaleDataRange(data) {
    const { xScale, yScale, lineGenerator } = this;

    // Scale the range of the data and the line generator
    xScale.domain(extent(data, d => d.dayNumber));
    yScale.domain(extent(data, d => d.cases));
    lineGenerator.x(d => xScale(d.dayNumber)).y(d => yScale(d.cases));
  }

  update(countries) {
    const data = covidData.filter(d => countries.includes(d.country) && d.dayNumber !== undefined && d.dayNumber >= 0 && d.dayNumber < 25);
    this.rescaleDataRange(data);

    const {
      xAxis, yAxis,
      xScale, yScale,
      linesContainer,
      lineGenerator,
    } = this;

    // Generate axes
    console.log(xAxis);
    xAxis.transition().call(axisBottom(xScale));
    yAxis.transition().call(axisLeft(yScale));

    // Each <path> should be joined to one country's time-series COVID data (an array)
    const theJoinData = countries.map(country => data.filter(d => d.country === country));

    // Join the data
    const lines = linesContainer
      .selectAll('path')
      .data(theJoinData, array => array[0].country);

    lines.enter()
      .append('path') // Append the entering elements
      .merge(lines) // Merge current enter selection with existing path selection
      .transition()
      .attr('d', lineGenerator); // Generate line for all paths

    lines.exit().remove(); // Remove the exiting elements
  }
}

const graph = new Graph();
graph.update([ 'China' ]);
setTimeout(() => graph.update([ 'US', 'China' ]), 1000);

/**
 * Scroll step triggers
 */

// Instantiate the scrollama
const scroller = scrollama();

// Setup the instance, pass callback functions
scroller
  .setup({
    step: '.step',
    offset: 0.65,
  })
  .onStepEnter(onStepEnter)
  .onStepExit(onStepExit);

function onStepEnter({ element, index }) {
  console.log('Entered', index);
}

function onStepExit({ element, index }) {
  console.log('Exited', index);
}

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
