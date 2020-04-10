import textBalancer from 'text-balancer';
import './scripts/page';
import './scripts/lede';
import './scripts/scrollcolumbia';

// Text balance headline on mobile

if (window.innerWidth < 460)
  textBalancer.balanceText('.headline');
