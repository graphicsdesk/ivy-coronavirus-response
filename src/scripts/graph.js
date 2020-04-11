import { scaleLinear, scaleTime } from 'd3-scale';
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
const CONNECTOR_LENGTH = 120;
const SMALL_LINE_WIDTH = 10;
const LINE_WIDTH = 15;
const LINE_HEIGHT = 23;

const margin = { top: 70, right: 80, bottom: 30 + TICK_PADDING, left: 50 + TICK_PADDING };

class Graph extends State {

  width = null;
  height = null;
  gWidth = null;
  gHeight = null;

  // Create scales; we only know range right now
  xScale = scaleLinear();
  yScale = scaleLinear();

  // Create SVG and the main group for margins
  svg = select('#chart-container')
    .append('svg')
    .append('g')
    .translate([ margin.left, margin.top ]);

  // Create axis container, other containers
  xAxis = this.svg.append('g.axis.x-axis');
  yAxis = this.svg.append('g.axis.y-axis');
  linesContainer = this.svg.append('g.lines-container');
  annotationsContainer = this.svg.append('g.annotations-container');

  // Labelling axes
  casesTitle = this.svg
    .appendBackedText('Confirmed cases')
    .classed('confirmed-cases-title', true);

  // Axis generators
  makeXAxis = axisBottom().tickPadding(TICK_PADDING);
  makeYAxis = axisLeft().tickPadding(TICK_PADDING);

  // Line generator
  makeLine = d3Line();

  constructor(covidData) {
    super(covidData);
    this.resize();
  }

  async update({ shouldUpdateAnnotations, scaleYAxis, resized, showDates, willReplaceXAxis }) {

    try {

      let domainsChanged = this.rescaleDataRange({ showDates, scaleYAxis });

      // If update is being called from this.resize, interpolate existing elements
      if (resized === true) {
        domainsChanged = shouldUpdateAnnotations = resized;
      }

      const {
        linesContainer, annotationsContainer, yAxis, casesTitle,
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
        linesUpdate.transition('lines')
          .duration(INTERPOLATION_TIME)
          .call(this.updateLineContainer);
        annotationsUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .call(this.updateAnnotation);
        await this.updateAxes({ willReplaceXAxis }).end();

        const lastYTick = yAxis.select('.tick:last-child');
        casesTitle.transition().duration(600).attr('transform', lastYTick.attr('transform'));
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
          .call(this.updateLineContainer, true);
        const pointLabel = lines.select('g.point-label').style('opacity', 0);
        await lines.drawIn().end();
        pointLabel.fadeIn(); // No await so point labels fade in with annotations

        // After draw in, reset dash length so axes transitions don't mess up lines
        lines.select('path').attr('stroke-dasharray', 0);
      }

      // Fade in the annotations enter selection
      const annotationsEnter = annotationsUpdate.enter();
      await annotationsEnter
        .append('g.annotation')
        .call(this.enterAnnotation)
        .call(this.updateAnnotation, true)
        .fadeIn()
        .end();

    } catch (error) {
      // Usually a transition was cancelled or interrupted. This can happen
      // when another transition of the same name (current transitions are
      // all unnamed) starts on the same element.
      const { data, transition } = error;
      if (data && transition) {
        console.error('Transition', transition._name, 'was interrupted. Data:', data);
      } else {
        console.error(error);
      }
    }
  }

  enterLineContainer(selection) {
    const PATH_LEN = 100;
    selection.attr('data-country', ary => ary[0].country);
    selection.append('path').at({ stroke: getLineColor });

    const endpoint = selection.append('g.point-label');
    endpoint.appendCircle(getLineColor);
    endpoint.append('text')
      .tspans(ary => wordwrap(getLineLabel(ary), 8), LINE_HEIGHT)
      .attr('fill', d => getLineColor(d.parent));
  }

  updateLineContainer(selection, justEntered) {
    const { xScale, yScale, makeLine } = this;
    const endpointX = ary => xScale(ary[ary.length - 1][this.xField]);
    const endpointY = ary => yScale(ary[ary.length - 1].cases);

    // Set path description
    selection.select('path').at({ d: makeLine });

    const endpoint = selection.select('g.point-label'); // Position endpoint group
    endpoint.select('circle').at({ cx: endpointX, cy: endpointY });
    endpoint.selectAll('tspan')
      .at({ x: d => endpointX(d.parent) + 14, y: d => endpointY(d.parent) });
  }

  enterAnnotation(selection) {
    selection.append('line.connector')

    // Create case count markers
    const caseCountContainer = selection
      .append('g.case-count-container');
    caseCountContainer.append('line');
    caseCountContainer.appendBackedText(formatCaseCount);

    selection.appendCircle(getCountryColor);
    selection.append('text.note-text'); // Make the label
  }

