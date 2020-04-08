import { select } from 'd3-selection';
import 'core-js/stable';
import 'regenerator-runtime/runtime';
/**
 * D3 selection helper functions
 */

const FADE_TIME = 300;
const INTERPOLATION_TIME = 800;
const DRAW_TIME = 1050;

// Fades in a selection; returns the transition
function fadeIn(selection) {
  return selection.style('opacity', 0)
    .transition()
      .duration(FADE_TIME)
      .style('opacity', 1);
}

// Fades out a selection; returns the transition
function fadeOut(selection, debug) {
  if (debug)
    console.log('fadeOut', selection)
  return selection.transition()
    .duration(FADE_TIME)
    .style('opacity', 0)
    .remove();
}

// Draws in a path selection; returns the transition
function drawIn(path) {
  if (path.empty())
    return;

  const node = path.node();
  if (node.tagName !== 'path')
    throw 'drawIn can only act on paths, but you passed in a: ' + path.tagName;

  const totalLength = node.getTotalLength();
  return path
    .attr('stroke-dasharray', totalLength + ' ' + totalLength)
    .attr('stroke-dashoffset', totalLength)
    .transition()
      .duration(DRAW_TIME)
      // .ease('linear')
      .attr('stroke-dashoffset', 0);
}

// Checks if two domains are equal
function areDomainsEqual(d1, d2) {
  const [ a1, b1 ] = d1;
  const [ a2, b2 ] = d2;
  return Math.abs(1 - (b1 - a1) / (b2 - a2)) < 0.001;
}

// Nests a series of transitions as callbacks of the previous one
function chainTransitions2(...transitions) {
  const transitionFns = transitions.filter(t => t);

  if (transitionFns.length === 0)
    return () => undefined;
  console.log(transitionFns)

  // Default callback is the last transition
  let callback = null;
  let i = transitionFns.length;
  while (--i >= 0) {
    if (callback === null) {
      callback = transitionFns[i];
      continue;
    }

    console.log(transitionFns[i], typeof transitionFns[i])
    callback = () => {
      transitionFns[i]().on('end', callback);
    };
  }

  // Continuously use callback as callback for the previous transition
  // for (let i = transitionFns.length - 2; i >= 0; i--)
    // callback = () => transitionFns[i]().on('end', transitionFns[i + 1]);

  return callback;
}

async function chainTransitions1(...transitions) {
  for (const transition of transitions)
    await transition(-1).end();
  console.log('the end');
}

function chainTransitions(...transitions) {
  let p = Promise.resolve(); // Q() in q

  transitions.forEach((transition, i) => {
    console.log(transition)
    p = p.then(() => transition(i).end())
  });
  // transitions[0](0).end().then(() => transitions[1](1));
  console.log('the end');
}

const genericTransition = duration => select({}).transition().duration(duration);

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

// @TODO: TRY USING TRANSITION.END (A PROMISE)

module.exports = {
  fadeIn, fadeOut, drawIn,
  areDomainsEqual,
  chainTransitions, genericTransition,
  annotationWithKey,
  isBetween,
  firstQuintile,
  INTERPOLATION_TIME, FADE_TIME, DRAW_TIME
};
