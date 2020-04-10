import textBalancer from 'text-balancer';

import { handleResize as ledeResize } from './scripts/lede';
import { handleResize as columbiaResize } from './scripts/scrollcolumbia';
import debounce from './scripts/underscore-debounce';
import './scripts/page';

window.addEventListener(
  'resize',
  debounce(() => {
    ledeResize();
    columbiaResize();
  }, 200),
);

// Text balance headline on mobile
if (window.innerWidth < 460) {
  textBalancer.balanceText('.headline');
}
