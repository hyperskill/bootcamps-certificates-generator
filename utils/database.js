const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', process.env.DB_DIR || 'db', process.env.DB_FILE || 'certs.json');

function loadDB() {
  try { 
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf8')); 
  } catch { 
    return []; 
  }
}

function saveDB(data) {
  fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2));
}

module.exports = {
  loadDB,
  saveDB
};
