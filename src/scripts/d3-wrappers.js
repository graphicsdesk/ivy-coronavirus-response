/**
 * Convenience wrappers for d3
 */

import { selection } from 'd3-selection';
import { transition } from 'd3-transition';

selection.prototype.tspansBackgrounds = tspansBackgrounds;
selection.prototype.appendCircle = appendCircle;
selection.prototype.appendBackedText = appendBackedText;
selection.prototype.fadeIn = fadeIn;
selection.prototype.fadeOut = fadeOut;
selection.prototype.drawIn = drawIn;

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
function appendBackedText(textFn, colorFn) {
  const text = this.append('text');
  text.append('tspan.background-text');
  const tspan = text.append('tspan');
  if (colorFn)
    tspan.style('fill', colorFn);
  if (textFn)
    text.selectAll('tspan').text(textFn);
  return text;
}

// Fades in a selection; returns the transition
const FADE_TIME = 300;
function getTransitionName(that) {
  that.data()[0] ? that.data()[0].country + 'fade' : 'fade'
}

function fadeIn() {
  return this.style('opacity', 0).transition('fade')
    .duration(FADE_TIME)
    .style('opacity', 1);
}

// Fades out a selection; returns the transition
function fadeOut(removeAfter = true) {
  let trans = this.transition('fade')
    .duration(FADE_TIME)
    .style('opacity', 0);
  if (removeAfter)
    trans = trans.remove();
  return trans;
}

// Draws in the path of a line container. Prereq: correctDashLength
const DRAW_TIME = 1200;
function drawIn() {
  const path = this.select('path');
  const totalLength = getPathLength(path);
  return path
    .attr('stroke-dasharray', totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition('lines-draw')
      .duration(DRAW_TIME)
      .attr('stroke-dashoffset', 0);
}

// Gets path length of a path
function getPathLength(pathNode) {
  if (!isElement(pathNode))
    pathNode = pathNode.node();
  if (pathNode === null)
    return;
  if (pathNode.tagName !== 'path')
    throw 'getPathLength can only act on paths, but you passed in a: ' + pathNode.tagName;

  return pathNode.getTotalLength();
}

// Checks if an element is a DOM object
// Source: https://stackoverflow.com/a/36894871
function isElement(element) {
    return element instanceof Element || element instanceof HTMLDocument;
}
