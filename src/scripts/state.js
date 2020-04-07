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
    this.updateComponent(this.visibleAnnotations.remove(annotations));
  }

  // Updates component if it should update
  updateComponent(shouldComponentUpdate) {
    if (shouldComponentUpdate)
      this.update();
  }

  // Adds corresponding COVID data to an annotation array of annotations
  // TODO: Here the country = US assumption is made. Lift it up/make it more obvious?
  withCovidData(annotations) {
    return annotations.map(({ country = 'US', dayNumber, ...rest }) => {
      const targetRow = this.covidData.find(row => row.dayNumber === dayNumber && row.country === country);
      return { ...targetRow, ...rest };
    });
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
