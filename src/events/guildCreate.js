const { EmbedBuilder } = require('discord.js');

module.exports = {
  name: 'guildCreate',

  async execute(guild) {
    try {
      console.log(`📥 MMTC joined: ${guild.name} (${guild.id})`);

      const owner = await guild.fetchOwner().catch(() => null);

      if (owner) {
        const embed = new EmbedBuilder()
          .setColor('#6D28D9')
          .setTitle('🔒 MMTC • Private Access')
          .setDescription(
            `Hello ${owner.user},\n\n` +
            `Thank you for attempting to add **MMTC** to **${guild.name}**.\n\n` +
            `🔐 **MMTC is currently private.**\n\n` +
            `MMTC is not accepting public server installations at this time. ` +
            `Because of this, our bot has automatically left your server.\n\n` +
            `We appreciate your interest in **MMTC**. 💜\n\n` +
            `🏆 **Minecraft MCPE Tier Testing Community**`
          )
          .setFooter({
            text: 'MMTC • Play Fair • Test Fair • Improve'
          })
          .setTimestamp();

        await owner.send({ embeds: [embed] }).catch(() => {
          console.warn(`⚠️ MMTC could not DM ${owner.user.tag}`);
        });
      }

      await guild.leave();

      console.log(`🚪 MMTC left: ${guild.name} (${guild.id})`);
    } catch (error) {
      console.error('❌ MMTC private access handler error:', error);
    }
  }
};
