import textBalancer from 'text-balancer';
import 'intersection-observer';
import './scripts/d3-wrappers';
import './scripts/page';

// Text balance headline on mobile
if (window.innerWidth < 460) {
  textBalancer.balanceText('.headline');
}
