const COUNTRY_COLORS = {
  'US': '#D13838',
  'China': '#40bf80',
  'Korea, South': '#44A6E0',
  'Italy': '#F89E99',
};
COUNTRY_COLORS['South Korea'] = COUNTRY_COLORS['Korea, South'];

const getCountryLabel = country => {
  return { 'US': 'United States', 'Korea, South': 'South Korea' }[country] ||
    country;
};

const getLineLabel = ary => getCountryLabel(ary[0].country);

const getLineColor = ary => getCountryColor(ary[0]);

const getCountryColor = d => COUNTRY_COLORS[d.country];

module.exports = { COUNTRY_COLORS, getLineLabel, getLineColor, getCountryColor };
