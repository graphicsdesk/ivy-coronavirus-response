/**
 * Convenience wrappers for d3
 */

import { selection } from 'd3-selection';

selection.prototype.tspansBackgrounds = tspansBackgrounds;
selection.prototype.appendCircle = appendCircle;
selection.prototype.makeText = makeText;

// Append circle and set radius.
const RADIUS = 6;
function appendCircle(color) {
  const circle = this.append('circle').attr('r', RADIUS);
  if (color) circle.at({ fill: color, stroke: color });
  return circle;
}

// Same as d3-jetpack/src/tspans, but adds background tspans
function tspansBackgrounds(lines, lh) {
  return this.selectAll('tspan')
    .data(function(d) {
      const linesAry = typeof lines === 'function' ? lines(d) : lines;
      return linesAry.reduce((acc, line) => {
        const datum = { line, parent: d, numLines: linesAry.length };
        acc.push({ ...datum, isBackground: true });
        acc.push(datum);
        return acc;
      }, []);
    })
    .enter()
  .append('tspan')
    .text(function(d) { return d.line; })
    .attr('dy', ({ parent, line, isBackground }, i) => {
      if (i < 2 || !isBackground)
        return 0;
      return typeof lh === 'function' ? lh(parent, line) : lh;
    })
    .filter(d => d.isBackground)
    .classed('background-text', true)
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