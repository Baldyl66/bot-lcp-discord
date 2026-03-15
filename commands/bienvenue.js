const { SlashCommandBuilder } = require("discord.js");
const { ALLOWED_ROLE_IDS } = require("../config");
const { buildWelcomeCard } = require("../utils/welcomeCard");

function hasBienvenuePermission(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  return ALLOWED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("bienvenue")
    .setDescription("Génère une carte de bienvenue")
    .addUserOption(option =>
      option
        .setName("utilisateur")
        .setDescription("Le membre pour lequel générer la carte")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const member = interaction.member;

      if (!hasBienvenuePermission(member)) {
        return await interaction.reply({
          content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
          ephemeral: true
        });
      }

      const targetUser =
        interaction.options.getUser("utilisateur") || interaction.user;

      const attachment = await buildWelcomeCard(targetUser);

      await interaction.reply({
        content: `🏴‍☠️ Aperçu de la carte de bienvenue pour **${targetUser.username}** :`,
        files: [attachment]
      });

    } catch (error) {
      console.error("Erreur lors de la commande /bienvenue :", error);

      await interaction.reply({
        content: "❌ Impossible de générer la carte de bienvenue.",
        ephemeral: true
      });
    }
  }
};