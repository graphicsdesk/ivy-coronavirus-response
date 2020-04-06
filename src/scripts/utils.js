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
  const transitionFns = transitions.reduce((acc, [ fn, shouldRun ]) => {
    if (shouldRun)
      acc.push(fn);
    return acc;
  }, []);

  // Default callback is the last transition
  let callback = transitionFns[transitionFns.length - 1];

  // Continuously use callback as callback for the previous transition
  for (let i = transitionFns.length - 2; i >= 0; i--)
    callback = () => transitionFns[i]().on('end', transitionFns[i + 1]);

  return callback;
}

module.exports = { fadeIn, fadeOut, INTERPOLATION_TIME, areDomainsUnequal, chainTransitions };