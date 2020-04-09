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

    // Add things not already there; check if anything was added
    const didAddItems = array.map(item => {
      const key = hasKey(item) ? item.key : item;
      if (!this.items[key]) {
        this.items[key] = item;
        return true;
      }
    }).includes(true);

    const didChangeItems = array.map(item => {
      if (!hasKey(item))
        return false; // No way that an non-keyholding item's value changed

      const { key } = item;
      const other = this.items[key];

      const didOtherChange =
        Object.keys(item).map(p => {
          if (item[p] !== other[p]) {
            this.items[key][p] = item[p];
            return true;
          }
        }).includes(true) +
        Object.keys(other).map(p => {
          if (other[p] !== item[p]) {
            this.items[key][p] = item[p]; // Likely becomes undefined
            return true;
          }
        }).includes(true);
      return !!didOtherChange
    }).includes(true);

    return didRemoveItems || didAddItems || didChangeItems;
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