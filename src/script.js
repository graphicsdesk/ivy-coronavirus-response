import textBalancer from 'text-balancer';

import './scripts/page'; // Scripts for Arc pages (e.g. article hoisting)
import './scripts/lede'; // Instantiates and controls lede interactive
import './scripts/scrollcolumbia'; // ai2html Columbia scrolly grpahic

// Text balance headline on mobile
if (window.innerWidth < 460) {
  textBalancer.balanceText('.headline');
}
