import { scaleTime, scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select, selection } from 'd3-selection';
import { transition } from 'd3-transition';
import { wordwrap } from 'd3-jetpack';
import scrollama from 'scrollama';
import 'intersection-observer';

import State from './state';
import {
  fadeIn, fadeOut, drawIn,
  areDomainsEqual,
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

  // Axis generators
  makeXAxis = axisBottom(this.xScale).tickSize(-this.gHeight).tickPadding(TICK_PADDING);
  makeYAxis = axisLeft(this.yScale).tickSize(-this.gWidth).tickPadding(TICK_PADDING);

  // Line generator
  makeLine = d3Line();

  async update() {
    const domainsChanged = this.rescaleDataRange();

    const {
      xScale, yScale, makeLine,
      svg, linesContainer, annotationsContainer,
      countries, annotations, data
    } = this;

    // Join countries data, store selections
    const linesUpdate = linesContainer
      .selectAll('path')
      .data(
        // Each <path> should be joined to a country's time-series COVID data (an array)
        countries.map(country => data.filter(d => d.country === country)),
        array => array[0].country,
      );
    const linesEnter = linesUpdate.enter();
    const linesExit = linesUpdate.exit();

    // Join annotations data, store selections
    const annotationsUpdate = annotationsContainer
      .selectAll('g.annotation')
      .data(this.withCovidData(annotations), a => a.key);
    const annotationsEnter = annotationsUpdate.enter();
    const annotationsExit = annotationsUpdate.exit();

    this.updateAnnotation = this.updateAnnotation.bind(this);

    // If exiting selection is nonempty, fade those out first.
    // Cannot use selection.call(function) if chaining (see d3/d3-selection#102).
    if (!(linesExit.empty() && annotationsExit.empty())) {
      const linesFade = fadeOut(linesExit);
      const annotationsFade = fadeOut(annotationsExit);
      if (linesExit.empty())
        await annotationsFade.end();
      else
        await linesFade.end();
    }

    // If domains changed, interpolate existing elements (axes, existing lines
    // and annotations) simultaneously to match new data range
    if (domainsChanged) {
      linesUpdate.transition()
        .duration(INTERPOLATION_TIME)
        .attr('d', makeLine);
      annotationsUpdate.transition()
        .duration(INTERPOLATION_TIME)
        .call(this.updateAnnotation);
      await this.updateAxes().end();
    }

    // Draw in the path enter selection
    if (!linesEnter.empty()) {
      await drawIn(linesEnter.append('path').attr('d', makeLine)).end();
    }

    // Fade in the annotations enter selection
    if (!annotationsEnter.empty()) {
      await fadeIn(
        annotationsEnter
          .append('g.annotation')
          .call(this.enterAnnotation)
          .call(this.updateAnnotation)
      ).end();
    }
  }

  enterAnnotation(selection, i) {
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
      .at({ x: d => Math.min(xScale(d.dayNumber) / 2, firstQuintile(xScale.range())), y: d => yScale(d.cases) })
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
    const didDomainsChange = !areDomainsEqual(xScale.domain(), xScale.domain(newXDomain).domain()) +
      !areDomainsEqual(yScale.domain(), yScale.domain(newYDomain).domain());

    // Updates line generator based on new scales
    if (didDomainsChange)
      makeLine.x(d => xScale(d.dayNumber)).y(d => yScale(d.cases));

    return didDomainsChange;
  }
}

const graph = new Graph(covidData);

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

// Storing annotations for convenience
const us7 = { dayNumber: 7, label: 'Harvard, Cornell, Yale', showCases: true };
const us8 = { dayNumber: 8, label: 'Princeton and Penn', isSmall: true, orientation: 'top' };
const us9 = { dayNumber: 9, label: 'Dartmouth and Brown', isSmall: true, orientation: 'top' };
const us12 = { dayNumber: 12, label: 'Columbia', showCases: true };
const usIvy = { dayNumber: 8.375, label: 'Ivy average' };
const china = { dayNumber: 8, label: 'China tk', country: 'China', showCases: true, };
const korea = { dayNumber: 2, label: 'South Korea tk', country: 'Korea, South', showCases: true};

const initialState = { countries: [ 'US' ] };
const allStates = [
  { annotations: [ us7 ], countries: [ 'US' ] },
  { annotations: [ us7, us8, us9, us12 ], countries: [ 'US' ] },
  { annotations: [ usIvy ], countries: [ 'US' ] },
  { annotations: [ usIvy, china ], countries: [ 'US', 'China' ] },
  { annotations: [ usIvy, china, korea ], countries: [ 'US', 'China', 'Korea, South' ] },
];

graph.set(initialState);

function onStepEnter({ index }) {
  if (allStates[index] !== undefined)
    graph.set(allStates[index]);
}

function onStepExit({ index, direction }) {
  if (index === 0 && direction === 'up')
    graph.set(initialState);
}

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
