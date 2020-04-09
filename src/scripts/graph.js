import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select, selection } from 'd3-selection';
import { wordwrap } from 'd3-jetpack';
import scrollama from 'scrollama';
import 'intersection-observer';

import State from './state';
import {
  areDomainsEqual,
  firstQuintile,
  formatCases,
  INTERPOLATION_TIME,
} from './utils';
import { COUNTRY_COLORS, getLineLabel, getLineColor } from './constants';
import './d3-wrappers';

import covidData from '../../data/covid.json';

/**
 * Preprocess data
 */

for (let i = 0; i < covidData.length; i++)
  covidData[i].date = new Date(covidData[i].date);

/**
 * The Graph class draws and udpates the visualization's DOM elements
 */

const TICK_PADDING = 12;
const CONNECTOR_LENGTH = 100;
const SMALL_LINE_WIDTH = 10;
const LINE_WIDTH = 15;
const LINE_HEIGHT = 23;

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
      makeLine, linesContainer, annotationsContainer,
      countries, annotations, data
    } = this;

    // Join countries data, store selections
    const linesUpdate = linesContainer
      .selectAll('g.line-container')
      .data(
        // Each <path> should be joined to a country's time-series COVID data (an array)
        countries.map(country => data.filter(d => d.country === country)),
        array => array[0].country,
      );

    // Join annotations data, store selections
    const annotationsUpdate = annotationsContainer
      .selectAll('g.annotation')
      .data(this.withCovidData(annotations), a => a.key);

    this.updateAnnotation = this.updateAnnotation.bind(this);
    this.updateLineContainer = this.updateLineContainer.bind(this);

    // If exiting selection is nonempty, fade those out first.
    await bulkFadeOutExiting([ linesUpdate, annotationsUpdate ]);

    // If domains changed, interpolate existing elements (axes, existing lines
    // and annotations) simultaneously to match new data range
    if (domainsChanged) {
      linesUpdate.transition()
        .duration(INTERPOLATION_TIME)
        .call(this.updateLineContainer);
      annotationsUpdate.transition()
        .duration(INTERPOLATION_TIME)
        .call(this.updateAnnotation);
      await this.updateAxes().end();
    }

    // Draw in the path enter selection
    const linesEnter = linesUpdate.enter();
    if (!linesEnter.empty()) {
      const lines = linesEnter
        .append('g.line-container')
        .call(this.enterLineContainer)
        .call(this.updateLineContainer);
      const pointLabel = lines.select('g.point-label').style('opacity', 0);
      await lines.drawIn().end();
      pointLabel.fadeIn(); // No await so point labels fade in with annotations
    }

    // Fade in the annotations enter selection
    const annotationsEnter = annotationsUpdate.enter();
    if (!annotationsEnter.empty()) {
      await annotationsEnter
        .append('g.annotation')
        .call(this.enterAnnotation)
        .call(this.updateAnnotation)
        .fadeIn()
        .end();
    }
  }

  enterLineContainer(selection) {
    selection.attr('data-country', ary => ary[0].country);
    selection.append('path').attr('stroke', getLineColor)

    const endpoint = selection.append('g.point-label');
    endpoint.appendCircle(getLineColor);
    endpoint.makeText(getLineLabel, getLineColor)
  }

  updateLineContainer(selection) {
    const { xScale, yScale, makeLine } = this;
    const endpointX = ary => xScale(ary[ary.length - 1].dayNumber);
    const endpointY = ary => yScale(ary[ary.length - 1].cases);

    selection.select('path').at({ d: makeLine }); // Set path description

    const endpoint = selection.select('g.point-label'); // Position endpoint group
    endpoint.select('circle').at({ cx: endpointX, cy: endpointY });
    endpoint.selectAll('tspan').at({ x: endpointX, y: endpointY });
  }

  enterAnnotation(selection, i) {
    selection.filter(d => d.isSmall).classed('small-annotation', true);
    selection.filter(d => d.orientation === 'top').classed('orientation-top', true);

    const largeAnnotations = selection.filter(d => !d.isSmall);
    largeAnnotations.append('line.connector'); // Append a connector element

    // Create case count markers
    const caseCountContainer = largeAnnotations.filter(d => d.showCases)
      .append('g.case-count-container');
    caseCountContainer.append('line');
    caseCountContainer.makeText(formatCases);

    selection.appendCircle();
    selection.append('text.note-text') // Make the label
      .tspansBackgrounds(wrapAnnotation, LINE_HEIGHT);
  }

  updateAnnotation(selection, i) {
    const { xScale, yScale } = this;
    // Convenience functions for accessing x and y coordinates
    const getX = d => xScale(d.dayNumber);
    const getY = d => yScale(d.cases);

    const largeAnnotations = selection.filter(d => !d.isSmall);

    // Place connector
    largeAnnotations.select('line.connector')
      .at({ x1: getX, y1: getY, x2: getX, y2: d => getY(d) - CONNECTOR_LENGTH });

    // Make a case count y-intercept marker
    const caseCountContainer = largeAnnotations.filter(d => d.showCases)
      .select('g.case-count-container');
    caseCountContainer.select('line').at({ x1: getX, y1: getY, x2: 0, y2: getY });
    caseCountContainer.selectAll('tspan')
      .at({
        x: d => Math.min(getX(d) / 2, firstQuintile(xScale.range())),
        y: getY,
      })

    // Place the dot
    selection.select('circle').at({ cx: getX, cy: getY });

    // Place label
    selection.select('text.note-text')
      .at({ y: d => d.isSmall ? getY(d) : getY(d) - CONNECTOR_LENGTH })
      .each(bottomAlignText)
      .selectAll('tspan')
      .at({ x: d => getX(d.parent) })
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
    newYDomain[1] *= 1.1; // Leave some space at the top for labels

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
const us7 = { dayNumber: 7, label: 'Harvard, Cornell, Yale announces stuff', showCases: true };
const us8 = { dayNumber: 8, label: 'Princeton and Penn', isSmall: true };
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

const chartContainer = document.getElementById('chart-container');
chartContainer.setAttribute('data-index', 0);

function onStepEnter({ index }) {
  chartContainer.setAttribute('data-index', index);
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

// Bottom aligns a selection by translating up by total line height.
// Makes the assumption that large annotations are always top-oriented.
function bottomAlignText({ isSmall, orientation }) {
  const text = select(this);
  const numLines = text.selectAll('tspan').nodes().length / 2;
  let transY = -(numLines - 1) * LINE_HEIGHT;

  // Making small spacing adjustements
  if (isSmall) {
    if (orientation === 'top') transY -= 15; // Lift label above the point
    else transY = 11; // Label already hangs baseline, just push a tad more
  } else {
    transY -= 7; // Padd label from connector
  }

  text.translate([ 0, transY ]);
}

// Helper function to wrap annotation text
function wrapAnnotation(d) {
  return wordwrap(d.label, d.isSmall ? SMALL_LINE_WIDTH : LINE_WIDTH);
}

async function bulkFadeOutExiting(updateSelections) {
  await Promise.allSettled(
    updateSelections
      .map(s => s.exit()) // Get exit selections
      .filter(s => !s.empty()) // Remove empty ones
      .map(s => s.fadeOut().end()) // Fade them all out
  );
}