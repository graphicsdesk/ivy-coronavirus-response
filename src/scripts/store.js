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

  // // Adds items to a store. Return true if anything was actually added.
  add(...items) {
    return items.map(this.withKey)
      .map(item => {
        // To mark an item's membership, by default use the item as the key and
        // true as the value. If item.key exists, use item.key instead.
        let key = item;
        let value = true;
        if (hasKey(item)) {
          key = item.key;
          value = item;
        }

        // If an item is not shown, add it (mark its membership) and return true.
        // If an item is already shown, return false
        return !this.items[key] && (this.items[key] = value);
      })
      // Were any countries actually added?
      .includes(true);
  }

  // Remove items from a store. Return true if anything was actually removed.
  remove(...items) {
    return items.map(this.withKey)
      .map(item => {
        let key = hasKey(item) ? item.key : item;
        // If an item is shown, remove it (set it to undefined) and return true.
        // If an item is already not shown, return false.
        return this.items[key] && ((this.items[key] = undefined) === undefined)
      })
      // Were any countries actually removed (i.e. set to undefined)?
      .includes(true);
  }

  // Returns current state as an array of which items are visible
  getState() {
    return Object.keys(this.items).filter(x => this.items[x]);
  }
}

// Check if a variable has a key property
function hasKey(item) {
  return typeof item === 'object' && item !== null && 'key' in item;
}

module.exports = Store;