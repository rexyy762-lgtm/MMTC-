const fs = require('node:fs');
const path = require('node:path');

const DATA_PATH = path.join(__dirname, '../../data/players.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_PATH);

  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DATA_PATH)) {
    fs.writeFileSync(DATA_PATH, '{}\n');
  }
}

function readData() {
  ensureDataFile();

  try {
    return JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  } catch (error) {
    console.error('❌ Failed to read player data:', error);
    return {};
  }
}

function writeData(data) {
  ensureDataFile();

  fs.writeFileSync(
    DATA_PATH,
    JSON.stringify(data, null, 2) + '\n'
  );
}

function getGamemodeCooldown(userId, gamemode) {
  const player = getPlayer(userId);
  const modeData = player.gamemodes?.[gamemode];

  if (!modeData?.cooldownUntil) {
    return 0;
  }

  const cooldownUntil = Number(modeData.cooldownUntil);

  if (!Number.isFinite(cooldownUntil) || cooldownUntil <= Date.now()) {
    return 0;
  }

  return cooldownUntil;
}

function setGamemodeCooldown(userId, gamemode, durationMs) {
  const player = getPlayer(userId);

  if (!player.gamemodes) {
    player.gamemodes = {};
  }

  if (!player.gamemodes[gamemode]) {
    player.gamemodes[gamemode] = {
      tier: null,
      tests: 0,
      history: [],
    };
  }

  player.gamemodes[gamemode].cooldownUntil =
    Date.now() + durationMs;

  const data = readData();
  data[userId] = player;
  writeData(data);

  return player.gamemodes[gamemode].cooldownUntil;
}

function removePlayerTier(userId, gamemode) {
  const data = readData();

  if (!data[userId]) {
    return {
      success: false,
      reason: 'PLAYER_NOT_FOUND',
    };
  }

  const player = data[userId];

  if (!player.gamemodes || !player.gamemodes[gamemode]) {
    return {
      success: false,
      reason: 'NO_GAMEMODE_DATA',
    };
  }

  const modeData = player.gamemodes[gamemode];

  if (!modeData.tier) {
    return {
      success: false,
      reason: 'NO_TIER',
    };
  }

  const previousTier = modeData.tier;

  modeData.tier = null;

  data[userId] = player;
  writeData(data);

  return {
    success: true,
    previousTier,
    player,
  };
}

function getPlayer(userId) {
  const data = readData();

  if (!data[userId]) {
    data[userId] = {
      userId,
      gamemodes: {},
      stats: {
        tests: 0,
        wins: 0,
        losses: 0,
      },
      history: [],
    };

    writeData(data);
  }

  return data[userId];
}

module.exports = {
  readData,
  writeData,
  getPlayer,
  removePlayerTier,
  getGamemodeCooldown,
  setGamemodeCooldown,
};
