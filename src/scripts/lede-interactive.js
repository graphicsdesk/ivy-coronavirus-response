import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom, axisRight } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import 'd3-transition';
import { f } from 'd3-jetpack/essentials';

import 'intersection-observer';
import scrollama from 'scrollama';

import State from './state';
import {
  fadeIn, fadeOut,
  areDomainsUnequal,
  chainTransitions,
  INTERPOLATION_TIME,
} from './utils';

import covidData from '../../data/covid.json';

/**
 * Preprocess data
 */

// Turn date strings into date objects
for (let i = 0; i < covidData.length; i++)
  covidData[i].date = new Date(covidData[i].date);

/**
 * The Graph class draws and udpates the visualization's DOM elements
 */

const TICK_PADDING = 12;
const margin = { top: 20, right: 50 + TICK_PADDING, bottom: 30 + TICK_PADDING, left: 20 };

class Graph extends State {
  // constructor()
  width = document.body.clientWidth;
  height = document.body.clientHeight;
  gWidth = this.width - margin.left - margin.right;
  gHeight = this.height - margin.top - margin.bottom;

  // Create scales; we only know range right now
  xScale = scaleLinear().range([ 0, this.gWidth ]);
  yScale = scaleLinear().range([ this.gHeight, 0 ]);

  // Create SVG and the main group for margins
  svg = select('#chart-container')
    .append('svg')
    .at({ width: this.width, height: this.height })
    .append('g')
    .translate([ margin.left, margin.top ]);

  // Create axis container, lines container
  xAxis = this.svg.append('g.axis.x-axis').translate([ 0, this.gHeight ]);
  yAxis = this.svg.append('g.axis.y-axis');
  linesContainer = this.svg.append('g.lines-container');

  // Create axis generators
  xAxisGenerator = axisBottom(this.xScale)
    .tickSize(-this.gHeight)
    .tickPadding(TICK_PADDING);
  yAxisGenerator = axisRight(this.yScale)
    .tickSize(this.gWidth)
    .tickPadding(TICK_PADDING);

  // Create line generator
  lineGenerator = d3Line();

  update() {
    const domainsChanged = this.rescaleDataRange();

    const {
      xScale, yScale,
      lineGenerator,
      svg, linesContainer,
      countries, annotations, data
    } = this;

    console.log(annotations);

    // Each <path> should be joined to one country's time-series COVID data (an array)
    const theJoinData = countries.map(country => data.filter(d => d.country === country));

    // Join data, store update selection
    const linesUpdate = linesContainer
      .selectAll('path')
      .data(theJoinData, array => array[0].country);

    // Store enter and exit selections for convenience
    const linesEnter = linesUpdate.enter();
    const linesExit = linesUpdate.exit();

    chainTransitions(
      // If exiting selection is nonempty, fade those out first.
      // Cannot use selection.call(function) if chaining (see d3/d3-selection#102).
      !linesExit.empty() && (() => fadeOut(linesExit)),

      // If domains changed, interpolate existing elements (axes and
      // existing paths) simultaneously to match new data range
      domainsChanged && (() => {
        linesUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .attr('d', lineGenerator)
        return this.updateAxes();        
      }),

      // Fade in the path enter selection
      !linesEnter.empty() && (() => linesEnter
        .append('path')
        .attr('d', lineGenerator)
        .call(fadeIn)),
    )();
  }

  // TODO: make axes prettier. https://observablehq.com/@d3/styled-axes
  updateAxes() {
    const { xAxis, yAxis, xAxisGenerator, yAxisGenerator } = this;

    xAxis.transition()
      .duration(INTERPOLATION_TIME)
      .call(xAxisGenerator);
    return yAxis.transition()
      .duration(INTERPOLATION_TIME)
      .call(yAxisGenerator);
  }

  // Rescales mappings (scales, line generator) based on new data
  rescaleDataRange() {
    const { xScale, yScale, lineGenerator } = this;

    const newXDomain = extent(this.data, d => d.dayNumber);
    const newYDomain = extent(this.data, d => d.cases);

    // Update scale domains. Returns whether domains had changed.
    // Plus sign is an eager (non-short-circuiting) OR
    const didDomainsChange =
      areDomainsUnequal(xScale.domain(), xScale.domain(newXDomain).domain()) +
      areDomainsUnequal(yScale.domain(), yScale.domain(newYDomain).domain());

    // Updates line generator based on new scales
    if (didDomainsChange)
      lineGenerator.x(d => xScale(d.dayNumber)).y(d => yScale(d.cases));

    return didDomainsChange;
  }
}

const graph = new Graph(covidData);
graph.addCountry('US');

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

function onStepEnter({ index }) {
  if (index === 1)
    graph.addAnnotation({ label: 'Harvard', dayNumber: 7 });
    // graph.addCountry('China');
  else
    graph.removeAnnotation({ label: 'Harvard', dayNumber: 7 });
    // graph.removeCountry('China');
}

function onStepExit({ index }) {
}

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
