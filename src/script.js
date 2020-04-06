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

// Text balance headline, deck, and image captions

textBalancer.balanceText('.headline, .deck, .image-overlay .image-caption-text');

var a = document.getElementById("g-columbia-desktop-img");


a.addEventListener("load", function () {
  // get the inner DOM of alpha.svg
  var svgDoc = a.contentDocument;
  // get the inner element by id
  var delta = svgDoc.getElementsByClassName("Scrolly1");
  // add behaviour
  [].slice.call(delta).forEach(function (div) {
    div.setAttribute("style", "display:none");
  });
  var text = document.getElementsByClassName("text");
  [].slice.call(text).forEach(function (march) {
    march.style.visibility = "hidden";
  });
}, false);


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
  var stepHeight = Math.floor(window.innerHeight * 0.75);
  step.style("height", stepHeight + "px");

  var bodyWidth = d3.select("body").node().offsetWidth;

  graphic
    .style("width", bodyWidth + "px")
    .style("height", window.innerHeight + "px");
  // 2. update width/height of graphic element
  chart
    .style("width", 65 + "%")

  // 3. tell scrollama to update new element dimensions
  scroller.resize();
}

// scrollama event handlers
var dates = ["8", "10"];
function handleStepEnter(response) {
  // response = { element, direction, index }
  var a = document.getElementById("g-columbia-desktop-img");
  var svgDoc = a.contentDocument;
  if (response.direction == 'down'){
    // get the inner element by id
    var delta = svgDoc.getElementsByClassName("Scrolly"+(response.index+1));
    // add behaviour
    [].slice.call(delta).forEach(function (div) {
      div.setAttribute("style", "display:visible");
    });
    var text = document.getElementsByClassName("g-March_"+dates[response.index]);
    [].slice.call(text).forEach(function (march) {
      march.style.visibility = "visible";
    });
  } 
}

function handleContainerExit(response) {
  var a = document.getElementById("g-columbia-desktop-img");
  var svgDoc = a.contentDocument;
  if (response.direction == 'up'){
    console.log(response.index);
    var delta = svgDoc.getElementsByClassName("Scrolly"+(response.index+1));
    // add behaviour
    [].slice.call(delta).forEach(function (div) {
      div.setAttribute("style", "display:none");
    });
    var text = document.getElementsByClassName("g-March_"+dates[response.index]);
    [].slice.call(text).forEach(function (march) {
      march.style.visibility = "hidden";
    });

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
      container: "#scroll",
      progress:true,
      graphic: ".scroll__graphic",
      text: ".scroll__text",
      step: ".scroll__text .step",
      debug: "true"
    })
    .onStepEnter(handleStepEnter)
    .onStepExit(handleContainerExit);

  // setup resize event
  window.addEventListener("resize", handleResize);
}

// kick things off
init();
