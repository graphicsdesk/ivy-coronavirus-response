const fs = require('fs').promises;
const axios = require('axios');

const DATA_URL = 'https://pkgstore.datahub.io/core/covid-19/countries-aggregated_json/data/b5df6eb8975c7721162a8cfef5b6ff56/countries-aggregated_json.json';
const COUNTRIES = [ 'US', 'Italy', 'China', 'Korea, South' ];

async function main() {
  // Get data and filter by countries of interest
  const response = await axios.get(DATA_URL);
  const data = response.data
    .filter(d => COUNTRIES.includes(d.Country))
    .map(d => ({
      cases: d.Confirmed,
      country: d.Country,
      date: d.Date,
    }));

  // Write to /data/covid.json
  await fs.writeFile(process.cwd() + '/data/covid.json', JSON.stringify(data));
}

main().catch(console.error);
