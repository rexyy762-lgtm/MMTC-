const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const {
  readData,
  writeData,
  getPlayer,
  setGamemodeCooldown,
} = require('../utils/playerData');

const { RESULT_CHANNEL_ID } = require('../utils/resultConfig');

const TIERS = [
  'HT1', 'MT1', 'LT1',
  'HT2', 'MT2', 'LT2',
  'HT3', 'MT3', 'LT3',
  'HT4', 'MT4', 'LT4',
  'HT5', 'MT5', 'LT5',
];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('result')
    .setDescription('Submit an MMTC tier test result.')
    .addUserOption(option =>
      option
        .setName('player')
        .setDescription('Player who was tested')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription('Assigned tier')
        .setRequired(true)
        .addChoices(
          ...TIERS.map(tier => ({
            name: tier,
            value: tier,
          }))
        )
    )
    .addStringOption(option =>
      option
        .setName('score')
        .setDescription('Score in number-number format, e.g. 6-7')
        .setRequired(true)
        .setMaxLength(20)
    )
    .addStringOption(option =>
      option
        .setName('note')
        .setDescription('Tester note about the performance')
        .setRequired(false)
        .setMaxLength(1000)
    ),

  async execute(interaction) {
    const channel = interaction.channel;

    // ==================== TICKET CHECK ====================

    if (!channel || !channel.topic?.startsWith('MMTC|')) {
      return interaction.reply({
        content:
          '❌ `/result` can only be used inside an **MMTC test ticket**.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const parts = channel.topic.split('|');

    const gamemode = parts[1];
    const playerId = parts[2];
    const testerRoleId = parts[3];
    const ign = parts[4] || 'Not provided';
    const region = parts[5] || 'Not provided';
    const claimed = parts[6] === 'claimed';
    const claimedBy = parts[7];

    if (!gamemode || !playerId || !testerRoleId) {
      return interaction.reply({
        content: '❌ This MMTC ticket has invalid data.',
        flags: MessageFlags.Ephemeral,
      });
    }

    if (!claimed || !claimedBy) {
      return interaction.reply({
        content:
          '❌ This ticket must be **claimed** by a tester first.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ==================== PERMISSIONS ====================

    const isClaimedTester = interaction.user.id === claimedBy;

    const isStaff = interaction.member.roles.cache.some(
      role => role.name === 'STAFF'
    );

    const isMMTCTester = interaction.member.roles.cache.some(
      role => role.name === 'MMTC TESTER'
    );

    const isGamemodeTester =
      interaction.member.roles.cache.has(testerRoleId);

    if (
      !isClaimedTester &&
      !isStaff &&
      !isMMTCTester &&
      !isGamemodeTester
    ) {
      return interaction.reply({
        content:
          '❌ You do not have permission to submit this test result.',
        flags: MessageFlags.Ephemeral,
      });
    }

    // ==================== OPTIONS ====================

    const player = interaction.options.getUser('player');
    const tier = interaction.options.getString('tier');
    const score = interaction.options.getString('score');

    const note =
      interaction.options.getString('note') ||
      'No note provided.';

    if (player.id !== playerId) {
      return interaction.reply({
        content:
          `❌ This ticket belongs to <@${playerId}>. Please select the correct player.`,
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    if (!/^\d+-\d+$/.test(score)) {
      return interaction.editReply({
        content:
          '❌ Invalid score format. Use **number-number**, for example `6-7`.',
      });
    }

    try {
      // ==================== PLAYER DATA ====================

      const data = readData();
      const playerData = getPlayer(player.id);

      if (!playerData.gamemodes) {
        playerData.gamemodes = {};
      }

      if (!playerData.gamemodes[gamemode]) {
        playerData.gamemodes[gamemode] = {
          tier: null,
          tests: 0,
          history: [],
        };
      }

      const modeData = playerData.gamemodes[gamemode];

      const previousTier = modeData.tier || null;

      modeData.tier = tier;
      modeData.tests += 1;

      modeData.history.push({
        tier,
        previousTier,
        score,
        note,
        testerId: interaction.user.id,
        ticketId: channel.id,
        timestamp: new Date().toISOString(),
      });

      if (!playerData.stats) {
        playerData.stats = {
          tests: 0,
          wins: 0,
          losses: 0,
        };
      }

      playerData.stats.tests += 1;

      if (!playerData.history) {
        playerData.history = [];
      }

      playerData.history.push({
        gamemode,
        tier,
        previousTier,
        score,
        note,
        testerId: interaction.user.id,
        ticketId: channel.id,
        timestamp: new Date().toISOString(),
      });

      data[player.id] = playerData;
      writeData(data);

      // ==================== 7-DAY GAMEMODE COOLDOWN ====================

      setGamemodeCooldown(
        player.id,
        gamemode,
        7 * 24 * 60 * 60 * 1000
      );

      // ==================== RESULT EMBED ====================

      const playerPFP = player.displayAvatarURL({
        extension: 'png',
        size: 256,
      });

      const guildIcon =
        interaction.guild.iconURL({
          extension: 'png',
          size: 256,
        }) || interaction.client.user.displayAvatarURL();

      const resultEmbed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
          name: 'MMTC • Minecraft MCPE Tier Testing',
          iconURL: guildIcon,
        })
        .setTitle('🏆  TIER TEST RESULT')
        .setDescription(
          `### ${player.username}\n` +
          `**${gamemode}** tier test has been completed successfully.`
        )
        .setThumbnail(playerPFP)
        .addFields(
          {
            name: '👤 Player',
            value: `${player}`,
            inline: true,
          },
          {
            name: '⛏️ IGN',
            value: `\`${ign}\``,
            inline: true,
          },
          {
            name: '🌍 Region',
            value: `\`${region}\``,
            inline: true,
          },
          {
            name: '🎮 Gamemode',
            value: gamemode,
            inline: true,
          },
          {
            name: '🧪 Test',
            value: `#${modeData.tests}`,
            inline: true,
          },
          {
            name: '📉 Previous Tier',
            value: previousTier
              ? `\`${previousTier}\``
              : '`Unranked`',
            inline: true,
          },
          {
            name: '🏆 Assigned Tier',
            value: `\`${tier}\``,
            inline: true,
          },
          {
            name: '📊 Score',
            value: `\`${score}\``,
            inline: true,
          },
          {
            name: '📝 Note',
            value: note,
            inline: false,
          },
          {
            name: '🛡️ Tester',
            value: `${interaction.user}`,
            inline: true,
          }
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      // ==================== RESULT CHANNEL ====================

      const resultChannel =
        interaction.guild.channels.cache.get(RESULT_CHANNEL_ID);

      if (!resultChannel || !resultChannel.isTextBased()) {
        return interaction.editReply({
          content:
            '⚠️ Result saved successfully, but the configured result channel could not be found.',
        });
      }

      const resultMessage =
        `🏆 <@${player.id}> your **${gamemode}** result has been recorded as **${tier}** with a score of **${score}**.`;

      await resultChannel.send({
        content: resultMessage,
        embeds: [resultEmbed],
      });

      // ==================== TICKET CONFIRMATION ====================

      await channel.send({
        content: resultMessage,
      });

      await interaction.editReply({
        content:
          `✅ Result submitted successfully!\n\n` +
          `🎮 **${gamemode}**\n` +
          `📉 Previous: **${previousTier || 'Unranked'}**\n` +
          `🏆 Assigned: **${tier}**\n` +
          `📊 Score: **${score}**\n\n` +
          `📢 Result posted in <#${RESULT_CHANNEL_ID}>.`,
      });

    } catch (error) {
      console.error('❌ Failed to save MMTC result:', error);

      if (interaction.deferred || interaction.replied) {
        await interaction.editReply({
          content:
            '❌ I could not save/post this result. Please try again.',
        }).catch(() => {});
      }
    }
  },
};