  updateAnnotation(selection) {
    // Things for CSS
    selection.classed('small-annotation', d => d.isSmall);
    selection.classed('hide-cases', d => d.isSmall && d.showCases !== true);
    selection.classed('orientation-top', d => d.orientTop);
    selection.classed('hide-on-mobile', d => d.hideOnMobile);
    selection.attr('data-label', d => d.label)

    const { xScale, yScale } = this;
    const getX = d => xScale(d[this.xField]);
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
    const noteText = selection.select('text.note-text').at({ x: getX });
    (noteText.selection ? noteText.selection() : noteText).tspansBackgrounds(wrapAnnotation, LINE_HEIGHT);
    noteText
      .at({ y: function(d) { return getY(d) + bottomAlignAdjust.call(this, d); } })
      .selectAll('tspan')
      .at({ x: d => getX(d.parent) });
  }

  // TODO: make axes prettier. https://observablehq.com/@d3/styled-axes
  updateAxes({ willReplaceXAxis }) {
    const { xAxis, yAxis, xScale, yScale, gHeight, gWidth } = this;

    if (this.makeXAxis === null)
      this.makeXAxis = axisBottom().tickSize(-gHeight);;
    if (this.makeYAxis === null)
      this.makeYAxis = axisLeft().tickSize(-gWidth);;
    // this.makeXAxis = axisBottom(xScale).tickSize(-gHeight);
    // this.makeYAxis = axisLeft(yScale).tickSize(-gWidth);
    this.makeXAxis.scale(xScale).tickSize(-gHeight);
    this.makeYAxis.scale(yScale).tickSize(-gWidth);

    if (window.innerWidth < 460) {
      this.makeXAxis.ticks(4);
    }

    if (willReplaceXAxis) {
      xAxis.call(this.makeXAxis.tickPadding(TICK_PADDING))
    } else {
      xAxis.transition('x-axis')
        .duration(INTERPOLATION_TIME)
        .call(this.makeXAxis.tickPadding(TICK_PADDING));
    }
    return yAxis.transition('y-axis')
      .duration(INTERPOLATION_TIME)
      .call(this.makeYAxis.tickPadding(TICK_PADDING));
  }

  // Rescales mappings (scales, line generator) based on new data
  rescaleDataRange({ showDates, scaleYAxis }) {
    this.xScale = (showDates ? scaleTime() : scaleLinear()).range([ 0, this.gWidth ]);
    this.xField = showDates ? 'date' : 'dayNumber';

    const { xScale, yScale, makeLine, xField, data } = this;

    const newXDomain = extent(data, d => d[xField]);
    const newYDomain = extent(data, d => d.cases);

    if (scaleYAxis) {
      newYDomain[1] *= scaleYAxis;
    }
    newYDomain[1] *= 1.07; // Leave some space at the top for labels

    // Update scale domains. Returns whether domains had changed.
    // Plus sign is an eager (non-short-circuiting) OR
    const didDomainsChange = !areDomainsEqual(xScale.domain(), xScale.domain(newXDomain).domain()) +
      !areDomainsEqual(yScale.domain(), yScale.domain(newYDomain).domain());

    // Updates line generator based on new scales
    if (didDomainsChange) {
      makeLine.x(d => xScale(d[xField])).y(d => yScale(d.cases));
    }

    return didDomainsChange;
  }

  resize() {
    this.width = Math.min(960, document.body.clientWidth);
    this.height = document.body.clientHeight;
    this.gWidth = this.width - margin.left - margin.right;
    this.gHeight = this.height - margin.top - margin.bottom;

    // Reset scale ranges
    this.xScale.range([ 0, this.gWidth ]);
    this.yScale.range([ this.gHeight, 0 ]);

    // Reset svg dimensions and margins (not yet margins)
    select('#chart-container')
      .select('svg')
      .at({ width: this.width, height: this.height })
      // .select('g')
      // .translate([ margin.left, margin.top ]);

    // Re-translate x-axis container
    this.svg.select('g.axis.x-axis').translate([ 0, this.gHeight ]);

    // Axis stuff
    this.makeXAxis.tickSize(-this.gHeight);
    this.makeYAxis.tickSize(-this.gHWidth);

    // Axis labels
    this.casesTitle.selectAll('tspan').at({ x: 15 });

    this.update({ resized: true });
  }
}

// Bottom aligns a selection by translating up by total line height.
// Makes the assumption that large annotations are always top-oriented.
function bottomAlignAdjust({ isSmall, orientTop }) {
  const text = select(this);
  const numLines = text.selectAll('tspan').nodes().length / 2;
  let transY = -(numLines - 1) * LINE_HEIGHT;

  // Making small spacing adjustements
  if (isSmall) {
    if (orientTop) transY -= 16; // Lift label above the point
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