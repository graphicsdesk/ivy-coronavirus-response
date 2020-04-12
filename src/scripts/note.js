// Annotation options
const isSmall = true;
const showCases = true;
const hideOnMobile = true;
const orientTop = true;

function Note(dayNumber, label, country) {
  this.dayNumber = dayNumber;
  this.label = label;
  this.country = country;
}

Note.prototype = {
  write: function(label) { return Object.assign(new Note(), this, { label }); },
  get small() { return Object.assign(new Note(), this, { isSmall }); },
  get cases() { return Object.assign(new Note(), this, { showCases }); },
  get hideMobile() { return Object.assign(new Note(), this, { hideOnMobile }); },
  get top() { return Object.assign(new Note(), this, { orientTop }); },
  get bottom() { return Object.assign(new Note(), this, { orientTop: false }); },
};

export default Note;
