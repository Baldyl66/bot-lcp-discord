const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("equipage")
    .setDescription("Affiche le nombre de membres du serveur"),

  async execute(interaction) {
    const memberCount = interaction.guild.memberCount;

    await interaction.reply(
      `🏴‍☠️ L'équipage compte actuellement **${memberCount} pirates** à bord !`
    );
  }
};