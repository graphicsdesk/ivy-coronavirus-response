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

  set({ countries = [], annotations = [] }) {
    this.updateComponent(this.visibleAnnotations.set(annotations) +
      this.visibleCountries.set(countries));
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
