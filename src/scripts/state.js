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
  visibleAnnotations = new Store(annotationWithKey); // Stores annotations, adds a key

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

  add({ countries, annotations }) {
    const shouldComponentUpdate = this.visibleCountries.add(countries || []) +
      this.visibleAnnotations.add(annotations || []);
    this.updateComponent(shouldComponentUpdate)
  }

  remove({ countries, annotations }) {
    const shouldComponentUpdate = this.visibleCountries.remove(countries || []) +
      this.visibleAnnotations.remove(annotations || []);
    this.updateComponent(shouldComponentUpdate)
  }

  setAnnotations(annotations) {
    console.log('SETTING annotations')
    const shouldComponentUpdate = this.visibleAnnotations.set(annotations);
    console.log('stuff changed:', shouldComponentUpdate);
    this.updateComponent(shouldComponentUpdate)
  }

  set({ countries, annotations }) {
    const shouldComponentUpdate = this.visibleAnnotations.set(annotations || []) +
      this.visibleCountries.set(countries || []);
    this.updateComponent(shouldComponentUpdate);
  }

  // Updates component if it should update
  updateComponent(shouldComponentUpdate) {
    if (shouldComponentUpdate)
      this.update();
  }

  // Adds corresponding COVID data to an annotation array of annotations
  // TODO: Here a second country = US assumption is made. Lift it up/make it more obvious?
  withCovidData(annotations) {
    const { covidData } = this;

    return annotations.map(({ country = 'US', dayNumber, ...rest }) => {
      const targetRow = covidData.find(row => row.dayNumber === dayNumber && row.country === country);
      if (targetRow)
        return { ...targetRow, ...rest };

      // Doing some more work to interpolation values for annotation pointing
      const countryData = covidData.filter(row => row.country === country);
      for (let i = 1; i < countryData.length; i++) {
        const { dayNumber: prevNum, cases: prevCases } = countryData[i - 1];
        const { dayNumber: nextNum, cases: nextCases } = countryData[i];
        if (prevNum < dayNumber && dayNumber < nextNum) {
          return {
            country,
            dayNumber,
            cases: prevCases + (nextCases - prevCases) * (dayNumber - prevNum) / (nextNum - prevNum),
            ...rest,
          };
        }
      }
    });
  }

  // Returns visible countries as an array
  get countries() { return this.visibleCountries.getState(); }

  get annotations() { return this.visibleAnnotations.getState(); }

  // Selector for the data necessary to display the current state
  get data() {
    return this.covidData.filter(d =>
      this.countries.includes(d.country) &&
      isBetween(d.dayNumber, [ 0, 16 ])
    );
  }
}

module.exports = State;
