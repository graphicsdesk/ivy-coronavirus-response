import { timeDay } from 'd3-time';
import Store from './store';
import { annotationWithKey, isBetween } from './utils';

/**
 * The State class provides an interface for changing and accessing the store
 */

const defaultXBounds = [0, 16];
const defaultDateBounds = [new Date("2020-01-22"), new Date("2020-04-01")];

class State {
  constructor(covidData) {
    this.covidData = covidData;
  }

  xBounds = defaultXBounds;
  dateBounds = undefined;

  visibleCountries = new Store(); // Stores country-level lines
  visibleAnnotations = new Store(annotationWithKey); // Stores annotations, adds a key
  showDates = undefined;

  set({ countries = [], annotations = [], scaleYAxis, showDates, dateBounds }) {
    const dateBoundsChanged = !!this.dateBounds !== !!dateBounds;
    this.dateBounds = dateBounds && defaultDateBounds;

    const willReplaceXAxis = this.showDates !== showDates;
    this.showDates = showDates;

    this.updateComponent({
      shouldUpdateAnnotations: this.visibleAnnotations.set(annotations),
      shouldUpdateCountries: this.visibleCountries.set(countries),
      willReplaceXAxis,
      dateBoundsChanged,
      scaleYAxis, showDates, dateBounds,
    });
  }

  // Updates component if it should update
  updateComponent(params) {
    const { shouldUpdateAnnotations, shouldUpdateCountries, willReplaceXAxis, dateBoundsChanged } = params;
    if (shouldUpdateAnnotations || shouldUpdateCountries || willReplaceXAxis || dateBoundsChanged)
      // Shouldn't pass should* variables in, but using
      // it for one transition in this.update
      this.update(params);
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
        const { dayNumber: prevNum, cases: prevCases, date: prevDate } = countryData[i - 1];
        const { dayNumber: nextNum, cases: nextCases, date: nextDate } = countryData[i];
        if (prevNum < dayNumber && dayNumber < nextNum) {
          return {
            country,
            dayNumber,
            date: timeDay.offset(prevDate, 0.5), // close enough for now
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

    return this.covidData
      .filter(d => countries.includes(d.country))
      .filter(d => {
        if (this.showDates && this.dateBounds) {
          return isBetween(d['date'], this.dateBounds) && d.cases >= 100;
        }
        return isBetween(d['dayNumber'], this.xBounds);
      });
  }
}

export default State;
