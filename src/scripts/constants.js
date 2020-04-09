const COUNTRY_COLORS = {
  'US': 'red',
  'China': 'green',
  'Korea, South': 'blue',
  'Italy': 'purple',
};
COUNTRY_COLORS['South Korea'] = COUNTRY_COLORS['Korea, South'];

const getCountryLabel = country => {
  return { 'US': 'United States', 'Korea, South': 'South Korea' }[country] ||
    country;
};

module.exports = { COUNTRY_COLORS, getCountryLabel };
