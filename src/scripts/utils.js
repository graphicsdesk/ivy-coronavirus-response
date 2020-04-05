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

module.exports = { fadeIn, fadeOut, INTERPOLATION_TIME, areDomainsUnequal };