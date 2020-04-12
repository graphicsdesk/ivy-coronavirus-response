/**
 * This file is where the actual scrolling and graphing happens.
 */

import scrollama from 'scrollama/src/init.js';
import Graph from './graph';
import Note from './note';
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

const showDates = true;

const graph = new Graph(covidData);

// Annotations
const us7 = new Note(7, 'Harvard, Cornell, Yale announce student move-out');
const us7Small = us7.small.top.hideMobile.write('Harvard, Cornell, Yale');
const us8 = new Note(8, 'Princeton and Penn').small.hideMobile;
const us9 = new Note(9, 'Dartmouth and Brown').small.hideMobile.top;
const columbia = new Note(12, 'Columbia');
const columbiaSmall = columbia.small.top;
const columbiaSmallBtm = columbia.small.bottom;
const ivies = new Note(8.375, 'Ivies');
const iviesSmall = ivies.small.top;
const iviesSmallBtm = ivies.small;
const china = new Note(8, 'China tk', 'China');
const chinaSmall = china.small.top;
const korea = new Note(2, 'South Korea tk', 'Korea, South');
const koreaSmall = korea.small.top;
const italy = new Note(11, 'Italy tk', 'Italy');
const italySmall = italy.small.top;

const ZOOM_FACTOR = 0.4;

const allStates = [
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
  { annotations: [ iviesSmall, chinaSmall, koreaSmall, italySmall ],
    countries: [ 'US', 'China', 'Korea, South', 'Italy' ], showDates },
  { annotations: [ iviesSmall, chinaSmall, koreaSmall, italySmall ],
    countries: [ 'US', 'China', 'Korea, South', 'Italy' ], showDates, dateBounds: true }
];
const initialState = { countries: ['US'] };

/**
 * Scroll step triggers
 */

 graph.set(initialState);

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