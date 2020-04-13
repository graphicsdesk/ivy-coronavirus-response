import textBalancer from 'text-balancer';
import 'intersection-observer';
import './scripts/d3-wrappers';

import lede from './scripts/lede';
import columbia from './scripts/scrollcolumbia';
import debounce from './scripts/underscore-debounce';
import './scripts/page';

window.addEventListener(
  'resize',
  debounce(() => {
    lede.handleResize();
    columbia.handleResize();
  }, 200),
);

function init() {
  lede.init();
  columbia.init();
}

init();

// Text balance headline on mobile
if (window.innerWidth < 460) {
  textBalancer.balanceText('.headline');
}
