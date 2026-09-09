const {
  EmbedBuilder,
  ActionRowBuilder,
  StringSelectMenuBuilder,
  UserSelectMenuBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ButtonBuilder,
  ButtonStyle,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const {
  getPlayer,
  getGamemodeCooldown,
} = require('../utils/playerData');
const { GAMEMODES } = require('../utils/tierConfig');
const emojis = require('../utils/emojis');
const { TICKET_CATEGORY_ID } = require('../utils/ticketConfig');
const { startApplication, handleApplicationModal, handleApplicationAction, sendApplicationPanels } = require('../utils/applicationHandler');

module.exports = {
  name: 'interactionCreate',

  async execute(interaction) {
    console.log(
      'INTERACTION:',
      interaction.type,
      interaction.isButton() ? interaction.customId : interaction.commandName || 'non-button'
    );

    // ==================== SLASH COMMANDS ====================

    if (interaction.isChatInputCommand()) {
      const command = interaction.client.commands.get(
        interaction.commandName
      );

      if (!command) return;

      try {
        await command.execute(interaction);
      } catch (error) {
        console.error(
          `❌ Error executing /${interaction.commandName}:`,
          error
        );

        const reply = {
          content: '❌ Something went wrong while executing this command.',
          ephemeral: true,
        };

        if (interaction.replied || interaction.deferred) {
          await interaction.followUp(reply).catch(() => {});
        } else {
          await interaction.reply(reply).catch(() => {});
        }
      }

      return;
    }

    // ==================== MMTC APPLICATION SYSTEM ====================

    if (
      interaction.isButton() &&
      (
        interaction.customId === 'application_start_staff' ||
        interaction.customId === 'application_start_tester'
      )
    ) {
      const type = interaction.customId.endsWith('staff')
        ? 'staff'
        : 'tester';

      return startApplication(interaction, type);
    }

    if (
      interaction.isModalSubmit() &&
      /^application_modal_(staff|tester)_(1|2)$/.test(
        interaction.customId
      )
    ) {
      return handleApplicationModal(interaction);
    }

    if (
      interaction.isButton() &&
      (
        interaction.customId.startsWith('application_accept_') ||
        interaction.customId.startsWith('application_deny_') ||
        interaction.customId.startsWith('application_close_')
      )
    ) {
      console.log('APPLICATION BUTTON:', interaction.customId);
      return handleApplicationAction(interaction);
    }

    // ==================== MMTC SETUP WIZARD ====================

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId === 'setup_testing_channel'
    ) {
      const { getSetup, saveSetup } = require('../utils/setupConfig');
      const current = getSetup(interaction.guildId) || {};

      saveSetup(interaction.guildId, {
        ...current,
        testingChannelId: interaction.values[0],
        gamemodes: [
          'SKYWARS',
          'MIDFIGHT',
          'NODEBUFF',
          'MACE',
          'BUILD UHC',
          'CRYSTAL PVP',
        ],
      });

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setTitle('⚙️ MMTC Setup • Step 2/3')
        .setDescription(
          '### 🛡️ Staff Application Channel\n\n' +
          'Select the channel where the **Staff Application Panel** will be posted.\n\n' +
          '> Members will use this panel to apply for the MMTC Staff Team.'
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      const { ChannelSelectMenuBuilder, ChannelType } =
        require('discord.js');

      const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('setup_staff_application_channel')
          .setPlaceholder('🛡️ Select staff application channel')
          .setChannelTypes(ChannelType.GuildText)
          .setMinValues(1)
          .setMaxValues(1)
      );

      return interaction.update({
        embeds: [embed],
        components: [row],
      });
    }

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId === 'setup_staff_application_channel'
    ) {
      const { getSetup, saveSetup } = require('../utils/setupConfig');
      const current = getSetup(interaction.guildId) || {};

      saveSetup(interaction.guildId, {
        ...current,
        staffApplicationChannelId: interaction.values[0],
      });

      const embed = new EmbedBuilder()
        .setColor('#8B5CF6')
        .setTitle('⚙️ MMTC Setup • Step 3/3')
        .setDescription(
          '### 🧪 Tester Application Channel\n\n' +
          'Select the channel where the **Tester Application Panel** will be posted.\n\n' +
          '> Members will use this panel to apply for the official MMTC Tester Team.'
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      const { ChannelSelectMenuBuilder, ChannelType } =
        require('discord.js');

      const row = new ActionRowBuilder().addComponents(
        new ChannelSelectMenuBuilder()
          .setCustomId('setup_tester_application_channel')
          .setPlaceholder('🧪 Select tester application channel')
          .setChannelTypes(ChannelType.GuildText)
          .setMinValues(1)
          .setMaxValues(1)
      );

      return interaction.update({
        embeds: [embed],
        components: [row],
      });
    }

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId === 'setup_tester_application_channel'
    ) {
      const { getSetup, saveSetup } = require('../utils/setupConfig');
      const current = getSetup(interaction.guildId) || {};

      const finalSetup = saveSetup(interaction.guildId, {
        ...current,
        testerApplicationChannelId: interaction.values[0],
      });

      let panelStatus = true;

      try {
        await sendApplicationPanels(
          interaction.guild,
          finalSetup
        );
      } catch (error) {
        panelStatus = false;
        console.error(
          '❌ Failed to send MMTC application panels:',
          error
        );
      }

      const embed = new EmbedBuilder()
        .setColor(panelStatus ? '#57F287' : '#ED4245')
        .setTitle(
          panelStatus
            ? '✅ MMTC Setup Complete'
            : '⚠️ MMTC Setup Saved'
        )
        .setDescription(
          panelStatus
            ? '### Everything is ready!\n\n' +
              'MMTC Tier Testing and Applications are configured.\n\n' +
              '> 🎯 Tier Testing configured\n' +
              '> 🛡️ Staff Application Panel sent\n' +
              '> 🧪 Tester Application Panel sent'
            : '### Configuration saved\n\n' +
              'Channels were saved, but the application panels could not be sent.\n\n' +
              'Check bot permissions and run `/setup` again.'
        )
        .addFields(
          {
            name: '🎯 Tier Testing',
            value: '<#' + finalSetup.testingChannelId + '>',
            inline: true,
          },
          {
            name: '🛡️ Staff Applications',
            value: '<#' + finalSetup.staffApplicationChannelId + '>',
            inline: true,
          },
          {
            name: '🧪 Tester Applications',
            value: '<#' + finalSetup.testerApplicationChannelId + '>',
            inline: true,
          },
          {
            name: '📂 Application Category',
            value: '<#1545744969359167498>',
            inline: true,
          },
          {
            name: '📋 Application Logs',
            value: '<#1545750619694825543>',
            inline: true,
          }
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      return interaction.update({
        embeds: [embed],
        components: [],
      });
    }


    // ==================== SETUP CHANNELS ====================

    if (
      interaction.isChannelSelectMenu() &&
      interaction.customId === 'setup_testing_channel'
    ) {
      const { saveSetup } = require('../utils/setupConfig');

      const channelId = interaction.values[0];

      saveSetup(interaction.guildId, {
        testingChannelId: channelId,
        gamemodes: [
          'SKYWARS',
          'MIDFIGHT',
          'NODEBUFF',
          'MACE',
          'BUILD UHC',
          'CRYSTAL PVP',
        ],
      });

      const guildIcon = interaction.guild.iconURL({
        extension: 'png',
        size: 256,
      });

      const gamemodeLines = [
        `${emojis.gamemodes.SKYWARS || '🎯'} **SKYWARS**`,
        `${emojis.gamemodes.MIDFIGHT || '🎯'} **MIDFIGHT**`,
        `${emojis.gamemodes.NODEBUFF || '🎯'} **NODEBUFF**`,
        `${emojis.gamemodes.MACE || '🎯'} **MACE**`,
        `${emojis.gamemodes['BUILD UHC'] || '🎯'} **BUILD UHC**`,
        `${emojis.gamemodes['CRYSTAL PVP'] || '🎯'} **CRYSTAL PVP**`,
      ].join('\n');

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
          name: 'MMTC • Tier Testing System',
          iconURL: guildIcon || interaction.client.user.displayAvatarURL(),
        })
        .setTitle('✅ Setup Complete')
        .setDescription(
          `### MINECRAFT MCPE TIER TESTING COMMUNITY\n` +
          `The **MMTC Tier Testing System** is ready for **${interaction.guild.name}**.\n\n` +
          `> Your testing configuration has been saved successfully.`
        )
        .setThumbnail(guildIcon)
        .addFields(
          {
            name: '📋 Testing Channel',
            value: `<#${channelId}>`,
            inline: true,
          },
          {
            name: '🏆 Tier System',
            value: '`HT1` → `LT5` • 15 Tiers',
            inline: true,
          },
          {
            name: '🎮 Enabled Gamemodes',
            value: gamemodeLines,
            inline: false,
          },
          {
            name: '🚀 Next Step',
            value:
              'Use `/panel` to review the configuration and send the official MMTC testing panel.',
            inline: false,
          }
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      await interaction.update({
        embeds: [embed],
        components: [],
      });

      return;
    }

    // ==================== PANEL ACTION ====================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'panel_action'
    ) {
      const { getSetup } = require('../utils/setupConfig');

      const setup = getSetup(interaction.guildId);

      if (!setup) {
        return interaction.update({
          content: '❌ MMTC setup was not found. Run `/setup` first.',
          embeds: [],
          components: [],
        });
      }

      const action = interaction.values[0];

      if (action === 'cancel') {
        await interaction.update({
          content: '❌ Panel setup cancelled.',
          embeds: [],
          components: [],
        });

        return;
      }

      if (action === 'send') {
        const channel = interaction.guild.channels.cache.get(
          setup.testingChannelId
        );

        if (!channel) {
          await interaction.update({
            content:
              '❌ The configured testing channel no longer exists. Run `/setup` again.',
            embeds: [],
            components: [],
          });

          return;
        }

        const guildIcon = interaction.guild.iconURL({
          extension: 'png',
          size: 256,
        });

        const gamemodeOptions = setup.gamemodes.map((mode) => ({
          label: mode,
          value: mode,
          description: `Start your ${mode} tier test`,
          emoji: emojis.gamemodes[mode] || '🎯',
        }));

        const gamemodeMenu = new StringSelectMenuBuilder()
          .setCustomId('tier_gamemode_select')
          .setPlaceholder('🎮 Select a gamemode to begin testing')
          .addOptions(gamemodeOptions);

        const gamemodeRow = new ActionRowBuilder().addComponents(
          gamemodeMenu
        );

        const panelEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({
            name: 'MMTC • Official Tier Testing',
            iconURL:
              guildIcon || interaction.client.user.displayAvatarURL(),
          })
          .setTitle('🧊 MMTC Tier Testing')
          .setDescription(
            `### MINECRAFT MCPE TIER TESTING COMMUNITY\n\n` +
            `Welcome to the **official MMTC Tier Testing System**.\n\n` +
            `Want to get your Minecraft MCPE skills ranked? Select the **gamemode** you want to be tested in from the menu below.\n\n` +
            `> 🎯 Choose your gamemode\n` +
            `> 🧪 Complete your tier test\n` +
            `> 🏆 Receive your official MMTC tier\n\n` +
            `**Tier Ladder**\n` +
            '`HT1` → `MT1` → `LT1` → `HT2` → `MT2` → `LT2` → `HT3` → `MT3` → `LT3` → `HT4` → `MT4` → `LT4` → `HT5` → `MT5` → `LT5`\n\n' +
            `**Ready to get tested?**\n` +
            `Select a gamemode below to begin.`
          )
          .setThumbnail(guildIcon)
          .addFields({
            name: '🎮 Available Gamemodes',
            value: setup.gamemodes
              .map(
                (mode) =>
                  `${emojis.gamemodes[mode] || '🎯'} **${mode}**`
              )
              .join('\n'),
            inline: false,
          })
          .setFooter({
            text: 'MMTC • Minecraft MCPE Tier Testing Community',
          })
          .setTimestamp();

        await channel.send({
          embeds: [panelEmbed],
          components: [gamemodeRow],
        });

        await interaction.update({
          content:
            `✅ **MMTC Tier Testing Panel sent successfully!**\n\n` +
            `📋 ${channel}`,
          embeds: [],
          components: [],
        });

        return;
      }
    }

    // ==================== GAMEMODE SELECTION ====================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'tier_gamemode_select'
    ) {
      const selectedGamemode = interaction.values[0];

      const { TESTER_ROLES } = require('../utils/testerConfig');

      const testerRoleId = TESTER_ROLES[selectedGamemode];

      if (!testerRoleId) {
        return interaction.reply({
          content: '❌ No tester role is configured for this gamemode.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const guild = interaction.guild;

      const safeGamemode = selectedGamemode
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const ticketName = `test-${safeGamemode}-${interaction.user.username}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 90);

      const cooldownUntil = getGamemodeCooldown(
        interaction.user.id,
        selectedGamemode
      );

      if (cooldownUntil > Date.now()) {
        const remainingMs = cooldownUntil - Date.now();
        const remainingDays = Math.ceil(
          remainingMs / (24 * 60 * 60 * 1000)
        );

        const nextAvailable = `<t:${Math.floor(
          cooldownUntil / 1000
        )}:F>`;

        return interaction.reply({
          content:
            `⏳ **Testing Cooldown**\n\n` +
            `You can request another **${selectedGamemode}** tier test in **${remainingDays} day${remainingDays === 1 ? '' : 's'}**.\n` +
            `📅 Next available: ${nextAvailable}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      const existingTicket = guild.channels.cache.find(
        (channel) =>
          channel.name === ticketName &&
          channel.type === 0
      );

      if (existingTicket) {
        return interaction.reply({
          content:
            `❌ You already have an active **${selectedGamemode}** test ticket: ${existingTicket}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      // Ask for IGN + Region BEFORE creating the ticket.
      const modal = new ModalBuilder()
        .setCustomId(
          `tier_info_modal_${interaction.user.id}_${encodeURIComponent(selectedGamemode)}`
        )
        .setTitle('MMTC • Tier Test Information');

      const ignInput = new TextInputBuilder()
        .setCustomId('tier_test_ign')
        .setLabel('Minecraft IGN')
        .setPlaceholder('Enter your exact Minecraft IGN')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(32);

      const regionInput = new TextInputBuilder()
        .setCustomId('tier_test_region')
        .setLabel('Region')
        .setPlaceholder('e.g. AS, EU, NA')
        .setStyle(TextInputStyle.Short)
        .setRequired(true)
        .setMinLength(1)
        .setMaxLength(30);

      modal.addComponents(
        new ActionRowBuilder().addComponents(ignInput),
        new ActionRowBuilder().addComponents(regionInput)
      );

      return interaction.showModal(modal);
    }

    // ==================== TIER TEST INFORMATION MODAL ====================

    if (
      interaction.isModalSubmit() &&
      interaction.customId.startsWith('tier_info_modal_')
    ) {
      const modalData = interaction.customId.slice(
        'tier_info_modal_'.length
      );

      const separator = modalData.indexOf('_');

      if (separator === -1) {
        return interaction.reply({
          content: '❌ Invalid tier test information.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const playerIdFromModal = modalData.slice(0, separator);
      const selectedGamemode = decodeURIComponent(
        modalData.slice(separator + 1)
      );

      if (playerIdFromModal !== interaction.user.id) {
        return interaction.reply({
          content: '❌ This tier test form does not belong to you.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const ign = interaction.fields
        .getTextInputValue('tier_test_ign')
        .trim()
        .replace(/\|/g, '/');

      const region = interaction.fields
        .getTextInputValue('tier_test_region')
        .trim()
        .replace(/\|/g, '/');

      if (!ign || !region) {
        return interaction.reply({
          content: '❌ IGN and Region are both required.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const { TESTER_ROLES } = require('../utils/testerConfig');
      const testerRoleId = TESTER_ROLES[selectedGamemode];

      if (!testerRoleId) {
        return interaction.reply({
          content: '❌ No tester role is configured for this gamemode.',
          flags: MessageFlags.Ephemeral,
        });
      }

      const guild = interaction.guild;

      const safeGamemode = selectedGamemode
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      const ticketName = `test-${safeGamemode}-${interaction.user.username}`
        .toLowerCase()
        .replace(/[^a-z0-9-]/g, '')
        .slice(0, 90);

      const existingTicket = guild.channels.cache.find(
        (channel) =>
          channel.name === ticketName &&
          channel.type === 0
      );

      if (existingTicket) {
        return interaction.reply({
          content:
            `❌ You already have an active **${selectedGamemode}** test ticket: ${existingTicket}`,
          flags: MessageFlags.Ephemeral,
        });
      }

      await interaction.deferReply({
        flags: MessageFlags.Ephemeral,
      });

      try {
        const ticketChannel = await guild.channels.create({
          name: ticketName,
          type: 0,
          parent: TICKET_CATEGORY_ID,

          // MMTC|gamemode|playerId|testerRoleId|IGN|Region
          topic:
            `MMTC|${selectedGamemode}|${interaction.user.id}|${testerRoleId}|${ign}|${region}`,

          permissionOverwrites: [
            {
              id: guild.roles.everyone.id,
              deny: ['ViewChannel'],
            },
            {
              id: interaction.user.id,
              allow: [
                'ViewChannel',
                'SendMessages',
                'ReadMessageHistory',
                'AttachFiles',
              ],
            },
            {
              id: testerRoleId,
              allow: [
                'ViewChannel',
                'SendMessages',
                'ReadMessageHistory',
                'AttachFiles',
              ],
            },
            {
              id: guild.members.me.id,
              allow: [
                'ViewChannel',
                'SendMessages',
                'ReadMessageHistory',
                'ManageChannels',
                'ManageMessages',
              ],
            },
          ],
        });

        const guildIcon = guild.iconURL({
          extension: 'png',
          size: 256,
        });

        const ticketEmbed = new EmbedBuilder()
          .setColor('#5865F2')
          .setAuthor({
            name: 'MMTC • Tier Testing',
            iconURL:
              guildIcon || interaction.client.user.displayAvatarURL(),
          })
          .setTitle('🧪 New Tier Test')
          .setDescription(
            `A new **MMTC Tier Test** has been requested.\n\n` +
            `> 🎮 **Gamemode:** ${selectedGamemode}\n` +
            `> 👤 **Player:** ${interaction.user}\n` +
            `> ⛏️ **IGN:** \`${ign}\`\n` +
            `> 🌍 **Region:** \`${region}\`\n` +
            `> 🧪 **Tester:** <@&${testerRoleId}>\n\n` +
            `A tester should claim this ticket and begin the test.`
          )
          .setThumbnail(guildIcon)
          .addFields(
            {
              name: '📌 Status',
              value: '`UNCLAIMED`',
              inline: true,
            },
            {
              name: '🎯 Gamemode',
              value: selectedGamemode,
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
            }
          )
          .setFooter({
            text: 'MMTC • Minecraft MCPE Tier Testing Community',
          })
          .setTimestamp();

        const ticketButtons = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_claim_${interaction.user.id}`)
            .setLabel('Claim')
            .setEmoji('🧪')
            .setStyle(ButtonStyle.Primary),

          new ButtonBuilder()
            .setCustomId(`ticket_close_${interaction.user.id}`)
            .setLabel('Close')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger)
        );

        await ticketChannel.send({
          content: `${interaction.user} <@&${testerRoleId}>`,
          embeds: [ticketEmbed],
          components: [ticketButtons],
        });

        await interaction.editReply({
          content:
            `✅ Your **${selectedGamemode}** test ticket has been created: ${ticketChannel}`,
        });
      } catch (error) {
        console.error('❌ Failed to create tier test ticket:', error);

        await interaction.editReply({
          content:
            '❌ I could not create your test ticket. Please check my channel permissions.',
        });
      }

      return;
    }

    // ==================== TICKET BUTTONS ====================

    if (interaction.isButton()) {
      const customId = interaction.customId;
      const channel = interaction.channel;

      // ---------- ROLE CHECK ----------
      const hasTicketClaimRole = (testerRoleId) => {
        const member = interaction.member;

        const isGamemodeTester =
          testerRoleId &&
          member.roles.cache.has(testerRoleId);

        const isStaff =
          member.roles.cache.some(
            (role) => role.name === 'STAFF'
          );

        const isMMTCTester =
          member.roles.cache.some(
            (role) => role.name === 'MMTC TESTER'
          );

        return isGamemodeTester || isStaff || isMMTCTester;
      };

      // ---------- CLAIM ----------
      if (customId.startsWith('ticket_claim_')) {
        if (!channel || !channel.topic?.startsWith('MMTC|')) {
          return interaction.reply({
            content: '❌ This is not a valid MMTC ticket.',
            flags: MessageFlags.Ephemeral,
          });
        }

        const parts = channel.topic.split('|');
        const gamemode = parts[1];
        const playerId = parts[2];
        const testerRoleId = parts[3];
        const ign = parts[4] || 'Not provided';
        const region = parts[5] || 'Not provided';
        const alreadyClaimed = parts[6] === 'claimed';

        if (!hasTicketClaimRole(testerRoleId)) {
          return interaction.reply({
            content:
              '❌ Only **STAFF**, **MMTC TESTER**, or the selected gamemode tester can claim this ticket.',
            flags: MessageFlags.Ephemeral,
          });
        }

        if (alreadyClaimed) {
          return interaction.reply({
            content: '❌ This ticket has already been claimed.',
            flags: MessageFlags.Ephemeral,
          });
        }

        // Acknowledge immediately to prevent Discord 10062.
        await interaction.deferReply({
          flags: MessageFlags.Ephemeral,
        });

        try {
          await channel.setTopic(
            `MMTC|${gamemode}|${playerId}|${testerRoleId}|${ign}|${region}|claimed|${interaction.user.id}`
          );

          const claimedEmbed = EmbedBuilder.from(
            interaction.message.embeds[0]
          )
            .setColor('#57F287')
            .setFields(
              {
                name: '📌 Status',
                value: '`CLAIMED`',
                inline: true,
              },
              {
                name: '🎯 Gamemode',
                value: gamemode,
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
                name: '🧪 Tester',
                value: `${interaction.user}`,
                inline: true,
              }
            );

          const claimedButtons = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
              .setCustomId(`ticket_claim_${playerId}`)
              .setLabel('Claimed')
              .setEmoji('🧪')
              .setStyle(ButtonStyle.Success)
              .setDisabled(true),

            new ButtonBuilder()
              .setCustomId(`ticket_close_${playerId}`)
              .setLabel('Close')
              .setEmoji('🔒')
              .setStyle(ButtonStyle.Danger)
          );

          await interaction.message.edit({
            embeds: [claimedEmbed],
            components: [claimedButtons],
          });

          const { TICKET_LOG_CHANNEL_ID } =
            require('../utils/ticketConfig');

          const logChannel =
            interaction.guild.channels.cache.get(
              TICKET_LOG_CHANNEL_ID
            );

          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor('#57F287')
              .setTitle('🧪 Ticket Claimed')
              .addFields(
                {
                  name: '👤 Player',
                  value: `<@${playerId}>`,
                  inline: true,
                },
                {
                  name: '🧪 Tester',
                  value: `${interaction.user}`,
                  inline: true,
                },
                {
                  name: '🎮 Gamemode',
                  value: gamemode,
                  inline: true,
                },
                {
                  name: '🎫 Ticket',
                  value: `${channel}`,
                  inline: false,
                }
              )
              .setFooter({
                text: 'MMTC • Ticket Logs',
              })
              .setTimestamp();

            await logChannel.send({
              embeds: [logEmbed],
            });
          }

          await interaction.editReply({
            content:
              `🧪 ${interaction.user} has claimed this **${gamemode}** test.`,
          });
        } catch (error) {
          console.error('❌ Failed to claim ticket:', error);

          await interaction.editReply({
            content:
              '❌ Something went wrong while claiming this ticket.',
          });
        }

        return;
      }

      // ---------- CLOSE ----------
      if (customId.startsWith('ticket_close_')) {
        if (!channel || !channel.topic?.startsWith('MMTC|')) {
          return interaction.reply({
            content: '❌ This is not a valid MMTC ticket.',
            flags: MessageFlags.Ephemeral,
          });
        }

        const parts = channel.topic.split('|');
        const gamemode = parts[1];
        const testerRoleId = parts[3];
        const ign = parts[4] || 'Not provided';
        const region = parts[5] || 'Not provided';

        const isAllowed =
          hasTicketClaimRole(testerRoleId) ||
          interaction.member.permissions.has(
            PermissionFlagsBits.ManageChannels
          );

        if (!isAllowed) {
          return interaction.reply({
            content:
              '❌ Only **STAFF**, **MMTC TESTER**, the selected gamemode tester, or server staff can close this ticket.',
            flags: MessageFlags.Ephemeral,
          });
        }

        const playerId = parts[2];

        const confirmRow = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId(`ticket_confirm_close_${playerId}`)
            .setLabel('Confirm Close')
            .setEmoji('🔒')
            .setStyle(ButtonStyle.Danger),

          new ButtonBuilder()
            .setCustomId('ticket_cancel_close')
            .setLabel('Cancel')
            .setEmoji('↩️')
            .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
          content:
            `⚠️ Are you sure you want to close this **${gamemode}** ticket?`,
          components: [confirmRow],
          flags: MessageFlags.Ephemeral,
        });

        return;
      }

      // ---------- CANCEL CLOSE ----------
      if (customId === 'ticket_cancel_close') {
        await interaction.update({
          content: '✅ Ticket close cancelled.',
          components: [],
        });

        return;
      }

      // ---------- CONFIRM CLOSE ----------
      if (customId.startsWith('ticket_confirm_close_')) {
        if (!channel || !channel.topic?.startsWith('MMTC|')) {
          return interaction.update({
            content: '❌ This is not a valid MMTC ticket.',
            components: [],
          });
        }

        const parts = channel.topic.split('|');
        const gamemode = parts[1];
        const playerId = parts[2];
        const testerRoleId = parts[3];
        const ign = parts[4] || 'Not provided';
        const region = parts[5] || 'Not provided';

        const isAllowed =
          hasTicketClaimRole(testerRoleId) ||
          interaction.member.permissions.has(
            PermissionFlagsBits.ManageChannels
          );

        if (!isAllowed) {
          return interaction.update({
            content:
              '❌ You no longer have permission to close this ticket.',
            components: [],
          });
        }

        // Acknowledge immediately before API operations.
        await interaction.deferUpdate();

        try {
          const { TICKET_LOG_CHANNEL_ID } =
            require('../utils/ticketConfig');

          const logChannel =
            interaction.guild.channels.cache.get(
              TICKET_LOG_CHANNEL_ID
            );

          if (logChannel) {
            const logEmbed = new EmbedBuilder()
              .setColor('#ED4245')
              .setTitle('🔒 Ticket Closed')
              .addFields(
                {
                  name: '👤 Player',
                  value: `<@${playerId}>`,
                  inline: true,
                },
                {
                  name: '🔒 Closed By',
                  value: `${interaction.user}`,
                  inline: true,
                },
                {
                  name: '🎮 Gamemode',
                  value: gamemode,
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
                  name: '🎫 Ticket',
                  value: channel.name,
                  inline: false,
                }
              )
              .setFooter({
                text: 'MMTC • Ticket Logs',
              })
              .setTimestamp();

            await logChannel.send({
              embeds: [logEmbed],
            });
          }

          await interaction.editReply({
            content: '🔒 Ticket closed. Deleting channel...',
            components: [],
          });

          setTimeout(() => {
            channel.delete('MMTC ticket closed').catch(() => {});
          }, 1500);
        } catch (error) {
          console.error('❌ Failed to close ticket:', error);

          await interaction.editReply({
            content:
              '❌ Something went wrong while closing this ticket.',
            components: [],
          });
        }

        return;
      }
    }

    // ==================== REMOVE TIER ====================

    if (
      interaction.isStringSelectMenu() &&
      interaction.customId === 'remove_gamemode'
    ) {
      const gamemode = interaction.values[0];

      const userSelect = new UserSelectMenuBuilder()
        .setCustomId(`remove_user_${gamemode}`)
        .setPlaceholder('👤 Select the player')
        .setMinValues(1)
        .setMaxValues(1);

      return interaction.update({
        content:
          `### 🗑️ MMTC • Remove Tier\n` +
          `Gamemode: **${gamemode}**\n\n` +
          `Select the player whose current tier you want to remove.`,
        components: [
          new ActionRowBuilder().addComponents(userSelect),
        ],
      });
    }

    if (
      interaction.isUserSelectMenu() &&
      interaction.customId.startsWith('remove_user_')
    ) {
      const gamemode = interaction.customId.slice('remove_user_'.length);
      const userId = interaction.values[0];

      const isStaff = interaction.member.roles.cache.some(
        role => role.name === 'STAFF'
      );

      const isMMTCTester = interaction.member.roles.cache.some(
        role => role.name === 'MMTC TESTER'
      );

      if (!isStaff && !isMMTCTester) {
        return interaction.update({
          content: '❌ You do not have permission to remove tiers.',
          components: [],
        });
      }

      const { removePlayerTier } = require('../utils/playerData');

      const result = removePlayerTier(userId, gamemode);

      if (!result.success) {
        let message = '❌ Could not remove the tier.';

        if (result.reason === 'PLAYER_NOT_FOUND') {
          message = '❌ This player does not have an MMTC profile yet.';
        }

        if (result.reason === 'NO_GAMEMODE_DATA') {
          message =
            `❌ <@${userId}> has no **${gamemode}** testing data.`;
        }

        if (result.reason === 'NO_TIER') {
          message =
            `❌ <@${userId}> currently has **no ${gamemode} tier**.`;
        }

        return interaction.update({
          content: message,
          components: [],
        });
      }

      const user = await interaction.client.users
        .fetch(userId)
        .catch(() => null);

      const embed = new EmbedBuilder()
        .setColor('#ED4245')
        .setAuthor({
          name: 'MMTC • Tier Management',
          iconURL: interaction.guild.iconURL({
            extension: 'png',
            size: 256,
          }) || interaction.client.user.displayAvatarURL(),
        })
        .setTitle('🗑️ Tier Removed')
        .setDescription(
          `The current tier of ${user || `<@${userId}>`} has been removed successfully.`
        )
        .addFields(
          {
            name: '👤 Player',
            value: `<@${userId}>`,
            inline: true,
          },
          {
            name: '🎮 Gamemode',
            value: gamemode,
            inline: true,
          },
          {
            name: '🏆 Previous Tier',
            value: `\`${result.previousTier}\``,
            inline: true,
          },
          {
            name: '📌 Current Tier',
            value: '`No Tier`',
            inline: true,
          },
          {
            name: '🛡️ Removed By',
            value: `${interaction.user}`,
            inline: true,
          }
        )
        .setThumbnail(
          user?.displayAvatarURL({
            extension: 'png',
            size: 256,
          }) || interaction.client.user.displayAvatarURL()
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      return interaction.update({
        content: '',
        embeds: [embed],
        components: [],
      });
    }

    // ==================== PROFILE BUTTONS ====================

    if (!interaction.isButton()) return;

    const [type, section, userId] = interaction.customId.split('_');

    if (type !== 'profile' || !section || !userId) return;

    const player = getPlayer(userId);

    // ==================== TIER ====================

    if (section === 'tier') {
      const lines = GAMEMODES.map((gamemode) => {
        const emoji = emojis.gamemodes[gamemode] || '🎯';
        const data = player.gamemodes[gamemode];
        const tier = data?.tier || 'Unranked';

        return `${emoji} **${gamemode}**\n> Tier: **${tier}**`;
      });

      const embed = new EmbedBuilder()
        .setColor('#5865F2')
        .setAuthor({
          name: 'MMTC • Tier Profile',
          iconURL: interaction.client.user.displayAvatarURL(),
        })
        .setTitle(`🏆 ${userId === interaction.user.id ? 'Your' : 'Player'} Tiers`)
        .setDescription(
          `> **MINECRAFT MCPE TIER TESTING COMMUNITY**\n` +
          `> Official MMTC Tier Rankings\n\n` +
          lines.join('\n\n')
        )
        .setFooter({
          text: 'MMTC • Minecraft MCPE Tier Testing Community',
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      return;
    }

    // ==================== STATS ====================

    if (section === 'stats') {
      const embed = new EmbedBuilder()
        .setTitle('📊 MMTC Player Stats')
        .setDescription(
          `**Tests Completed:** ${player.stats.tests}\n` +
          `**Wins:** ${player.stats.wins}\n` +
          `**Losses:** ${player.stats.losses}`
        )
        .setFooter({
          text: 'MINECRAFT MCPE TIER TESTING COMMUNITY • MMTC',
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });

      return;
    }

    // ==================== LEADERBOARD ====================

    if (section === 'leaderboard') {
      const embed = new EmbedBuilder()
        .setTitle('🏅 MMTC Leaderboard')
        .setDescription(
          'The server leaderboard will appear here once the ranking system is implemented.'
        )
        .setFooter({
          text: 'MINECRAFT MCPE TIER TESTING COMMUNITY • MMTC',
        })
        .setTimestamp();

      await interaction.reply({
        embeds: [embed],
        ephemeral: true,
      });
    }
  },
};
