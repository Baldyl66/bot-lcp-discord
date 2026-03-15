const { SlashCommandBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Affiche l'avatar d'un membre")
    .addUserOption(option =>
      option
        .setName("utilisateur")
        .setDescription("Le membre dont tu veux voir l'avatar")
        .setRequired(false)
    ),

  async execute(interaction) {
    const user = interaction.options.getUser("utilisateur") || interaction.user;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: "png"
    });

    await interaction.reply({
      content: `🖼️ Avatar de **${user.username}** :\n${avatarURL}`
    });
  }
};