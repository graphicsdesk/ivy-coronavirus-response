/**
 * D3 selection helper functions
 */

const INTERPOLATION_TIME = 800;
const DRAW_TIME = 1200;

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

const formatCases = ({ cases }) => {
  let output = cases;
  if (cases >= 1000)
    output = Math.floor(cases / 1000) + ',' + cases % 1000;
  return output + ' cases';
};

module.exports = {
  drawIn,
  areDomainsEqual,
  annotationWithKey,
  isBetween,
  firstQuintile,
  formatCases,
  INTERPOLATION_TIME,
};
