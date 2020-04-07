import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import { transition } from 'd3-transition';
import { wordwrap } from 'd3-jetpack';

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

// later on: can adjust on resize
const TICK_PADDING = 12;
const CONNECTOR_LENGTH = 120;
const CONNECTOR_PADDING = 7;
const SMALL_LINE_WIDTH = 10;
const LINE_WIDTH = 15;
const LINE_HEIGHT = 20;

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
          .call(this.updateAnnotation.bind(this))
          .call(fadeIn),
        update => update.transition()
          .duration(INTERPOLATION_TIME)
          .call(this.updateAnnotation.bind(this)),
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
    const largeAnnotations = selection.filter(d => !d.isSmall);
    const smallAnnotations = selection.filter(d => d.isSmall)
      .classed('small-annotation', true);
    selection
      .filter(d => d.orientation === 'top')
      .classed('orientation-top', true);

    largeAnnotations.append('line.connector'); // Make a top-oriented connector

    const caseCountContainer = largeAnnotations.filter(d => d.showCases)
      .append('g.case-count-container');
    caseCountContainer.append('line');
    caseCountContainer.append('text');

    selection.append('circle'); // Make the circle
    selection
      .append('text.label') // Make the label
      .tspans(d => wordwrap(d.label, d.isSmall ? SMALL_LINE_WIDTH : LINE_WIDTH), LINE_HEIGHT);
  }

  updateAnnotation(selection, i) {
    const { xScale, yScale } = this;

    const largeAnnotations = selection.filter(d => !d.isSmall);
    const smallAnnotations = selection.filter(d => d.isSmall);

    // Place connector
    largeAnnotations
      .select('line.connector')
      .at({
        x1: d => xScale(d.dayNumber), y1: d => yScale(d.cases),
        x2: d => xScale(d.dayNumber), y2: d => yScale(d.cases) - CONNECTOR_LENGTH,
      });

    // Make a case count y-intercept marker
    const caseCountContainer = largeAnnotations.filter(d => d.showCases)
      .select('g.case-count-container');
    caseCountContainer
      .select('line')
      .at({
        x1: d => xScale(d.dayNumber), y1: d => yScale(d.cases),
        x2: 0, y2: d => yScale(d.cases),
      });
    caseCountContainer
      .select('text')
      .at({ x: d => firstQuintile(xScale.range()), y: d => yScale(d.cases) })
      .text(d => d.cases + ' cases');

    // Place the dot
    selection
      .select('circle')
      .at({ cx: d => xScale(d.dayNumber), cy: d => yScale(d.cases), r: 6 });

    // Place label
    selection
      .select('text.label')
      .selectAll('tspan')
      .at({
        x: d => xScale(d.parent.dayNumber),
        y: ({ parent: { cases, isSmall, orientation } }, i, elements) => {
          let y = yScale(cases);
          if (!isSmall)
            y -= CONNECTOR_LENGTH + CONNECTOR_PADDING;
          if (!isSmall || orientation === 'top')
            y -= (elements.length - 1) * LINE_HEIGHT; // Aligns bottom of text with base
          return y;
        },
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
    graph.addAnnotation({ dayNumber: 7, label: 'Harvard, Cornell, Yale', showCases: true });
  if (index === 1)
    graph.addAnnotation(
      { dayNumber: 7, label: 'Harvard, Cornell, Yale', showCases: true },
      { dayNumber: 8, label: 'Princeton and Penn', isSmall: true, orientation: 'top' },
      { dayNumber: 9, label: 'Dartmouth and Brown', isSmall: true },
      { dayNumber: 12, label: 'Columbia', showCases: true },
    );
  if (index === 2)
    graph.addAnnotation(
      { dayNumber: 8.375, label: 'Ivy average' },
    );
  if (index === 3)
    graph.addCountry('China');
}

function onStepExit({ index, direction }) {
  if (index === 0 && direction === 'up' || index === 1 && direction === 'down')
    graph.removeAnnotation({ dayNumber: 7 });
  if (index === 1)
    graph.removeAnnotation(
      { dayNumber: 12 },
      { dayNumber: 8 },
      { dayNumber: 9 },
    );
  if (index === 2 && direction === 'up')
    graph.removeAnnotation(
      { dayNumber: 8.375 },
    )
  if (index === 3 && direction === 'up')
    graph.removeCountry('China');
}

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
