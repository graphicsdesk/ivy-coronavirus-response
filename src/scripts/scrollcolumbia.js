import 'intersection-observer';
import scrollama from "scrollama";
import { select } from 'd3-selection';
import { selectAll } from 'd3-selection';

select("#g-columbia-desktop")
        .style("width", 700 * (window.innerHeight/800)+"px")
        .style("height", 750 * (window.innerHeight/800)+"px")
        


window.addEventListener('resize', function() {
    select("#g-columbia-desktop")
        .style("width", 700 * (window.innerHeight/800)+"px")
        .style("height", 750 * (window.innerHeight/800)+"px")
}, true);



// animation dates for columbia
var dates = ["8", "10", "12", "15", "18", "20"];


// using d3 for convenience
var container =  select("#scroll");
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
  var bodyWidth =  select("body").node().offsetWidth;

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
     selectAll(".Scrolly" + (response.index))
      .style("opacity", "1");
    // define appearance of pulsating circle
    if (response.index == 0 || response.index == 3) {
       selectAll(".anim" + response.index)
        .style("visibility", "visible")
    } else {
       selectAll(".anim" + (response.index - 1))
        .style("visibility", "hidden")
    }
     selectAll(".g-March" + dates[response.index])
      .classed("m-fadeIn", true)
      .classed("m-fadeOut", false);

    if (window.screen.width < 800) {
       selectAll(".mobil" + response.index)
        .classed("m-fadeOut", false)
        .classed("m-fadeIn", true);
    }
    // make text appear

  } else {
    if (response.index == 0 || response.index == 3) {
       selectAll(".anim" + response.index)
        .style("visibility", "visible")
    } else {
       selectAll(".anim" + response.index)
        .style("visibility", "hidden")

    }
  }
}

// make text disappear when scrolling up
function handleContainerExit(response) {
  if (response.direction == 'up') {
     selectAll(".Scrolly" + (response.index))
      .style("opacity", "0");

     selectAll(".g-March" + dates[response.index])
      .classed("m-fadeOut", true)
      .classed("m-fadeIn", false);

     selectAll(".mobil" + response.index)
      .classed("m-fadeOut", true)
      .classed("m-fadeIn", false);
  }

}

// handle the appearance of surpassed animations on refresh
var notDone = true;
function handleStepProgress(response) {
  if (response.index != 0 && notDone) {
    for (var i = 0; i <= response.index; i++) {
       selectAll(".Scrolly" + i)
        .style("opacity", "1");

       selectAll(".g-March" + dates[i])
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
      offset: (window.screen.height / 1.8 + "px"),
      container: "#scroll",
      progress:true,
      graphic: ".scroll__graphic",
      text: ".scroll__text",
      step: ".scroll__text .steps",
      debug: true
    })
    .onStepEnter(handleStepEnter)
    .onStepExit(handleContainerExit)
    .onStepProgress(handleStepProgress);

  // setup resize event
  window.addEventListener("resize", handleResize);
}

// kick things off
init();