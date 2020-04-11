# Ivy Coronavirus Response

This story was created with [Spectate](https://github.com/spec-journalism/spectate). For setup and usage instructions, see the [Spectate documentation](https://github.com/spec-journalism/spectate/#cloning-a-spectate-project).

**Things to do before publishing**

- [ ] Somehow write a callback for after unmounting `section#main` and mounting `article`, because Scrollama shouldn't be instantiated until after `article` is remounted. I think this can be done with `requestAnimationFrame` in `/src/scripts/page.js`.

- [ ] Uncomment and set for real what points to pulse in the lede

## Data Diary

`/process/download-data.js` downloads COVID data aggregated by countries (`countries-aggregated.csv`) directly from JHU's [datahub](https://github.com/datasets/covid-19). It filters out the countries the lede doesn't visualize and makes the keys lowercase. It writes the data to `/data/covid.json`. It can be run directly with Node or with `spectate download-data`.

`/src/scripts/lede-interactive.js` does minimal preprocessing, turning date strings into `Date` objects.
