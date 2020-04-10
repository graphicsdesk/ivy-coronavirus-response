const fs = require('fs').promises;
const axios = require('axios');

const DATA_URL = 'https://pkgstore.datahub.io/core/covid-19/countries-aggregated_json/data/b5df6eb8975c7721162a8cfef5b6ff56/countries-aggregated_json.json';
const COUNTRIES = [ 'US', 'Italy', 'China', 'Korea, South' ];

async function main() {
  // Get data and filter by countries of interest
  // Fetch data
  const response = await axios.get(DATA_URL);

  // Filter out countries and calculate number of days since 100th case
  const daysSince100 = {};
  const data = response.data
    .filter(d => COUNTRIES.includes(d.Country))
    .map(d => {
      const { Confirmed: cases, Country: country, Date: date } = d;
      if (country in daysSince100)
        daysSince100[country]++;
      else if (cases >= 100)
        daysSince100[country] = 0;
      return { cases, country, date, dayNumber: daysSince100[country] };
    });

  // Write to /data/covid.json
  await fs.writeFile(process.cwd() + '/data/covid.json', JSON.stringify(data, null, 2));
}

main().catch(console.error);
