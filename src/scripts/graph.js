import { scaleLinear } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import { wordwrap } from 'd3-jetpack';
import 'intersection-observer';

import State from './state';
import { areDomainsEqual, firstQuintile, formatCaseCount } from './utils';
import { getLineLabel, getLineColor, getCountryColor } from './constants';
import './d3-wrappers';

const INTERPOLATION_TIME = 800;

/**
 * The Graph class draws and updates the visualization's DOM elements
 */

const TICK_PADDING = 12;
const CONNECTOR_LENGTH = 100;
const SMALL_LINE_WIDTH = 10;
const LINE_WIDTH = 15;
const LINE_HEIGHT = 23;

const margin = { top: 20, right: 20, bottom: 30 + TICK_PADDING, left: 50 + TICK_PADDING };

class Graph extends State {

  width = Math.min(800, document.body.clientWidth);
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

  async update(shouldUpdateAnnotations, shouldUpdateCountries, scaleYAxis) {
    const domainsChanged = this.rescaleDataRange(scaleYAxis);

    const {
      linesContainer, annotationsContainer,
      countries, annotations, data
    } = this;

    // Join countries data, store selections
    const linesUpdate = linesContainer
      .selectAll('g.line-container')
      .data(
        // Each <path> should be joined to a country's time-series COVID data (an array)
        countries.map(country => data.filter(d => d.country === country)),
        ary => ary[0].country,
      );

    // Join annotations data, store selections
    const annotationsUpdate = annotationsContainer
      .selectAll('g.annotation')
      .data(this.withCovidData(annotations), a => a.key);

    this.updateAnnotation = this.updateAnnotation.bind(this);
    this.updateLineContainer = this.updateLineContainer.bind(this);

    // If exiting selection is nonempty, fade those out first.
    if (domainsChanged)
      await bulkFadeOutExiting([ linesUpdate, annotationsUpdate ]);
    else
      bulkFadeOutExiting([ linesUpdate, annotationsUpdate ]);

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
    } else if (shouldUpdateAnnotations) {
      annotationsUpdate.transition()
        .duration(INTERPOLATION_TIME)
        .call(this.updateAnnotation);
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
    await annotationsEnter
      .append('g.annotation')
      .call(this.enterAnnotation)
      .call(this.updateAnnotation, true)
      .fadeIn()
      .end();
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

  enterAnnotation(selection) {
    selection.append('line.connector')

    // Create case count markers
    const caseCountContainer = selection.filter(d => !d.isSmall && d.showCases)
      .append('g.case-count-container');
    caseCountContainer.append('line');
    caseCountContainer.makeText(formatCaseCount);

    selection.appendCircle(getCountryColor);
    selection.append('text.note-text'); // Make the label
  }

  updateAnnotation(selection) {
    selection.classed('small-annotation', d => d.isSmall);
    selection.classed('orientation-top', d => d.orientation === 'top');

    const { xScale, yScale } = this;
    const getX = d => xScale(d.dayNumber);
    const getY = d => yScale(d.cases);

    selection.select('line.connector')
      .at({ x1: getX, y1: getY, x2: getX, y2: d => getY(d) - (!d.isSmall && CONNECTOR_LENGTH) });

    // Make a case count y-intercept marker
    const caseCountContainer = selection.select('g.case-count-container');
    caseCountContainer.select('line').at({ x1: getX, y1: getY, x2: 0, y2: getY });
    caseCountContainer.selectAll('tspan')
      .at({
        x: d => Math.min(getX(d) / 2, firstQuintile(xScale.range())),
        y: getY,
      })

    // Place the dot
    selection.select('circle').at({ cx: getX, cy: getY });

    // Place label
    const noteText = selection.select('text.note-text').at({ x: d => getX(d) });
    (noteText.selection ? noteText.selection() : noteText).tspansBackgrounds(wrapAnnotation, LINE_HEIGHT);
    noteText
      .at({ y: function(d) { return getY(d) + bottomAlignAdjust.call(this, d); } })
      .selectAll('tspan')
      .at({ x: d => getX(d.parent) });
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
  rescaleDataRange(scaleYAxis) {
    const { xScale, yScale, makeLine } = this;

    const newXDomain = extent(this.data, d => d.dayNumber);
    const newYDomain = extent(this.data, d => d.cases);
    if (scaleYAxis)
      newYDomain[1] *= scaleYAxis;
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

// Bottom aligns a selection by translating up by total line height.
// Makes the assumption that large annotations are always top-oriented.
function bottomAlignAdjust({ isSmall, orientation }) {
  const text = select(this);
  const numLines = text.selectAll('tspan').nodes().length / 2;
  let transY = -(numLines - 1) * LINE_HEIGHT;

  // Making small spacing adjustements
  if (isSmall) {
    if (orientation === 'top') transY -= 16; // Lift label above the point
    else transY = 28; // Label already hangs baseline, just push a tad more
  } else {
    transY -= CONNECTOR_LENGTH + 7; // Pad label from connector
  }

  return transY;
}

// Helper function to wrap annotation text
function wrapAnnotation(d) {
  return wordwrap(d.label, d.isSmall ? SMALL_LINE_WIDTH : LINE_WIDTH);
}

// Fade out all exiting selections in an array of update selection
async function bulkFadeOutExiting(updateSelections) {
  await Promise.allSettled(
    updateSelections
      .map(s => s.exit()) // Get exit selections
      .filter(s => !s.empty()) // Remove empty ones
      .map(s => s.fadeOut().end()) // Fade them all out
  );
}

export default Graph;
