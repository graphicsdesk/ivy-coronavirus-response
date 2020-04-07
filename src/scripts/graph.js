import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import 'd3-transition';
import 'd3-jetpack/essentials';
import wordwrap from 'd3-jetpack/src/wordwrap';

import 'intersection-observer';
import scrollama from 'scrollama';

import State from './state';
import {
  fadeIn, fadeOut,
  areDomainsUnequal,
  chainTransitions,
  firstQuintile,
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
const margin = { top: 20, right: 20, bottom: 30 + TICK_PADDING, left: 50 + TICK_PADDING };

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

  // Create axis container, other containers
  xAxis = this.svg.append('g.axis.x-axis').translate([ 0, this.gHeight ]);
  yAxis = this.svg.append('g.axis.y-axis');
  linesContainer = this.svg.append('g.lines-container');
  annotationsContainer = this.svg.append('g.annotations-container');

  // Create axis generators
  makeXAxis = axisBottom(this.xScale)
    .tickSize(-this.gHeight)
    .tickPadding(TICK_PADDING);
  makeYAxis = axisLeft(this.yScale)
    .tickSize(-this.gWidth)
    .tickPadding(TICK_PADDING);

  // Create line generator
  makeLine = d3Line();

  update() {
    const domainsChanged = this.rescaleDataRange();

    const {
      xScale, yScale,
      makeLine,
      svg, linesContainer, annotationsContainer,
      countries, annotations, data
    } = this;

    // Join countries data, store enter, update, and exit selections
    const linesUpdate = linesContainer
      .selectAll('path')
      .data(
        // Each <path> should be joined to one country's time-series COVID data (an array)
        countries.map(country => data.filter(d => d.country === country)),
         // Use country as key
        array => array[0].country
      );
    const linesEnter = linesUpdate.enter();
    const linesExit = linesUpdate.exit();

    // Join annotations data, store selections
    const annotationsUpdate = annotationsContainer
      .selectAll('g.annotation')
      .data(this.withCovidData(annotations), a => a.key)
      .join(
        enter => enter.append('g.annotation')
          .call(this.makeAnnotation.bind(this))
          .call(fadeIn),
        update => update,
        exit => exit.call(fadeOut),
      );

    // const exitSelections = linesUpdate.exit().merge(annotationsUpdate.exit());
    const exitSelections = linesExit;

    chainTransitions(
      // If exiting selection is nonempty, fade those out first.
      // Cannot use selection.call(function) if chaining (see d3/d3-selection#102).
      !exitSelections.empty() && (() => fadeOut(exitSelections)),

      // If domains changed, interpolate existing elements (axes and
      // existing paths) simultaneously to match new data range
      domainsChanged && (() => {
        linesUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .attr('d', makeLine)
        return this.updateAxes();        
      }),

      // Fade in the path enter selection
      !linesEnter.empty() && (() => linesEnter
        .append('path')
        .attr('d', makeLine)
        .call(fadeIn)),
    )();
  }

  makeAnnotation(selection, i) {
    const { xScale, yScale } = this;

    // later on: can adjust on resize
    const CONNECTOR_LENGTH = 80;
    const CONNECTOR_PADDING = 7;
    const LINE_WIDTH = 15;
    const LINE_HEIGHT = 20;

    // Make a top-oriented connector
    console.log(selection.data())
    selection
      .append('line.connector')
      .at({
        x1: d => xScale(d.dayNumber), y1: d => yScale(d.cases),
        x2: d => xScale(d.dayNumber), y2: d => yScale(d.cases) - CONNECTOR_LENGTH,
      });

    // Make a y-intercept baseline thing
    const caseCountContainer = selection.append('g.case-count-container');
    caseCountContainer
      .append('line') // TODO: RENAME CLASS
      .at({
        x1: d => xScale(d.dayNumber), y1: d => yScale(d.cases),
        x2: 0, y2: d => yScale(d.cases),
      });
    caseCountContainer
      .append('text')
      .at({
        x: d => firstQuintile(xScale.range()),
        y: d => yScale(d.cases),
      })
      .text(d => d.cases + ' cases');

    // Make the dot
    selection
      .append('circle')
      .at({
        cx: d => xScale(d.dayNumber),
        cy: d => yScale(d.cases),
        r: 6
      });

    // Make label
    selection
      .append('text')
      .tspans(d => wordwrap(d.label, LINE_WIDTH), LINE_HEIGHT)
      .at({
        x: d => xScale(d.parent.dayNumber),
        y: (d, i, elements) => yScale(d.parent.cases) -
          CONNECTOR_LENGTH -
          CONNECTOR_PADDING -
          // Move upwards by the number of line breaks to vertically align bottom
          (elements.length - 1) * LINE_HEIGHT,
      });
  }

  // TODO: make axes prettier. https://observablehq.com/@d3/styled-axes
  updateAxes() {
    const { xAxis, yAxis, makeXAxis, makeYAxis } = this;

    xAxis.transition()
      .duration(INTERPOLATION_TIME)
      .call(makeXAxis);
    return yAxis.transition()
      .duration(INTERPOLATION_TIME)
      .call(makeYAxis);
  }

  // Rescales mappings (scales, line generator) based on new data
  rescaleDataRange() {
    const { xScale, yScale, makeLine } = this;

    const newXDomain = extent(this.data, d => d.dayNumber);
    const newYDomain = extent(this.data, d => d.cases);

    // Update scale domains. Returns whether domains had changed.
    // Plus sign is an eager (non-short-circuiting) OR
    const didDomainsChange =
      areDomainsUnequal(xScale.domain(), xScale.domain(newXDomain).domain()) +
      areDomainsUnequal(yScale.domain(), yScale.domain(newYDomain).domain());

    // Updates line generator based on new scales
    if (didDomainsChange)
      makeLine.x(d => xScale(d.dayNumber)).y(d => yScale(d.cases));

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
  if (index === 0)
    graph.addAnnotation({ label: 'Harvard, Cornell, Yale', dayNumber: 7 });
  if (index === 1)
    graph.addAnnotation(
      { label: 'Columbia', dayNumber: 12 },
      { label: 'Princeton and Brown', dayNumber: 8, isMinor: true },
    );
}

function onStepExit({ index, direction }) {
  if (index === 0 && direction === 'up')
    graph.removeAnnotation({ dayNumber: 7 });
  if (index === 1 && direction === 'up')
    graph.removeAnnotation(
      { dayNumber: 12 },
      { dayNumber: 8 },
    );
}

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
