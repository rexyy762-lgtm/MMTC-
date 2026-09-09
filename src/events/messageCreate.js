const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');

const { getPlayer } = require('../utils/playerData');
const { handleApplicationMessage } = require('../utils/applicationHandler');

module.exports = {
  name: 'messageCreate',

  async execute(message) {
    if (message.author.bot) return;
    if (!message.guild) return;

    if (await handleApplicationMessage(message)) return;

    const prefix = '.';

    if (!message.content.startsWith(prefix)) return;

    const args = message.content
      .slice(prefix.length)
      .trim()
      .split(/\s+/);

    const commandName = args.shift()?.toLowerCase();

    if (!commandName) return;

    if (commandName === 'profile') {
      const target =
        message.mentions.users.first() || message.author;

      const player = getPlayer(target.id);

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
          name: 'MMTC • Player Profile',
          iconURL: message.client.user.displayAvatarURL(),
        })
        .setTitle(`🏆 ${target.username}`)
        .setDescription(
          `> **MINECRAFT MCPE TIER TESTING COMMUNITY**\n` +
          `> Official MMTC Player Profile\n\n` +
          `👤 **Player**\n${target}\n\n` +
          `📊 **Testing Overview**\n` +
          `> Tests Completed: **${player.stats.tests}**\n` +
          `> Current Status: **Unranked**`
        )
        .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields({
          name: '🧊 MMTC',
          value: 'Tier Testing Community',
          inline: true,
        })
        .addFields({
          name: '📋 Tests',
          value: `\`${player.stats.tests}\``,
          inline: true,
        })
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId(`profile_tier_${target.id}`)
          .setLabel('Tier')
          .setEmoji('🏆')
          .setStyle(ButtonStyle.Primary),
      );

      await message.reply({
        embeds: [embed],
        components: [row],
      });
    }
  },
};
