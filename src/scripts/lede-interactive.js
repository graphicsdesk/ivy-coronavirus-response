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

  // State setter for adding countries
  addCountry(...countries) {
    const didCountriesChange = countries
      // If a country is not shown, add it (set it to true) and return true.
      // If a country is already shown, return false
      .map(c => !this.countriesShown[c] && (this.countriesShown[c] = true))
      // Were any countries actually added (i.e. set to true)?
      .includes(true);
    this.updateComponent(didCountriesChange);
  }

  // State setter for removing countries
  removeCountry(...countries) {
    const didCountriesChange = countries
      // If a country is shown, remove it (set it to undefined) and return true.
      // If a country is already not shown, return false.
      .map(c => this.countriesShown[c] && ((this.countriesShown[c] = undefined) === undefined))
      // Were any countries actually removed (i.e. set to undefined)?
      .includes(true);
    this.updateComponent(didCountriesChange);
  }

  // Updates component if it should update
  updateComponent(shouldComponentUpdate) {
    if (shouldComponentUpdate)
      this.update();
  }

  // Returns countries as an array
  get countries() {
    return Object.keys(this.countriesShown).filter(c => this.countriesShown[c]);
  }

  // Returns data necessary to display the current state
  get data() {
    return covidData.filter(d => this.countries.includes(d.country) && d.dayNumber !== undefined && d.dayNumber >= 0 && d.dayNumber < 18);
  }
}

/**
 * The Graph class draws and udpates the visualization's DOM elements
 */

const TICK_PADDING = 12;
const margin = { top: 20, right: 50 + TICK_PADDING, bottom: 30 + TICK_PADDING, left: 20 };

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
    console.log('updating')

    const {
      xScale, yScale,
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

    // Interpolates existing elements (axes and existing paths), and schedules
    // enterPaths(). If no domains changed, immediately enter paths.
    const updateExistingElements = () => {
      if (domainsChanged) {
        linesUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .attr('d', lineGenerator)
        this.updateAxes().on('end', enterPaths);
      } else {
        enterPaths();
      }
    }

    // Fade in the path enter selection
    const enterPaths = () =>
      linesUpdate.enter()
        .append('path')
        .attr('d', lineGenerator)
        .call(fadeIn);

    // Always interpolate existing elements to match the new data range.
    // But if the lines exit selection is nonempty, fade out and remove that first.
    const linesExit = linesUpdate.exit()
    if (linesExit.empty())
      updateExistingElements();
    else
      // Cannot use selection.call(function) if chaining. See d3/d3-selection#102.
      fadeOut(linesExit).on('end', updateExistingElements);
  }

  updateAxes() {
    // TODO: make axes prettier. https://observablehq.com/@d3/styled-axes
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
