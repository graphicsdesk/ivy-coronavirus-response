/**
 * This file is where the actual scrolling and graphing happens.
 */

import scrollama from 'scrollama/src/init.js';
import Graph from './graph';
import { COUNTRY_COLORS } from './constants';
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
const us7 = { dayNumber: 7, label: 'Harvard, Cornell, Yale announces stuff', showCases: true };
const us7Small = { dayNumber: 7, label: 'Harvard, Cornell, Yale', isSmall: true, orientation: 'top' };
const us8 = { dayNumber: 8, label: 'Princeton and Penn', isSmall: true };
const us9 = { dayNumber: 9, label: 'Dartmouth and Brown', isSmall: true, orientation: 'top' };
const columbia = { dayNumber: 12, label: 'Columbia', showCases: true };
const columbiaSmall = { dayNumber: 12, label: 'Columbia', isSmall: true, orientation: 'top' };
const columbiaSmallBtm = { dayNumber: 12, label: 'Columbia', isSmall: true, orientation: 'bottom' };
const ivies = { dayNumber: 8.375, label: 'Ivy average' };
const iviesSmall = { dayNumber: 8.375, label: 'Ivy average', isSmall: true, orientation: 'top' };
const iviesSmallBtm = { dayNumber: 8.375, label: 'Ivy average', isSmall: true, orientation: 'bottom' };
const china = { dayNumber: 8, label: 'China tk', country: 'China', showCases: true, };
const chinaSmall = { dayNumber: 8, label: 'China tk', country: 'China', showCases: false, isSmall: true, orientation: 'top' };
const korea = { dayNumber: 2, label: 'South Korea tk', country: 'Korea, South', showCases: true };
const koreaSmall = { dayNumber: 2, label: 'South Korea tk', country: 'Korea, South', showCases: false, isSmall: true, orientation: 'top' };
const italy = { dayNumber: 11, label: 'Italy tk', country: 'Italy', showCases: true};

const ZOOM_FACTOR = 0.35;
const allStates = [
  // { countries: [ 'US', 'China', 'Korea, South', 'Italy' ], xBounds: [0, 30] },
  // { countries: [ 'US', 'China', 'Korea, South', 'Italy' ] },
  { countries: [ 'US' ] },
  { annotations: [ us7 ],
    countries: [ 'US' ] },
  { annotations: [ us7, us8, us9, columbia ],
    countries: [ 'US' ] },
  { annotations: [ ivies, us7Small, us8, us9, columbiaSmall ],
    countries: [ 'US' ] },
  { annotations: [ iviesSmall, columbiaSmall, china ],
    countries: [ 'US', 'China' ] },
  { annotations: [ iviesSmall, columbiaSmall, chinaSmall, korea ],
    countries: [ 'US', 'China', 'Korea, South' ], scaleYAxis: ZOOM_FACTOR },
  { annotations: [ iviesSmallBtm, columbiaSmallBtm, chinaSmall, koreaSmall, italy ],
    countries: [ 'US', 'China', 'Korea, South', 'Italy' ], scaleYAxis: ZOOM_FACTOR },
];

graph.update();

/**
 * Scroll step triggers
 */

const chartContainer = document.getElementById('chart-container');

chartContainer.setAttribute('data-index', 0);
function onStepEnter({ index }) {
  // console.log(index)
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
    step: '.lede-step-surrounding-padding',
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

/**
 * Highlights all country names <c></c>
 */

[].forEach.call(document.getElementsByTagName('c'), el => {
  const color = COUNTRY_COLORS[el.innerText];
  if (color) {
    el.classList.add('country-name-highlight');
    el.style.backgroundColor = color;
  }
});