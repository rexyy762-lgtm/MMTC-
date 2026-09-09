'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  ChannelSelectMenuBuilder,
  ChannelType,
} = require('discord.js');

const emojis = require('../utils/emojis');

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
    .setName('setup')
    .setDescription('Configure the MMTC system')
    .setDefaultMemberPermissions(
      PermissionFlagsBits.ManageGuild
    ),

  async execute(interaction) {
    const guildIcon = interaction.guild.iconURL({
      extension: 'png',
      size: 256,
    });

    const gamemodeList = GAMEMODES
      .map(
        mode =>
          `${emojis.gamemodes[mode] || '🎯'} **${mode}**`
      )
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({
        name: 'MMTC • System Setup',
        iconURL:
          guildIcon ||
          interaction.client.user.displayAvatarURL(),
      })
      .setTitle('⚙️ MMTC Setup • Step 1/3')
      .setDescription(
        '### Configure MMTC\n\n' +
        'Set up the core channels for the **Minecraft MCPE Tier Testing Community**.\n\n' +
        '> 🎯 First, select the channel for the official Tier Testing Panel.\n' +
        '> 🛡️ Staff and Tester application channels will be configured next.'
      )
      .setThumbnail(guildIcon)
      .addFields(
        {
          name: '🎯 Tier Testing',
          value:
            'Players will start their official tier tests from the configured panel.',
          inline: false,
        },
        {
          name: '🎮 Gamemodes',
          value: gamemodeList,
          inline: true,
        },
        {
          name: '🏆 Tier Ladder',
          value:
            '`HT1` `MT1` `LT1`\n' +
            '`HT2` `MT2` `LT2`\n' +
            '`HT3` `MT3` `LT3`\n' +
            '`HT4` `MT4` `LT4`\n' +
            '`HT5` `MT5` `LT5`',
          inline: true,
        }
      )
      .setFooter({
        text: 'MMTC • Minecraft MCPE Tier Testing Community',
      })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ChannelSelectMenuBuilder()
        .setCustomId('setup_testing_channel')
        .setPlaceholder('🎯 Select Tier Testing panel channel')
        .setChannelTypes(ChannelType.GuildText)
        .setMinValues(1)
        .setMaxValues(1)
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
    });
  },
};
