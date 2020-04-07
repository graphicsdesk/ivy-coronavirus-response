/**
 * D3 selection helper functions
 */

const FADE_TIME = 300;
const INTERPOLATION_TIME = 800;

function fadeIn(selection) {
  return selection.attr('opacity', 0)
    .transition()
      .duration(FADE_TIME)
      .attr('opacity', 1);
}

function fadeOut(selection) {
  return selection.transition()
    .duration(FADE_TIME)
    .attr('opacity', 0)
    .remove();
}

// Checks if two domains are equal
function areDomainsUnequal(d1, d2) {
  return d1[0] !== d2[0] || d1[1] !== d2[1];
}

// Nests a series of transitions as callbacks of the previous one
function chainTransitions(...transitions) {
  const transitionFns = transitions.filter(t => t);

  if (transitionFns.length === 0)
    return () => undefined;

  // Default callback is the last transition
  let callback = transitionFns[transitionFns.length - 1];

  // Continuously use callback as callback for the previous transition
  for (let i = transitionFns.length - 2; i >= 0; i--)
    callback = () => transitionFns[i]().on('end', transitionFns[i + 1]);

  return callback;
}

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

module.exports = {
  fadeIn, fadeOut,
  areDomainsUnequal,
  chainTransitions,
  annotationWithKey,
  isBetween,
  firstQuintile,
  INTERPOLATION_TIME,
};
