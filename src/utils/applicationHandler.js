'use strict';

const {
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');

const APPLICATION_CATEGORY_ID = '1545744969359167498';
const APPLICATION_LOG_CHANNEL_ID = '1545750619694825543';

const activeApplications = new Map();

const QUESTIONS = {
  staff: [
    'What is your Discord username and ID?',
    'How old are you?',
    'What is your timezone?',
    'How long have you been a member of MMTC?',
    'Why do you want to join the MMTC Staff Team?',
    'Do you have previous staff or moderation experience?',
    'How would you handle an argument between two members?',
    'What would you do if a staff member broke the rules?',
    'How active can you be on MMTC?',
    'Why should we choose you over other applicants?',
  ],

  tester: [
    'What is your Discord username and ID?',
    'How old are you?',
    'What is your Minecraft IGN?',
    'Do you play Java, Bedrock, or both?',
    'What is your main PvP gamemode?',
    'What is your current tier in your main gamemode?',
    'Which server(s) are you currently a Tier Tester on? Provide invite links.',
    'How would you conduct a fair and unbiased tier test?',
    'What would you do if a player disagreed with your testing result?',
    'Provide proof of your current tier/tester role. Upload the screenshot in this application.',
  ],
};

function typeName(type) {
  return type === 'staff' ? 'Staff' : 'Tester';
}

function typeEmoji(type) {
  return type === 'staff' ? '🛡️' : '🧪';
}

function typeColor(type) {
  return type === 'staff' ? '#5865F2' : '#8B5CF6';
}

function buildPanel(type, guild) {
  const isStaff = type === 'staff';

  const icon =
    guild.iconURL({ extension: 'png', size: 256 }) ||
    guild.client.user.displayAvatarURL();

  const embed = new EmbedBuilder()
    .setColor(typeColor(type))
    .setAuthor({
      name: `MMTC • ${typeName(type)} Recruitment`,
      iconURL: icon,
    })
    .setTitle(
      isStaff
        ? '🛡️ MMTC Staff Applications'
        : '🧪 MMTC Tester Applications'
    )
    .setDescription(
      isStaff
        ? [
            '### Build MMTC With Us',
            '',
            'We are looking for **active, mature and responsible** members to join the MMTC Staff Team.',
            '',
            '> 🛡️ Help manage the community',
            '> ⚖️ Keep MMTC fair & organized',
            '> 🚀 Help the server grow',
            '',
            '**Ready to apply?**',
            'Click the button below to open your private application.',
          ].join('\\n')
        : [
            '### Become an Official MMTC Tester',
            '',
            'Show your PvP knowledge and prove that you can deliver **fair, consistent and unbiased** tier tests.',
            '',
            '> 🎯 Strong game knowledge',
            '> ⚖️ Fair & unbiased testing',
            '> 🏆 Relevant tier/testing experience',
            '',
            '**Ready to prove yourself?**',
            'Click the button below to open your private application.',
          ].join('\\n')
    )
    .addFields(
      {
        name: '📋 Application',
        value: '10 questions • One at a time',
        inline: true,
      },
      {
        name: '🔒 Review',
        value: 'Reviewed privately by MMTC staff',
        inline: true,
      }
    )
    .setThumbnail(icon)
    .setFooter({
      text: 'MMTC • Minecraft MCPE Tier Testing Community',
    })
    .setTimestamp();

  const button = new ButtonBuilder()
    .setCustomId(`application_start_${type}`)
    .setLabel(isStaff ? 'Apply for Staff' : 'Apply as Tester')
    .setEmoji(typeEmoji(type))
    .setStyle(ButtonStyle.Primary);

  return {
    embeds: [embed],
    components: [
      new ActionRowBuilder().addComponents(button),
    ],
  };
}

async function startApplication(interaction, type) {
  if (!interaction.guild) return;

  const existing = interaction.guild.channels.cache.find(
    channel =>
      channel.type === ChannelType.GuildText &&
      channel.parentId === APPLICATION_CATEGORY_ID &&
      channel.topic === `MMTC-${type}-${interaction.user.id}`
  );

  if (existing) {
    return interaction.reply({
      content: `⚠️ You already have an open application: ${existing}`,
      flags: MessageFlags.Ephemeral,
    });
  }

  const safeName = interaction.user.username
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 20);

  const permissionOverwrites = [
    {
      id: interaction.guild.roles.everyone.id,
      deny: [PermissionFlagsBits.ViewChannel],
    },
    {
      id: interaction.user.id,
      allow: [
        PermissionFlagsBits.ViewChannel,
        PermissionFlagsBits.SendMessages,
        PermissionFlagsBits.ReadMessageHistory,
        PermissionFlagsBits.AttachFiles,
      ],
    },
  ];

  for (const role of interaction.guild.roles.cache.values()) {
    if (
      !role.managed &&
      role.permissions.has(PermissionFlagsBits.ManageGuild)
    ) {
      permissionOverwrites.push({
        id: role.id,
        allow: [
          PermissionFlagsBits.ViewChannel,
          PermissionFlagsBits.SendMessages,
          PermissionFlagsBits.ReadMessageHistory,
        ],
      });
    }
  }

  const channel = await interaction.guild.channels.create({
    name: `${type}-application-${safeName}`,
    type: ChannelType.GuildText,
    parent: APPLICATION_CATEGORY_ID,
    topic: `MMTC-${type}-${interaction.user.id}`,
    permissionOverwrites,
  });

  activeApplications.set(channel.id, {
    userId: interaction.user.id,
    type,
    question: 0,
    answers: {},
    startedAt: Date.now(),
  });

  await interaction.reply({
    content: `✅ Your private ${typeName(type).toLowerCase()} application has been opened: ${channel}`,
    flags: MessageFlags.Ephemeral,
  });

  await sendNextQuestion(channel);
}

