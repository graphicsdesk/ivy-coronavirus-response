/**
 * Convenience wrappers for d3
 */

import { selection } from 'd3-selection';
import { transition } from 'd3-transition';

selection.prototype.tspansBackgrounds = tspansBackgrounds;
selection.prototype.appendCircle = appendCircle;
selection.prototype.makeText = makeText;
selection.prototype.fadeIn = fadeIn;
selection.prototype.fadeOut = fadeOut;
selection.prototype.drawIn = drawIn;
selection.prototype.hackyInsert = hackyInsert;

transition.prototype.classed = selection.prototype.classed;

// Append circle and set radius.
const RADIUS = 6;
function appendCircle(color) {
  const circle = this.append('circle').attr('r', RADIUS);
  if (color) circle.at({ fill: color, stroke: color });
  return circle;
}

// Same as d3-jetpack/src/tspans, but adds background tspans
function tspansBackgrounds(lines, lh) {
  const that = this;
  that.selectAll('tspan')
    .data(function(d) {
      const linesAry = typeof lines === 'function' ? lines(d) : lines;
      return linesAry.reduce((acc, line) => {
        const datum = { line, parent: d, numLines: linesAry.length };
        acc.push({ ...datum, isBackground: true });
        acc.push(datum);
        return acc;
      }, []);
    })
    .join(
      enter => enter.append('tspan'),
      update => update,
      exit => exit.remove(),
    )
    .text(function(d) { return d.line; })
    .attr('dy', ({ parent, line, isBackground }, i) => {
      if (i < 2 || !isBackground)
        return 0;
      return typeof lh === 'function' ? lh(parent, line) : lh;
    })
    .classed('background-text', d => d.isBackground);
  return this;
}

// Adds text with one backgrounded tspan
function makeText(textFn, colorFn) {
  const text = this.append('text');
  text.append('tspan.background-text');
  const tspan = text.append('tspan');
  if (colorFn)
    tspan.style('fill', colorFn);
  if (textFn)
    text.selectAll('tspan').text(textFn);
}

// Fades in a selection; returns the transition
const FADE_TIME = 300;
function fadeIn() {
  return this.style('opacity', 0)
    .transition()
      .duration(FADE_TIME)
      .style('opacity', 1);
}

// Fades out a selection; returns the transition
function fadeOut() {
  return this.transition()
    .duration(FADE_TIME)
    .style('opacity', 0)
    .remove();
}

// Draws in the path of a line container
const DRAW_TIME = 1200;
function drawIn() {
  const path = this.select('path');
  const node = path.node();
  if (node.tagName !== 'path')
    throw 'drawIn can only act on paths, but you passed in a: ' + path.tagName;

  const totalLength = node.getTotalLength();
  return path
    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition()
      .duration(DRAW_TIME)
      .attr('stroke-dashoffset', 0);
}

// Insert if Italy. Append otherwise
function hackyInsert(selector) {
  const that = this;
  return that.append(selector);
  return that.each(function(ary) {
    if (ary[0].country === 'Italy') {
      that.insert(selector, ':first-child');
    } else {
      that.append(selector);
    }
  })
  return that.selectAll(selector);
}