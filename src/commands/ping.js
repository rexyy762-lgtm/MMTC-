const { SlashCommandBuilder } = require('discord.js');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Check CYRO latency.'),

  async execute(interaction) {
    const latency = Date.now() - interaction.createdTimestamp;

    await interaction.reply({
      content: `🧊 **Pong!** \`${latency}ms\``,
    });
  },
};