async function sendNextQuestion(channel) {
  const app = activeApplications.get(channel.id);

  if (!app) return;

  const questions = QUESTIONS[app.type];

  if (app.question >= questions.length) {
    return finishApplication(channel);
  }

  const number = app.question + 1;

  const embed = new EmbedBuilder()
    .setColor(typeColor(app.type))
    .setAuthor({
      name: `MMTC • ${typeName(app.type)} Application`,
      iconURL: channel.guild.client.user.displayAvatarURL(),
    })
    .setTitle(`${typeEmoji(app.type)} Question ${number}/10`)
    .setDescription(
      `**${questions[app.question]}**\\n\\n` +
      '> 💬 Send your answer as a normal message below.'
    )
    .setFooter({
      text: 'MMTC • Application System',
    })
    .setTimestamp();

  if (app.type === 'tester' && number === 10) {
    embed.addFields({
      name: '📸 Screenshot',
      value:
        'You can upload your screenshot directly with your answer.',
      inline: false,
    });
  }

  await channel.send({
    embeds: [embed],
  });
}

async function handleApplicationMessage(message) {
  if (!message.guild || message.author.bot) return false;

  const app = activeApplications.get(message.channel.id);

  if (!app || app.userId !== message.author.id) return false;

  const questions = QUESTIONS[app.type];
  const number = app.question + 1;

  if (number === 10 && app.type === 'tester') {
    if (!message.content.trim() && message.attachments.size === 0) {
      await message.reply('📸 Please provide your answer and upload the required screenshot.');
      return true;
    }

    app.answers[number] = [
      message.content.trim(),
      ...message.attachments.map(a => a.url),
    ].filter(Boolean).join('\\n');
  } else {
    const answer = message.content.trim();

    if (!answer) {
      await message.reply('❌ Please provide an answer.');
      return true;
    }

    app.answers[number] = answer;
  }

  app.question++;

  await message.react('✅').catch(() => {});

  if (app.question >= questions.length) {
    await finishApplication(message.channel);
  } else {
    await sendNextQuestion(message.channel);
  }

  return true;
}

