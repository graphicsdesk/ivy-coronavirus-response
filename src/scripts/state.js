import Store from './store';
import { annotationWithKey, isBetween } from './utils';

/**
 * The State class provides an interface for changing and accessing the store
 */

class State {
  constructor(covidData) {
    this.covidData = covidData;
  }

  visibleCountries = new Store(); // Stores country-level lines
  visibleAnnotations = new Store(annotationWithKey); // Stores annotations

  addCountry(...countries) {
    this.updateComponent(this.visibleCountries.add(countries));
  }

  removeCountry(...countries) {
    this.updateComponent(this.visibleCountries.remove(countries));
  }

  addAnnotation(...annotations) {
    this.updateComponent(this.visibleAnnotations.add(annotations));
  }

  removeAnnotation(...annotations) {
    this.updateComponent(this.visibleAnnotations.add(annotations));
  }

  // Updates component if it should update
  updateComponent(shouldComponentUpdate) {
    if (shouldComponentUpdate)
      this.update();
  }

  // Returns visible countries as an array
  get countries() { return this.visibleCountries.getState(); }

  get annotations() { return this.visibleAnnotations.getState(); }

  // Selector for the data necessary to display the current state
  get data() {
    return this.covidData.filter(d =>
      this.countries.includes(d.country) &&
      isBetween(d.dayNumber, [ 0, 18 ])
    );
  }
}

module.exports = State;
