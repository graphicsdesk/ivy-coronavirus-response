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

// Annotation options
const isSmall = true;
const showCases = true;
const hideOnMobile = true;
const orientTop = true;
const showDates = true;

// Annotations
const us7 = { dayNumber: 7, label: 'Harvard, Cornell, Yale announces stuff', showCases };
const us7Small = { dayNumber: 7, label: 'Harvard, Cornell, Yale', isSmall, orientTop, hideOnMobile };
const us8 = { dayNumber: 8, label: 'Princeton and Penn', isSmall, hideOnMobile };
const us9 = { dayNumber: 9, label: 'Dartmouth and Brown', isSmall, hideOnMobile, orientTop };
const columbia = { dayNumber: 12, label: 'Columbia', showCases };
const columbiaSmall = { dayNumber: 12, label: 'Columbia', isSmall, orientTop };
const columbiaSmallBtm = { dayNumber: 12, label: 'Columbia', isSmall };
const ivies = { dayNumber: 8.375, label: 'Ivy average' };
const iviesSmall = { dayNumber: 8.375, label: 'Ivy average', isSmall, orientTop };
const iviesSmallBtm = { dayNumber: 8.375, label: 'Ivy average', isSmall };
const china = { dayNumber: 8, label: 'China tk', country: 'China', showCases, };
const chinaSmall = { dayNumber: 8, label: 'China tk', country: 'China', isSmall, orientTop };
const korea = { dayNumber: 2, label: 'South Korea tk', country: 'Korea, South', showCases };
const koreaSmall = { dayNumber: 2, label: 'South Korea tk', country: 'Korea, South', isSmall, orientTop };
const italy = { dayNumber: 11, label: 'Italy tk', country: 'Italy', showCases };
const italySmall = { dayNumber: 11, label: 'Italy tk', country: 'Italy', isSmall };

const ZOOM_FACTOR = 0.4;
const allStates = [
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
  { annotations: [ iviesSmallBtm, columbiaSmallBtm, chinaSmall, koreaSmall, italySmall ],
    countries: [ 'US', 'China', 'Korea, South', 'Italy' ] },
  { annotations: [ iviesSmallBtm, columbiaSmallBtm, chinaSmall, koreaSmall, italySmall ],
    countries: [ 'US', 'China', 'Korea, South', 'Italy' ], showDates },
  { annotations: [ iviesSmallBtm, columbiaSmallBtm, chinaSmall, koreaSmall, italySmall ],
    countries: [ 'US', 'China', 'Korea, South', 'Italy' ], showDates, dateBounds: true }
];
const initialState = { countries: [] }

/**
 * Scroll step triggers
 */

const chartContainer = document.getElementById('chart-container');
chartContainer.setAttribute('data-index', 0);

function onStepEnter({ index }) {
  chartContainer.setAttribute('data-index', index);
  const state = allStates[index];
  if (state !== undefined) {
    graph.set(state);
  }
}

function onStepExit({ index, direction }) {
  if (index === 0 && direction === 'up') graph.set(initialState);
}

// Instantiate the scrollama
const scroller = scrollama();

// Setup the instance, pass callback functions
scroller
  .setup({
    step: '.lede-step-surrounding-padding',
    offset: window.innerWidth < 460 ? 0.85 : 0.65,
  })
  .onStepEnter(onStepEnter)
  .onStepExit(onStepExit);

/**
 * Window event listeners
 */

function handleResize() {
  graph.resize();
  scroller.resize();
}

module.exports = { handleResize };

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