async function finishApplication(channel) {
  const app = activeApplications.get(channel.id);

  if (!app) return;

  const guild = channel.guild;
  const user = await guild.client.users.fetch(app.userId).catch(() => null);

  const embeds = [];

  for (let start = 1; start <= 10; start += 5) {
    const embed = new EmbedBuilder()
      .setColor(typeColor(app.type))
      .setAuthor({
        name: `MMTC • ${typeName(app.type)} Application`,
        iconURL: user?.displayAvatarURL() || guild.client.user.displayAvatarURL(),
      })
      .setTitle(
        `${typeEmoji(app.type)} ${typeName(app.type)} Application • ${start}-${Math.min(start + 4, 10)}`
      )
      .setFooter({
        text: 'MMTC • Application Review',
      })
      .setTimestamp();

    for (let i = start; i < start + 5 && i <= 10; i++) {
      embed.addFields({
        name: `${i}. ${QUESTIONS[app.type][i - 1]}`,
        value: String(app.answers[i] || 'No answer').slice(0, 1024),
        inline: false,
      });
    }

    embeds.push(embed);
  }

  const reviewRow = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`application_accept_${app.type}_${app.userId}`)
      .setLabel('Accept')
      .setEmoji('✅')
      .setStyle(ButtonStyle.Success),

    new ButtonBuilder()
      .setCustomId(`application_deny_${app.type}_${app.userId}`)
      .setLabel('Deny')
      .setEmoji('❌')
      .setStyle(ButtonStyle.Danger),

    new ButtonBuilder()
      .setCustomId(`application_close_${app.type}_${app.userId}`)
      .setLabel('Close')
      .setEmoji('🔒')
      .setStyle(ButtonStyle.Secondary)
  );

  await channel.send({
    content: `<@${app.userId}>`,
    embeds,
    components: [reviewRow],
  });

  const logChannel = guild.channels.cache.get(
    APPLICATION_LOG_CHANNEL_ID
  );

  if (logChannel?.isTextBased()) {
    const logMessage = await logChannel.send({
      content:
        `${typeEmoji(app.type)} **New ${typeName(app.type)} Application** • <@${app.userId}>`,
      embeds,
    });

    app.logChannelId = logChannel.id;
    app.logMessageId = logMessage.id;
  }

  await channel.send({
    embeds: [
      new EmbedBuilder()
        .setColor('#57F287')
        .setTitle('✅ Application Completed')
        .setDescription(
          'Your application has been submitted successfully.\\n\\n' +
          '🔒 Please wait while the MMTC Staff Team reviews it.'
        )
        .setFooter({
          text: 'MMTC • Application Review',
        })
        .setTimestamp(),
    ],
  });

  activeApplications.delete(channel.id);
}

async function updateApplicationLog(
  interaction,
  userId,
  type,
  status,
  color
) {
  const logChannel = interaction.guild.channels.cache.get(
    APPLICATION_LOG_CHANNEL_ID
  );

  if (!logChannel?.isTextBased()) return;

  const messages = await logChannel.messages
    .fetch({ limit: 100 })
    .catch(() => null);

  if (!messages) return;

  const target = messages.find(message =>
    message.author?.id === interaction.client.user.id &&
    message.content?.includes(`<@${userId}>`) &&
    message.content?.includes(`${typeName(type)} Application`)
  );

  if (!target) return;

  const statusEmbed = new EmbedBuilder()
    .setColor(color)
    .setTitle(`📋 Application ${status}`)
    .setDescription(
      `**Applicant:** <@${userId}>\\n` +
      `**Reviewed by:** ${interaction.user}`
    )
    .setFooter({
      text: 'MMTC • Application Review',
    })
    .setTimestamp();

  await target.edit({
    content:
      `${typeEmoji(type)} **Application ${status}** • <@${userId}>`,
    embeds: [...target.embeds, statusEmbed],
    components: [],
  }).catch(() => {});
}

