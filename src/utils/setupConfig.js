const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '../../data/setupConfigs.json');

function readConfigs() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '{}\n');
  }

  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function writeConfigs(data) {
  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify(data, null, 2) + '\n'
  );
}

function getSetup(guildId) {
  return readConfigs()[guildId] || null;
}

function saveSetup(guildId, config) {
  const data = readConfigs();

  data[guildId] = {
    ...config,
    updatedAt: Date.now(),
  };

  writeConfigs(data);
  return data[guildId];
}

module.exports = {
  getSetup,
  saveSetup,
};
