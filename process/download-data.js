const fs = require('fs').promises;
const { Dataset } = require('data.js');

const PATH = 'https://datahub.io/core/covid-19/datapackage.json';
const COUNTRIES = [ 'US', 'Italy', 'China', 'Korea, South' ];

async function main() {

  // Retrieve data
  const { resources } = await Dataset.load(PATH);
  const file = Object.values(resources).find(r => r._descriptor.name === 'countries-aggregated_json');

  // Filter out countries and calculate number of days since 100th case
  const daysSince100 = {};
  const data = JSON.parse(await file.buffer)
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
