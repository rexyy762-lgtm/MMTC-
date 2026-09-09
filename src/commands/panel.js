const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
} = require('discord.js');

const { getSetup } = require('../utils/setupConfig');
const emojis = require('../utils/emojis');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('panel')
    .setDescription('Review and send the MMTC tier testing panel')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    const setup = getSetup(interaction.guildId);

    if (!setup) {
      return interaction.reply({
        content:
          '❌ MMTC is not configured yet. Please run `/setup` first.',
        ephemeral: true,
      });
    }

    const channel = interaction.guild.channels.cache.get(
      setup.testingChannelId
    );

    if (!channel) {
      return interaction.reply({
        content:
          '❌ The configured testing channel no longer exists. Please run `/setup` again.',
        ephemeral: true,
      });
    }

    const guildIcon = interaction.guild.iconURL({
      extension: 'png',
      size: 256,
    });

    const gamemodeLines = setup.gamemodes
      .map(
        (mode) =>
          `${emojis.gamemodes[mode] || '🎯'} **${mode}**`
      )
      .join('\n');

    const embed = new EmbedBuilder()
      .setColor('#5865F2')
      .setAuthor({
        name: 'MMTC • Tier Testing System',
        iconURL:
          guildIcon || interaction.client.user.displayAvatarURL(),
      })
      .setTitle('🧊 Tier Testing Panel')
      .setDescription(
        `### MINECRAFT MCPE TIER TESTING COMMUNITY\n\n` +
        `You're about to publish the **official MMTC Tier Testing Panel** for **${interaction.guild.name}**.\n\n` +
        `> Players will use this panel to select their desired gamemode and begin their tier testing process.\n\n` +
        `**Before publishing, review the configuration below.**`
      )
      .setThumbnail(guildIcon)
      .addFields(
        {
          name: '📋 Testing Channel',
          value: `<#${setup.testingChannelId}>`,
          inline: true,
        },
        {
          name: '🏆 Tier Ladder',
          value:
            '`HT1` • `MT1` • `LT1`\n' +
            '`HT2` • `MT2` • `LT2`\n' +
            '`HT3` • `MT3` • `LT3`\n' +
            '`HT4` • `MT4` • `LT4`\n' +
            '`HT5` • `MT5` • `LT5`',
          inline: true,
        },
        {
          name: '🎮 Available Gamemodes',
          value: gamemodeLines,
          inline: false,
        },
        {
          name: '👤 Player Flow',
          value:
            '`1.` Select a gamemode\n' +
            '`2.` Begin the tier test\n' +
            '`3.` Tester evaluates the player\n' +
            '`4.` Tier result is recorded\n' +
            '`5.` Player profile & leaderboard update',
          inline: false,
        },
        {
          name: '⚠️ Publish Notice',
          value:
            'The testing panel will be sent to the configured channel when you select **Send Testing Panel** below.',
          inline: false,
        }
      )
      .setFooter({
        text: 'MMTC • Minecraft MCPE Tier Testing Community',
      })
      .setTimestamp();

    const menu = new StringSelectMenuBuilder()
      .setCustomId('panel_action')
      .setPlaceholder('Select an action')
      .addOptions([
        {
          label: 'Send Testing Panel',
          description: `Publish the panel in #${channel.name}`,
          value: 'send',
          emoji: '📤',
        },
        {
          label: 'Cancel',
          description: 'Cancel and close the panel preview',
          value: 'cancel',
          emoji: '❌',
        },
      ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await interaction.reply({
      embeds: [embed],
      components: [row],
      ephemeral: true,
    });
  },
};
