const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const { readData, writeData } = require('../utils/playerData');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tier-reset')
    .setDescription('Reset all MMTC tier test data of a player.')
    .addUserOption(option =>
      option
        .setName('player')
        .setDescription('The player whose tier data should be reset.')
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const target = interaction.options.getUser('player');

    const data = readData();
    const playerData = data[target.id];

    if (!playerData) {
      return interaction.reply({
        content: `❌ No MMTC tier data found for **${target.username}**.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    // Reset every gamemode
    if (playerData.gamemodes) {
      for (const gamemode of Object.keys(playerData.gamemodes)) {
        playerData.gamemodes[gamemode].tier = null;
        playerData.gamemodes[gamemode].tests = 0;
        playerData.gamemodes[gamemode].history = [];
      }
    }

    // Reset overall tier-test stats
    if (playerData.stats) {
      playerData.stats.tests = 0;
      playerData.stats.wins = 0;
      playerData.stats.losses = 0;
    }

    // Reset overall tier-test history
    playerData.history = [];

    data[target.id] = playerData;
    writeData(data);

    const embed = new EmbedBuilder()
      .setColor(0x2b2d31)
      .setTitle('🗑️ MMTC • Tier Data Reset')
      .setDescription(
        `All MMTC tier test data for <@${target.id}> has been reset successfully.`
      )
      .addFields(
        {
          name: '👤 Player',
          value: `<@${target.id}>`,
          inline: true,
        },
        {
          name: '🏆 Tiers',
          value: '`Reset`',
          inline: true,
        },
        {
          name: '📊 Stats',
          value: '`Reset`',
          inline: true,
        },
        {
          name: '📜 History',
          value: '`Cleared`',
          inline: true,
        }
      )
      .setFooter({
        text: 'MMTC • Minecraft MCPE Tier Testing Community',
      })
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
      flags: MessageFlags.Ephemeral,
    });
  },
};
