const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(
  __dirname,
  '../../data/applicationConfigs.json'
);

function readConfigs() {
  if (!fs.existsSync(DATA_PATH)) {
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
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

function getApplications(guildId) {
  return readConfigs()[guildId] || [];
}

function saveApplication(guildId, application) {
  const data = readConfigs();

  if (!Array.isArray(data[guildId])) {
    data[guildId] = [];
  }

  data[guildId].push({
    ...application,
    createdAt: Date.now(),
  });

  writeConfigs(data);
}

module.exports = {
  getApplications,
  saveApplication,
};
