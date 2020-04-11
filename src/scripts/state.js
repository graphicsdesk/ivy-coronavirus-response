import Store from './store';
import { annotationWithKey, isBetween } from './utils';

/**
 * The State class provides an interface for changing and accessing the store
 */

const defaultXBounds = [0, 16];

class State {
  constructor(covidData) {
    this.covidData = covidData;
  }

  xBounds = defaultXBounds

  visibleCountries = new Store(); // Stores country-level lines
  visibleAnnotations = new Store(annotationWithKey); // Stores annotations, adds a key
  showDates = null; // First value passed in will be undefined, which triggers a change for now

  set({ countries = [], annotations = [], scaleYAxis, showDates, xBounds }) {
    // this.xBounds = xBounds || defaultXBounds;
    const willReplaceXAxis = this.showDates !== showDates;
    this.showDates = showDates;
    this.updateComponent({
      shouldUpdateAnnotations: this.visibleAnnotations.set(annotations),
      shouldUpdateCountries: this.visibleCountries.set(countries),
      willReplaceXAxis,

      // Other config stuff to send down
      scaleYAxis, showDates,
    });
  }

  // Updates component if it should update
  updateComponent({ shouldUpdateAnnotations, shouldUpdateCountries, scaleYAxis, willReplaceXAxis, showDates }) {
    if (shouldUpdateAnnotations || shouldUpdateCountries || willReplaceXAxis)
      // Shouldn't pass should* variables in, but using
      // it for one transition in this.update
      this.update({ shouldUpdateAnnotations, scaleYAxis, showDates, willReplaceXAxis });
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
    let countries = this.countries;
    if (countries.length === 0)
      countries = ['US'];
    return this.covidData.filter(d =>
      countries.includes(d.country) &&
      isBetween(d.dayNumber, this.xBounds)
    );
  }
}

export default State;
