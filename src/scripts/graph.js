import { scaleLinear, scaleTime } from 'd3-scale';
import { axisBottom, axisLeft } from 'd3-axis';
import { extent } from 'd3-array';
import { line as d3Line } from 'd3-shape';
import { select } from 'd3-selection';
import { timeFormat } from 'd3-time-format';
import { wordwrap } from 'd3-jetpack';
import { interpolatePath } from 'd3-interpolate-path';

import State from './state';
import { areDomainsEqual, firstQuintile, formatCaseCount } from './utils';
import { getLineLabel, getLineColor, getCountryColor } from './constants';

const INTERPOLATION_TIME = 1000;

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
  xField = 'dayNumber';

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
  timeLabel = this.svg
    .appendBackedText()
    .classed('time-label', true);

  // Axis generators
  makeXAxis = axisBottom().tickPadding(TICK_PADDING);
  makeYAxis = axisLeft().tickPadding(TICK_PADDING);

  // Line generator
  makeLine = d3Line();

  constructor(covidData) {
    super(covidData);
    this.resize();
  }

  async update(params) {

    let { shouldUpdateAnnotations, resized, willReplaceXAxis, dateBounds } = params;

    try {

      let domainsChanged = this.rescaleDataRange(params);

      // If update is being called from this.resize, interpolate existing elements
      if (resized === true) {
        domainsChanged = shouldUpdateAnnotations = resized;
      }

      const {
        linesContainer, annotationsContainer, yAxis, casesTitle, timeLabel,
        countries, annotations, data
      } = this;

      // Join countries data, store selections
      const linesUpdate = linesContainer
        .selectAll('g.line-container')
        .data(
          // Each <path> should be joined to a country's time-series COVID data (an array)
          countries.reduce((acc, country) => {
            const countryData = data.filter(d => d.country === country)
            const originalData = countryData.filter(d => d.dayNumber <= 16);
            originalData[0].showPointLabel = !dateBounds;
            acc.push(originalData);
            if (dateBounds) {
              const laterData = countryData.filter(d => d.dayNumber >= 16);
              laterData[0].showPointLabel = dateBounds;
              acc.push(laterData);
            }
            return acc;
          }, []),
          ary => ary[0].country,
        );

      // Join annotations data, store selections
      const annotationsUpdate = annotationsContainer
        .selectAll('g.annotation')
        .data(this.withCovidData(annotations), a => a.key);

      this.updateAnnotation = this.updateAnnotation.bind(this);
      this.updateLineContainer = this.updateLineContainer.bind(this);

      // If exiting selection is nonempty, fade those out first.
      if (domainsChanged) {
        await bulkFadeOutExiting([linesUpdate, annotationsUpdate]);
      } else {
        // If axes aren't animating, fade out at the same time as others fade in
        bulkFadeOutExiting([linesUpdate, annotationsUpdate]);
      }

      if (willReplaceXAxis) { // Change the x axis label
        timeLabel
          .fadeOut(false).end()
          .then(() => {
            timeLabel.selectAll('tspan').text(this.xFieldLabel);
            timeLabel.fadeIn();
          });
      }

      // Right after old point labels inside line containers exited,
      // fade in the new ones that are about to be animated/scaled
      linesUpdate.filter(ary => ary[0].showPointLabel).select('g.point-label').fadeIn(false);

      // If domains changed, interpolate existing elements (axes, existing lines
      // and annotations) simultaneously to match new data range
      if (domainsChanged) {
        linesUpdate.transition('lines')
          .duration(INTERPOLATION_TIME)
          .call(this.updateLineContainer);
        annotationsUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .call(this.updateAnnotation);
        await (await this.updateAxes(params)).end();

        const lastYTick = yAxis.select('.tick:last-child');
        casesTitle.transition().attr('transform', lastYTick.attr('transform'));
        timeLabel.transition().attr('transform', lastYTick.attr('transform'));
      } else if (shouldUpdateAnnotations) {
        annotationsUpdate.transition()
          .duration(INTERPOLATION_TIME)
          .call(this.updateAnnotation);
      }

      // After axes scaled but before new lines enter,
      // fade out existing unwanted point labels
      linesUpdate.filter(ary => !ary[0].showPointLabel).select('g.point-label').fadeOut(false);

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
    selection.attr('data-country', ary => ary[0].country);
    selection.append('path').at({ stroke: getLineColor });

    const endpoint = selection.append('g.point-label');
    endpoint.appendCircle(getLineColor);
    endpoint.append('text')
      .tspans(ary => wordwrap(getLineLabel(ary), 8), LINE_HEIGHT)
      .attr('fill', d => getLineColor(d.parent));
  }

  updateLineContainer(selection) {
    const { xScale, yScale, makeLine } = this;
    const endpointX = ary => xScale(ary[ary.length - 1][this.xField]);
    const endpointY = ary => yScale(ary[ary.length - 1].cases);

    // Set path description
    const path = selection.select('path');
    if (typeof path.attrTween === 'function') {
      path.attrTween('d', function(d) {
        const previousD = select(this).attr('d');
        const nextD = makeLine(d);
        return interpolatePath(previousD, nextD);
      });
    } else {
      path.at({ d: makeLine });
    }

    const endpoint = selection.select('g.point-label'); // Position endpoint group
    endpoint.select('circle').at({ cx: endpointX, cy: endpointY });

    const text = endpoint.select('text');
    (typeof text.selection === 'function' ? text.selection() : text)
      .tspans(ary => wordwrap(getLineLabel(ary), 8), LINE_HEIGHT);
    text.selectAll('tspan')
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
  async updateAxes({ willReplaceXAxis, showDates }) {
    const { xAxis, yAxis } = this;

    if (window.innerWidth < 460) {
      this.makeXAxis.ticks(3);
    }
    if (willReplaceXAxis && showDates) {
      this.makeXAxis.ticks(7);
    }

    if (willReplaceXAxis) {
      await xAxis.fadeOut(false).end();
      xAxis.call(this.makeXAxis);
      return xAxis.fadeIn();
    } else {
      xAxis.transition('x-axis')
        .duration(INTERPOLATION_TIME)
        .call(this.makeXAxis);
    }
    return yAxis.transition('y-axis')
      .duration(INTERPOLATION_TIME)
      .call(this.makeYAxis);
  }

  // Rescales mappings (scales, line generator) based on new data
  rescaleDataRange({ showDates, scaleYAxis, willReplaceXAxis = false }) {
    if (willReplaceXAxis) {
      this.xScale = (showDates ? scaleTime() : scaleLinear()).range([ 0, this.gWidth ]);
    }
    this.xField = showDates ? 'date' : 'dayNumber';

    const { xScale, yScale, makeLine, xField, data, gHeight, gWidth } = this;

    this.makeXAxis.scale(xScale).tickSize(-gHeight);
    this.makeYAxis.scale(yScale).tickSize(-gWidth);
    if (showDates) {
      this.makeXAxis.tickFormat(timeFormat('%b %_d'));
    } else {
      this.makeXAxis.tickFormat(x => x);
    }

    const newXDomain = extent(data, d => d[xField]);
    const newYDomain = extent(data, d => d.cases);

    if (scaleYAxis) {
      newYDomain[1] *= scaleYAxis;
    }
    newYDomain[1] *= 1.07; // Leave some space at the top for labels

    // Update scale domains while returning whether any had changed.
    // Plus sign is an eager OR
    const didDomainsChange = willReplaceXAxis +
      !areDomainsEqual(xScale.domain(), xScale.domain(newXDomain).domain()) +
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

    // Re-translate x-axis container
    this.svg.select('g.axis.x-axis').translate([ 0, this.gHeight ]);

    // "Confirmed cases" label
    this.casesTitle.selectAll('tspan').at({ x: 15 });
    // "(Days since 100th case | Date) ➡️" label
    this.timeLabel
      .selectAll('tspan')
      .text(this.xFieldLabel)
      .at({ x: this.gWidth / 2})


    this.update({ resized: true });
  }

  get xFieldLabel() {
    const label = { 'date': 'Date', 'dayNumber': 'Days since a country\'s 100th case' };
    return label[this.xField] + ' ⟶';
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