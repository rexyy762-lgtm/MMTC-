require('dotenv').config();

const fs = require('node:fs');
const path = require('node:path');

const {
  REST,
  Routes,
} = require('discord.js');

const commands = [];
const commandsPath = path.join(__dirname, 'commands');

const commandFiles = fs
  .readdirSync(commandsPath)
  .filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
  const command = require(path.join(commandsPath, file));

  if (!command.data) continue;

  commands.push(command.data.toJSON());
}

if (!process.env.TOKEN || !process.env.CLIENT_ID) {
  console.error('❌ TOKEN or CLIENT_ID is missing from .env');
  process.exit(1);
}

const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log(`🔄 Deploying ${commands.length} command(s)...`);

    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands },
    );

    console.log('✅ Commands deployed successfully.');
  } catch (error) {
    console.error('❌ Command deployment failed:', error);
  }
})();
