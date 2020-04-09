/**
 * D3 selection helper functions
 */

const FADE_TIME = 300;
const INTERPOLATION_TIME = 800;
const DRAW_TIME = 1200;

// Fades in a selection; returns the transition
function fadeIn(selection) {
  return selection.style('opacity', 0)
    .transition()
      .duration(FADE_TIME)
      .style('opacity', 1);
}

// Fades out a selection; returns the transition
function fadeOut(selection) {
  return selection.transition()
    .duration(FADE_TIME)
    .style('opacity', 0)
    .remove();
}

// Draws in a path and circle/label of a line container
function drawIn(selection) {
  const path = selection.select('path');
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

// Checks if two domains are CLOSE ENOUGH, because this function is only used
// to determine whether axes/scales should be reset and rerendered.
const areDomainsEqual = (d1, d2) =>
  Math.abs(1 - (d1[1] - d1[0]) / (d2[1] - d2[0])) < 0.001;

// Adds a key to an annotation object
// TODO: Here a second country = US assumption is made. Lift it up/make it more obvious?
const annotationWithKey = ({ country = 'US', dayNumber, ...rest }) => ({
  key: country + '-' + dayNumber,
  country,
  dayNumber,
  ...rest,
});

// Returns true if a <= x < b
const isBetween = (x, [ a, b ]) => typeof x === 'number' && x >= a && x < b;

// Returns first quintile in a range,
// Just positions case count label nicely.
const firstQuintile = ([ a, b ]) => a + (b - a) * 0.2;

const thousandsCommas = number => {
  if (number < 1000)
    return number;
  return Math.floor(number / 1000) + ',' + number % 1000;
};

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


module.exports = {
  fadeIn, fadeOut, drawIn,
  areDomainsEqual,
  annotationWithKey,
  isBetween,
  firstQuintile,
  thousandsCommas,
  tspansBackgrounds,
  INTERPOLATION_TIME,
};
