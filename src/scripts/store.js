/**
 * The Store class holds the visualization's state tree
 */

class Store {
  items = {}; // Stores what items are shown
  withKey = item => item; // By default, do nothing

  constructor(withKey) {
    if (withKey)
      this.withKey = withKey;
  }

  // Set store to these items. Return true if anything changed
  // Only checks for key differences right now
  set(array) {
    // console.log('previously', this.items)
    array = array.map(this.withKey);

    // Remove extraneous existing items
    const didRemoveItems = Object.keys(this.items)
      .map(key => {
        if (this.items[key] && array.every(item => (hasKey(item) ? item.key : item) !== key)) {
          this.items[key] = undefined;
          return true;
        }
      })
      .includes(true);

    // Add things not already there
    const didAddItems = array.map(item => {
      let key = item;
      let value = true;
      if (hasKey(item)) {
        key = item.key;
        value = item;
      }
      if (!this.items[key]) {
        this.items[key] = item;
        return true;
      }
    }).includes(true);

    // console.log('afterwards', this.items)
    return didRemoveItems || didAddItems;
  }

  // Returns current state as an array of which items are visible
  getState() {
    return Object.keys(this.items).reduce((acc, k) => {
      const value = this.items[k]
      if (hasKey(value))
        acc.push(value)
      else if (value)
        acc.push(k)
      return acc;
    }, []);
  }
}

// Check if a variable has a key property
function hasKey(item) {
  return typeof item === 'object' && item !== null && 'key' in item;
}

module.exports = Store;