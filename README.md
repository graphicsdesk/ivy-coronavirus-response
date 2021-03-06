# Ivy Coronavirus Response

This story was created with [Spectate](https://github.com/spec-journalism/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/spec-journalism/spectate/#cloning-a-spectate-project).

## Data Diary

`/process/download-data.js` downloads COVID data aggregated by countries (`countries-aggregated`, JSON formatted) directly from JHU's [datahub](https://github.com/datasets/covid-19) using the package `data.js`. It filters out the countries the lede doesn't visualize and makes the keys lowercase. It writes the data to `/data/covid.json`. It can be run directly with Node or with `spectate download-data`.

`/src/scripts/lede.js` turns date strings into `Date` objects before passing `covidData` into `Graph`.
