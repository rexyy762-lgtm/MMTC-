require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  Client,
  Collection,
  GatewayIntentBits,
  ActivityType,
} = require('discord.js');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();

// ==================== COMMAND LOADER ====================

const commandsPath = path.join(__dirname, 'commands');
const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  if (!command.data || !command.execute) {
    console.warn(`⚠️ Skipping invalid command: ${file}`);
    continue;
  }

  client.commands.set(command.data.name, command);
}

// ==================== EVENT LOADER ====================

const eventsPath = path.join(__dirname, 'events');
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter(file => file.endsWith('.js'));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);

  if (!event.name || !event.execute) {
    console.warn(`⚠️ Skipping invalid event: ${file}`);
    continue;
  }

  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args));
  } else {
    client.on(event.name, (...args) => event.execute(...args));
  }
}

// ==================== ACTIVITY ====================

const activities = [
  {
    name: '/help',
    type: ActivityType.Watching,
  },
  {
    name: 'Tier Testing',
    type: ActivityType.Watching,
  },
];

let activityIndex = 0;

function updateActivity() {
  const activity = activities[activityIndex];

  client.user.setPresence({
    activities: [
      {
        name: activity.name,
        type: activity.type,
      },
    ],
    status: 'online',
  });

  activityIndex = (activityIndex + 1) % activities.length;
}

// ==================== READY ====================

client.once('clientReady', (readyClient) => {
  console.log(`🧊 CYRO online as ${readyClient.user.tag}`);
  console.log(`📡 Serving ${readyClient.guilds.cache.size} guild(s)`);
  console.log(`📦 Loaded ${client.commands.size} command(s)`);
  console.log(`⚡ Loaded ${eventFiles.length} event(s)`);

  updateActivity();

  setInterval(() => {
    updateActivity();
  }, 30_000);
});

// ==================== ERROR ====================

client.on('error', (error) => {
  console.error('❌ Discord client error:', error);
});

// ==================== LOGIN ====================

if (!process.env.TOKEN) {
  console.error('❌ TOKEN is missing from .env');
  process.exit(1);
}


// ==================== NETWORK ERROR PROTECTION ====================

process.on('uncaughtException', (error) => {
  if (
    error?.code === 'ECONNRESET' ||
    error?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    error?.code === 'ETIMEDOUT'
  ) {
    console.error(`⚠️ Network error: ${error.code} — Discord will reconnect.`);
    return;
  }

  console.error('❌ Uncaught exception:', error);
});

process.on('unhandledRejection', (reason) => {
  if (
    reason?.code === 'ECONNRESET' ||
    reason?.code === 'UND_ERR_CONNECT_TIMEOUT' ||
    reason?.code === 'ETIMEDOUT'
  ) {
    console.error(`⚠️ Network rejection: ${reason.code} — Discord will reconnect.`);
    return;
  }

  console.error('❌ Unhandled rejection:', reason);
});

client.login(process.env.TOKEN);
