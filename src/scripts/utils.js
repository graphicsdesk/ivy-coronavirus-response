// Checks if two domains are CLOSE ENOUGH, because this function is only used
// to determine whether axes/scales should be reset and rerendered.
const areDomainsEqual = (d1, d2) =>
  Math.abs(1 - (d1[1] - d1[0]) / (d2[1] - d2[0])) < 0.001;

// Adds a key to an annotation object
// TODO: Here a second country = US assumption is made. Lift it up/make it more obvious?
const annotationWithKey = ({ country = 'US', dayNumber, ...rest }) => ({
  key: country + '-' + dayNumber,
  country,
  dayNumber,
  ...rest,
});

// Returns true if a <= x <= b
const isBetween = (x, [ a, b ]) => typeof x === 'number' && x >= a && x <= b;

// Returns first quintile in a range,
// Just positions case count label nicely.
const firstQuintile = ([ a, b ]) => a + (b - a) * 0.2;

// Formats the number of cases
const formatCaseCount = ({ cases }) => {
  let output = cases;
  if (cases >= 1000)
    output = Math.floor(cases / 1000) + ',' + cases % 1000;
  return output + ' cases';
};

module.exports = {
  areDomainsEqual,
  annotationWithKey,
  isBetween,
  firstQuintile,
  formatCaseCount,
};
