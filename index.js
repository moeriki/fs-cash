'use strict';

const fs = require('fs');
const path = require('path');

const { promisify } = require('./utils');

// exports

function cash(options = {}) {
  const {
    encoding = 'utf8',
    filepath = path.join(process.cwd(), '.cash'),
  } = options;

  // private

  let datastore;

  function getData() {
    if (datastore) {
      return Promise.resolve(datastore);
    }
    return promisify((cb) => fs.readFile(filepath, { encoding }, cb))
      .then((contents) => JSON.parse(contents), (err) => {
        if (err.code === 'ENOENT') {
          return {};
        }
        throw err;
      })
      .then((data) => (datastore = data))
    ;
  }

  function resetData() {
    datastore = {};
    return promisify((cb) => fs.unlink(filepath, cb))
      .catch((err) => {
        if (err.code === 'ENOENT') {
          return;
        }
        throw err;
      })
    ;
  }

  function persistData() {
    return promisify((cb) => fs.writeFile(filepath, JSON.stringify(datastore), cb))
      .then(() => void 0)
    ;
  }

  // exposed

  function del(key) {
    return getData().then((data) => {
      delete data[String(key)];
      return persistData();
    });
  }

  function get(key) {
    return getData().then((data) => {
      const entry = data[String(key)];
      if (!entry) {
        return Promise.resolve();
      }
      if (entry.expires && Date.now() > entry.expires) {
        return del(key);
      }
      return entry.value;
    });
  }

  function reset() {
    return resetData();
  }

  function set(key, value, { ttl } = {}) {
    const entry = { value };
    if (ttl) {
      entry.expires = Date.now() + ttl;
    }
    return getData().then((data) => {
      data[key] = entry;
      return persistData();
    });
  }

  return { del, get, reset, set };
}

module.exports = cash;