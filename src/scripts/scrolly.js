/**
 * This file is where the actual scrolling and graphing happens.
 */

import scrollama from 'scrollama';
import Graph from './graph';
import covidData from '../../data/covid.json';

/**
 * Preprocess data
 */

for (let i = 0; i < covidData.length; i++)
  covidData[i].date = new Date(covidData[i].date);

/**
 * Instantiate graph, write states
 */

const graph = new Graph(covidData);

// Storing annotations for convenience
const us7 = { dayNumber: 7, label: 'Harvard, Cornell, Yale announces stuff', showCases: true, orientation: 'bottom' };
const us7Small = { dayNumber: 7, label: 'Harvard, Cornell, Yale', isSmall: true, orientation: 'bottom' };
const us8 = { dayNumber: 8, label: 'Princeton and Penn', isSmall: true };
const us9 = { dayNumber: 9, label: 'Dartmouth and Brown', isSmall: true, orientation: 'top' };
const columbia = { dayNumber: 12, label: 'Columbia', showCases: true };
const columbiaSmall = { dayNumber: 12, label: 'Columbia', isSmall: true, orientation: 'top' };
const ivies = { dayNumber: 8.375, label: 'Ivy average' };
const iviesSmall = { dayNumber: 8.375, label: 'Ivy average', isSmall: true };
const china = { dayNumber: 8, label: 'China tk', country: 'China', showCases: true, };
const chinaSmall = { dayNumber: 8, label: 'China tk', country: 'China', showCases: true, };
const korea = { dayNumber: 2, label: 'South Korea tk', country: 'Korea, South', showCases: true};
const italy = { dayNumber: 11, label: 'Italy tk', country: 'Italy', showCases: true};

const ZOOM_FACTOR = 1;

const allStates = [
  { countries: [ 'US' ] },
  { annotations: [ us7 ], countries: [ 'US' ] },
  { annotations: [ us7, us8, us9, columbia ], countries: [ 'US' ] },
  { annotations: [ ivies, us7Small, us8, us9, columbiaSmall ], countries: [ 'US' ] },
  { annotations: [ iviesSmall, columbiaSmall, china ], countries: [ 'US', 'China' ] },
  { annotations: [ iviesSmall, columbiaSmall, chinaSmall, korea ], countries: [ 'US', 'China', 'Korea, South' ] }
  // { annotations: [ iviesSmall, columbiaSmall, china, korea, italy ], countries: [ 'US', 'China', 'Korea, South', 'Italy' ], scaleYAxis: ZOOM_FACTOR + 0.05 },
];

graph.update();

/**
 * Scroll step triggers
 */

const chartContainer = document.getElementById('chart-container');

chartContainer.setAttribute('data-index', 0);
function onStepEnter({ index }) {
  chartContainer.setAttribute('data-index', index);
  if (allStates[index] !== undefined)
    graph.set(allStates[index]);
}

function onStepExit({ index, direction }) {
}

// Instantiate the scrollama
const scroller = scrollama();

// Setup the instance, pass callback functions
scroller
  .setup({
    step: '.step',
    offset: 0.65,
  })
  .onStepEnter(onStepEnter)
  .onStepExit(onStepExit);

/**
 * Window event listeners
 */

window.addEventListener('resize', () => {
  scroller.resize();
});
