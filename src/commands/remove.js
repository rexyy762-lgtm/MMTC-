const {
  SlashCommandBuilder,
  EmbedBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ActionRowBuilder,
  MessageFlags,
} = require('discord.js');

const {
  readData,
  writeData,
  getPlayer,
} = require('../utils/playerData');

const GAMEMODES = [
  'SKYWARS',
  'MIDFIGHT',
  'NODEBUFF',
  'MACE',
  'BUILD UHC',
  'CRYSTAL PVP',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('remove')
    .setDescription('Remove a player current tier.')
    .setDMPermission(false),

  async execute(interaction) {
    const member = interaction.member;

    const isStaff = member.roles.cache.some(
      role => role.name === 'STAFF'
    );

    const isMMTCTester = member.roles.cache.some(
      role => role.name === 'MMTC TESTER'
    );

    if (!isStaff && !isMMTCTester) {
      return interaction.reply({
        content: '❌ You do not have permission to use `/remove`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const menu = new StringSelectMenuBuilder()
      .setCustomId('remove_gamemode')
      .setPlaceholder('🎮 Select a gamemode')
      .addOptions(
        GAMEMODES.map(gamemode => ({
          label: gamemode,
          value: gamemode,
        }))
      );

    await interaction.reply({
      content: '### 🗑️ MMTC • Remove Tier\nSelect the gamemode whose tier you want to remove.',
      components: [
        new ActionRowBuilder().addComponents(menu),
      ],
      flags: MessageFlags.Ephemeral,
    });
  },
};
