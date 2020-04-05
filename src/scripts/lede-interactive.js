import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom, axisRight } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import 'd3-transition';
import { f } from 'd3-jetpack/essentials';

import 'intersection-observer';
import scrollama from 'scrollama';

import { fadeIn, fadeOut, INTERPOLATION_TIME, areDomainsUnequal } from './utils';

import covidData from '../../data/covid.json';

/**
 * Preprocess data
 */

// Turn date strings into date objects
for (let i = 0; i < covidData.length; i++)
  covidData[i].date = new Date(covidData[i].date);

/**
 * The Store class provides an interface for storing visualization state
 */

class Store {
  // Stores what countries are shown
  countriesShown = {};

  // Adds a country
  addCountry(country) {
    this.countriesShown[country] = true;
    this.update(this.rescaleDataRange());
  }

  // Removes a country
  removeCountry(country) {
    this.countriesShown[country] = undefined;
    this.update(this.rescaleDataRange());
  }

  // Returns countries as an array
  get countries() {
    return Object.keys(this.countriesShown).filter(c => this.countriesShown[c]);
  }

  // Returns data necessary to display the current state
  get data() {
    return covidData.filter(d => this.countries.includes(d.country) && d.dayNumber !== undefined && d.dayNumber >= 0 && d.dayNumber < 25);
  }
}

/**
 * The Graph class draws and udpates the visualization's DOM elements
 */

const margin = { top: 20, right: 20, bottom: 50, left: 50 };
class Graph extends Store {
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
  xAxisGenerator = axisBottom(this.xScale);
  yAxisGenerator = axisRight(this.yScale);

  // Create line generator
  lineGenerator = d3Line();

  update(domainsChanged) {
    const {
      xScale, yScale,
      xAxis, yAxis,
      xAxisGenerator, yAxisGenerator,
      linesContainer,
      lineGenerator,
      svg,
      countries, data
    } = this;

    // Each <path> should be joined to one country's time-series COVID data (an array)
    const theJoinData = countries.map(country => data.filter(d => d.country === country));

    // Join data, store update selection
    const linesUpdate = linesContainer
      .selectAll('path')
      .data(theJoinData, array => array[0].country);

    // Always interpolate existing elements to match the new data range.
    // But if the lines exit selection is nonempty, fade out and remove that first.
    const linesExit = linesUpdate.exit()
    if (linesExit.empty())
      updateExistingElements();
    else
      // Cannot use selection.call if chaining. See d3/d3-selection#102.
      fadeOut(linesExit).on('end', updateExistingElements);

    // Interpolates existing elements (axes and existing paths), and schedules
    // enterPaths(). If no domains changed, immediately enter paths.
    function updateExistingElements() {
      if (domainsChanged) {
        linesUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .attr('d', lineGenerator)
        xAxis.transition()
          .duration(INTERPOLATION_TIME)
          .call(xAxisGenerator);
        yAxis.transition()
          .duration(INTERPOLATION_TIME)
          .call(yAxisGenerator)
          .on('end', enterPaths);
      } else {
        enterPaths();
      }
    }

    // Fade in enter selection for paths
    function enterPaths() {
      linesUpdate.enter()
        .append('path')
        .attr('d', lineGenerator)
        .call(fadeIn);
    }
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

const graph = new Graph();
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
    graph.addCountry('China');
  else
    graph.removeCountry('China');
}

function onStepExit({ index }) {
}

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
