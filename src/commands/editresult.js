const {
  SlashCommandBuilder,
  EmbedBuilder,
  MessageFlags,
} = require('discord.js');

const { readData, writeData } = require('../utils/playerData');
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
    .setName('editresult')
    .setDescription('Edit an MMTC tier test result.')
    .addStringOption(option =>
      option
        .setName('message_id')
        .setDescription('Discord result message ID')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('tier')
        .setDescription('New assigned tier')
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
        .setDescription('New score, e.g. 6-7')
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName('note')
        .setDescription('New tester note')
        .setRequired(false)
    ),

  async execute(interaction) {
    const isStaff = interaction.member.roles.cache.some(
      role => role.name === 'STAFF'
    );

    const isTester = interaction.member.roles.cache.some(
      role => role.name === 'MMTC TESTER'
    );

    if (!isStaff && !isTester) {
      return interaction.reply({
        content: '❌ You do not have permission to edit results.',
        flags: MessageFlags.Ephemeral,
      });
    }

    const messageId =
      interaction.options.getString('message_id');

    const newTier =
      interaction.options.getString('tier');

    const newScore =
      interaction.options.getString('score');

    const newNote =
      interaction.options.getString('note') ||
      'No note provided.';

    if (!/^\d+-\d+$/.test(newScore)) {
      return interaction.reply({
        content:
          '❌ Invalid score format. Use `number-number`, e.g. `6-7`.',
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply({
      flags: MessageFlags.Ephemeral,
    });

    try {
      /*
       * Fetch the actual old result message
       */
      const resultChannel =
        await interaction.client.channels
          .fetch(RESULT_CHANNEL_ID)
          .catch(() => null);

      if (!resultChannel || !resultChannel.isTextBased()) {
        return interaction.editReply({
          content:
            '❌ Configured MMTC result channel could not be found.',
        });
      }

      const message =
        await resultChannel.messages
          .fetch(messageId)
          .catch(() => null);

      if (!message) {
        return interaction.editReply({
          content:
            '❌ I could not find that result message in the MMTC result channel.',
        });
      }

      const oldEmbed = message.embeds[0];

      if (!oldEmbed) {
        return interaction.editReply({
          content:
            '❌ That message does not contain an MMTC result embed.',
        });
      }

      /*
       * Read information from the old embed
       */
      const fields = oldEmbed.fields || [];

      const getField = name => {
        const field = fields.find(
          field => field.name === name
        );

        return field?.value || null;
      };

      const playerField = getField('👤 Player');
      const ign = getField('⛏️ IGN');
      const region = getField('🌍 Region');
      const gamemode = getField('🎮 Gamemode');
      const testField = getField('🧪 Test');
      const oldTierField = getField('🏆 Assigned Tier');
      const oldScoreField = getField('📊 Score');
      const oldNoteField = getField('📝 Note');
      const testerField = getField('🛡️ Tester');

      if (!gamemode) {
        return interaction.editReply({
          content:
            '❌ Could not determine the gamemode from the old result.',
        });
      }

      /*
       * Get player ID from the Player field
       */
      const playerMatch =
        playerField?.match(/<@!?(\d+)>/);

      if (!playerMatch) {
        return interaction.editReply({
          content:
            '❌ Could not determine the player from the old result.',
        });
      }

      const playerId = playerMatch[1];

      /*
       * Find player in players.json
       */
      const data = readData();
      const playerData = data[playerId];

      if (!playerData) {
        return interaction.editReply({
          content:
            `❌ Player data for <@${playerId}> was not found.`,
        });
      }

      const modeData =
        playerData.gamemodes?.[gamemode];

      if (!modeData) {
        return interaction.editReply({
          content:
            `❌ No **${gamemode}** data was found for this player.`,
        });
      }

      /*
       * Find the matching historical result.
       *
       * Old results do not have resultMessageId,
       * so match using gamemode + tier + score + approximate
       * information stored in the history.
       */
      let historyIndex = -1;

      const history = modeData.history || [];

      const oldTier =
        oldTierField?.replace(/`/g, '').trim();

      const oldScore =
        oldScoreField?.replace(/`/g, '').trim();

      historyIndex = history.findIndex(result => {
        if (result.resultMessageId === messageId) {
          return true;
        }

        return (
          result.tier === oldTier &&
          result.score === oldScore
        );
      });

      if (historyIndex === -1) {
        return interaction.editReply({
          content:
            '❌ I found the Discord result, but could not match it to the player history in `players.json`.\n\n' +
            'The Discord message itself is valid, but the database entry is too old/incomplete to safely identify.',
        });
      }

      const result =
        history[historyIndex];

      const previousTier =
        result.previousTier || null;

      /*
       * Update gamemode history
       */
      result.tier = newTier;
      result.score = newScore;
      result.note = newNote;
      result.resultMessageId = messageId;
      result.resultChannelId = RESULT_CHANNEL_ID;
      result.editedBy = interaction.user.id;
      result.editedAt = new Date().toISOString();

      /*
       * Update current tier
       */
      modeData.tier = newTier;

      /*
       * Update global history
       */
      if (Array.isArray(playerData.history)) {
        for (const globalResult of playerData.history) {
          if (
            globalResult.gamemode === gamemode &&
            globalResult.tier === oldTier &&
            globalResult.score === oldScore
          ) {
            globalResult.tier = newTier;
            globalResult.score = newScore;
            globalResult.note = newNote;
            globalResult.resultMessageId = messageId;
            globalResult.resultChannelId = RESULT_CHANNEL_ID;
            globalResult.editedBy = interaction.user.id;
            globalResult.editedAt = new Date().toISOString();

            break;
          }
        }
      }

      data[playerId] = playerData;
      writeData(data);

      /*
       * Fetch player
       */
      const player =
        await interaction.client.users
          .fetch(playerId)
          .catch(() => null);

      const playerPFP = player
        ? player.displayAvatarURL({
            extension: 'png',
            size: 256,
          })
        : interaction.client.user.displayAvatarURL();

      const guildIcon =
        interaction.guild.iconURL({
          extension: 'png',
          size: 256,
        }) ||
        interaction.client.user.displayAvatarURL();

      /*
       * Build updated result embed
       */
      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
          name: 'MMTC • Minecraft MCPE Tier Testing',
          iconURL: guildIcon,
        })
        .setTitle('🏆  TIER TEST RESULT')
        .setDescription(
          `### ${player?.username || `<@${playerId}>`}\n` +
          `**${gamemode}** tier test has been completed successfully.`
        )
        .setThumbnail(playerPFP)
        .addFields(
          {
            name: '👤 Player',
            value: player
              ? `${player}`
              : `<@${playerId}>`,
            inline: true,
          },
          {
            name: '⛏️ IGN',
            value: ign || '`Not provided`',
            inline: true,
          },
          {
            name: '🌍 Region',
            value: region || '`Not provided`',
            inline: true,
          },
          {
            name: '🎮 Gamemode',
            value: gamemode,
            inline: true,
          },
          {
            name: '🧪 Test',
            value: testField || `#${modeData.tests || 1}`,
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
            value: `\`${newTier}\``,
            inline: true,
          },
          {
            name: '📊 Score',
            value: `\`${newScore}\``,
            inline: true,
          },
          {
            name: '📝 Note',
            value: newNote,
            inline: false,
          },
          {
            name: '🛡️ Tester',
            value:
              testerField || 'Unknown',
            inline: true,
          },
          {
            name: '✏️ Edited By',
            value: `${interaction.user}`,
            inline: true,
          }
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      /*
       * Edit the ORIGINAL Discord message
       */
      await message.edit({
        embeds: [embed],
      });

      await interaction.editReply({
        content:
          `✅ **Old result edited successfully!**\n\n` +
          `👤 Player: <@${playerId}>\n` +
          `🎮 Gamemode: **${gamemode}**\n` +
          `📉 Previous: **${oldTier || 'Unranked'}**\n` +
          `🏆 New: **${newTier}**\n` +
          `📊 Score: **${newScore}**`,
      });

    } catch (error) {
      console.error(
        '❌ Failed to edit old MMTC result:',
        error
      );

      await interaction.editReply({
        content:
          '❌ Failed to edit the result. Check the console.',
      }).catch(() => {});
    }
  },
};
