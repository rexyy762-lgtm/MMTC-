const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
} = require('discord.js');

const { getPlayer, readData, writeData } = require('../utils/playerData');

const GAMEMODES = [
  'SKYWARS',
  'MIDFIGHT',
  'NODEBUFF',
  'MACE',
  'BUILD UHC',
  'CRYSTAL PVP',
];

const TIERS = [
  'HT1', 'LT1',
  'HT2', 'LT2',
  'HT3', 'LT3',
  'HT4', 'LT4',
  'HT5', 'LT5',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('tier')
    .setDescription('Manually assign or change a player tier.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addUserOption(option =>
      option
        .setName('player')
        .setDescription('Player whose tier you want to change')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('gamemode')
        .setDescription('Gamemode')
        .setRequired(true)
        .addChoices(
          { name: 'SkyWars', value: 'SKYWARS' },
          { name: 'Midfight', value: 'MIDFIGHT' },
          { name: 'Nodebuff', value: 'NODEBUFF' },
          { name: 'Mace', value: 'MACE' },
          { name: 'Build UHC', value: 'BUILD UHC' },
          { name: 'Crystal PvP', value: 'CRYSTAL PVP' },
        )
    )
    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription('Tier to assign')
        .setRequired(true)
        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier,
          }))
        )
    ),

  async execute(interaction) {
    if (!interaction.memberPermissions?.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({
        content: '❌ You do not have permission to use this command.',
        ephemeral: true,
      });
    }

    const target = interaction.options.getUser('player');
    const gamemode = interaction.options.getString('gamemode');
    const tier = interaction.options.getString('tier');

    const player = getPlayer(target.id);

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

    const previousTier = player.gamemodes[gamemode].tier || 'Unranked';

    player.gamemodes[gamemode].tier = tier;

    const data = readData();
    data[target.id] = player;
    writeData(data);

    const embed = new EmbedBuilder()
      .setTitle('Tier Updated')
      .setDescription(
        `Successfully updated ${target} tier.`
      )
      .addFields(
        {
          name: 'Player',
          value: `${target} (\`${target.id}\`)`,
          inline: false,
        },
        {
          name: 'Gamemode',
          value: gamemode,
          inline: true,
        },
        {
          name: 'Previous Tier',
          value: previousTier,
          inline: true,
        },
        {
          name: 'New Tier',
          value: tier,
          inline: true,
        }
      )
      .setThumbnail(target.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    return interaction.reply({
      embeds: [embed],
    });
  },
};
