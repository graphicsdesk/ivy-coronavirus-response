import enterView from 'enter-view';
import textBalancer from 'text-balancer';
import { USE_COVER_HED, USE_EYE_NAV } from '../config.json';
import "intersection-observer";
import Stickyfill from "stickyfill";
import scrollama from "scrollama";
import * as d3 from "d3";
import './scripts/page.js';

// Fade in navbar at scroll trigger

const navbar = document.getElementById('navbar');

if (USE_COVER_HED || USE_EYE_NAV) {
  enterView({
    selector: USE_COVER_HED ? '.headline' : '.step-deck',
    offset: USE_COVER_HED ? 1 : 0.957,
    enter: () => {
      navbar.classList.remove('only-logo');
    },
    exit: () => {
      navbar.classList.remove('show-nav-links');
      navbar.classList.add('only-logo');
    },
  });
}

// Mobile navbar hamburger trigger

export function hamburgerTrigger() {
  navbar.classList.toggle('show-nav-links');
}


textBalancer.balanceText('.headline, .deck, .image-overlay .image-caption-text');

// animation dates for columbia
var dates = ["8", "10", "12", "15", "18", "20"];


// using d3 for convenience
var container = d3.select("#scroll");
var graphic = container.select(".scroll__graphic");
var chart = graphic.select(".chart");
var text = container.select(".scroll__text");
var step = text.selectAll(".step");

// initialize the scrollama
var scroller = scrollama();

// generic window resize listener event
function handleResize() {
  // 1. update height of step elements
  var stepHeight = Math.floor(window.innerHeight * 0.55);
  step.style("height", stepHeight + "px");

  var bodyWidth = d3.select("body").node().offsetWidth;

  graphic
    .style("width", bodyWidth + "px")
    .style("height", window.innerHeight - 300 + "px");
  // 2. update width/height of graphic element
  chart
    .style("width", 65 + "%")

  // 3. tell scrollama to update new element dimensions
  scroller.resize();
}

// scrollama event handlers
function handleStepEnter(response) {
  // response = { element, direction, index }
  if (response.direction == 'down') {
    // make animation appear
    d3.selectAll(".Scrolly" + (response.index))
      .style("opacity", "1");
    // define appearance of pulsating circle
    if (response.index == 0 || response.index == 3) {
      d3.selectAll(".anim" + response.index)
        .style("visibility", "visible")
    } else {
      d3.selectAll(".anim" + (response.index - 1))
        .style("visibility", "hidden")
    }

    // make text appear
    d3.selectAll(".g-March" + dates[response.index])
      .classed("m-fadeIn", true)
      .classed("m-fadeOut", false);
  } else {
    if (response.index == 0 || response.index == 3) {
      d3.selectAll(".anim" + response.index)
        .style("visibility", "visible")
    } else {
      d3.selectAll(".anim" + response.index)
        .style("visibility", "hidden")
    }
  }
}

// make text disappear when scrolling up
function handleContainerExit(response) {
  if (response.direction == 'up') {
    d3.selectAll(".Scrolly" + (response.index))
      .style("opacity", "0");

    d3.selectAll(".g-March" + dates[response.index])
      .classed("m-fadeOut", true)
      .classed("m-fadeIn", false);

  }
}

// handle the appearance of surpassed animations on refresh
var notDone = true;
function handleStepProgress(response) {
  if (response.index != 0 && notDone) {
    console.log(response.index);
    for (var i = 0; i <= response.index; i++) {
      d3.selectAll(".Scrolly" + i)
        .style("opacity", "1");

      d3.selectAll(".g-March" + dates[i])
        .classed("m-fadeOut", false)
        .classed("m-fadeIn", true);
    }
    notDone = false;
  }

}

function init() {
  // 1. force a resize on load to ensure proper dimensions are sent to scrollama
  handleResize();

  // 2. setup the scroller passing options
  // this will also initialize trigger observations
  // 3. bind scrollama event handlers (this can be chained like below)
  scroller
    .setup({
      order: true,
      offset: 0.55,
      container: "#scroll",
      progress: true,
      graphic: ".scroll__graphic",
      text: ".scroll__text",
      step: ".scroll__text .step"
    })
    .onStepEnter(handleStepEnter)
    .onStepExit(handleContainerExit)
    .onStepProgress(handleStepProgress);

  // setup resize event
  window.addEventListener("resize", handleResize);
}

// kick things off
init();