async function handleApplicationAction(interaction) {
  console.log('APPLICATION ACTION:', interaction.customId);

  const match = interaction.customId.match(
    /^application_(accept|deny|close)_(staff|tester)_(\d+)$/
  );

  if (!match) return;

  if (
    !interaction.memberPermissions?.has(
      PermissionFlagsBits.Administrator
    )
  ) {
    return interaction.reply({
      content: '❌ Only Server Administrators can review applications.',
      flags: MessageFlags.Ephemeral,
    });
  }

  // Acknowledge the button immediately to prevent
  // "Bot didn't respond in time"
  await interaction.deferUpdate();

  const action = match[1];
  const type = match[2];
  const userId = match[3];

  const channel = interaction.guild.channels.cache.find(
    c =>
      c.type === ChannelType.GuildText &&
      c.parentId === APPLICATION_CATEGORY_ID &&
      c.topic === `MMTC-${type}-${userId}`
  );

  if (action === 'close') {
    activeApplications.delete(channel?.id);

    await updateApplicationLog(
      interaction,
      userId,
      type,
      'Closed',
      '#747F8D'
    );

    await interaction.editReply({
      components: [],
    });

    if (channel) {
      await channel.send({
        embeds: [
          new EmbedBuilder()
            .setColor('#747F8D')
            .setTitle('🔒 Application Closed')
            .setDescription(
              `This application has been closed by ${interaction.user}.`
            )
            .setFooter({
              text: 'MMTC • Application Review',
            })
            .setTimestamp(),
        ],
      }).catch(() => {});

      await new Promise(resolve => setTimeout(resolve, 1000));

      await channel.delete(
        'MMTC application closed'
      ).catch(() => {});
    }

    return;
  }

  const accepted = action === 'accept';
  const status = accepted ? 'Accepted' : 'Denied';
  const color = accepted ? '#57F287' : '#ED4245';

  await updateApplicationLog(
    interaction,
    userId,
    type,
    status,
    color
  );

  if (channel) {
    activeApplications.delete(channel.id);

    await channel.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(
            accepted
              ? '✅ Application Accepted'
              : '❌ Application Denied'
          )
          .setDescription(
            `Your **${typeName(type).toLowerCase()} application** has been ` +
            `${accepted ? '**accepted**' : '**denied**'} by ${interaction.user}.`
          )
          .setFooter({
            text: 'MMTC • Application Review',
          })
          .setTimestamp(),
      ],
    });
  }

  const user = await interaction.client.users
    .fetch(userId)
    .catch(() => null);

  if (user) {
    await user.send({
      embeds: [
        new EmbedBuilder()
          .setColor(color)
          .setTitle(
            accepted
              ? '🎉 MMTC Application Accepted'
              : '📋 MMTC Application Update'
          )
          .setDescription(
            accepted
              ? `Your **${typeName(type).toLowerCase()} application** has been accepted!`
              : `Your **${typeName(type).toLowerCase()} application** was not accepted this time.`
          )
          .setFooter({
            text: 'MMTC • Minecraft MCPE Tier Testing Community',
          })
          .setTimestamp(),
      ],
    }).catch(() => {});
  }

  // Keep Accept / Deny / Close buttons visible.
  // Buttons are removed only when Close is pressed.
}

async function sendApplicationPanels(guild, setup) {
  const staffChannel = guild.channels.cache.get(
    setup.staffApplicationChannelId
  );

  const testerChannel = guild.channels.cache.get(
    setup.testerApplicationChannelId
  );

  if (!staffChannel || staffChannel.type !== ChannelType.GuildText) {
    throw new Error('Staff application channel not found.');
  }

  if (!testerChannel || testerChannel.type !== ChannelType.GuildText) {
    throw new Error('Tester application channel not found.');
  }

  const staffMessage = await staffChannel.send(
    buildPanel('staff', guild)
  );

  const testerMessage = await testerChannel.send(
    buildPanel('tester', guild)
  );

  return {
    staffMessage,
    testerMessage,
  };
}

module.exports = {
  APPLICATION_CATEGORY_ID,
  APPLICATION_LOG_CHANNEL_ID,
  QUESTIONS,
  buildPanel,
  startApplication,
  handleApplicationMessage,
  handleApplicationAction,
  sendApplicationPanels,
};
