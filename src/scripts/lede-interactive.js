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
 * Data processing 
 */

// Turn date strings into date objects
for (let i = 0; i < covidData.length; i++)
  covidData[i].date = new Date(covidData[i].date);

/**
 * Chartmaking
 */

const margin = { top: 20, right: 10, bottom: 50, left: 50 };

graphData();

function graphData() {
  const width = document.body.clientWidth;
  const height = document.body.clientHeight;
  const gWidth = width - margin.left - margin.right;
  const gHeight = height - margin.top - margin.bottom;

  const data = covidData.filter(d => d.country === 'US');

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
  const svg = select('#chart-container')
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
}

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