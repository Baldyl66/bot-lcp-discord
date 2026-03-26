const { SlashCommandBuilder } = require("discord.js");
const { ALLOWED_ROLE_IDS } = require("../config");

function hasPermission(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  // Uniquement Capitaine et Assistant
  const CHANGEPREFIX_ROLE_IDS = [
    "1389995764280856626",   // Capitaine
    "1476639420265533613"    // Assistant
  ];
  return CHANGEPREFIX_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("changerprefix")
    .setDescription("Change le préfixe du pseudo de tous les membres du serveur")
    .setDefaultMemberPermissions("0")
    .addStringOption(option =>
      option
        .setName("nouveau_prefix")
        .setDescription("Le nouveau préfixe à appliquer (ex: [NOM], LCP, etc)")
        .setRequired(true)
        .setMaxLength(10)
    ),

  async execute(interaction) {
    try {
      const member = interaction.member;

      if (!hasPermission(member)) {
        return await interaction.reply({
          content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
          ephemeral: true
        });
      }

      const newPrefix = interaction.options.getString("nouveau_prefix");

      // Valider le préfixe
      if (!newPrefix || newPrefix.trim().length === 0) {
        return await interaction.reply({
          content: "❌ Le préfixe ne peut pas être vide.",
          ephemeral: true
        });
      }

      await interaction.deferReply();

      // Récupérer tous les membres du serveur
      const guild = interaction.guild;
      const members = await guild.members.fetch();

      let changedCount = 0;
      let errorCount = 0;

      // Barre de progression
      let progressMessage = await interaction.followUp({
        content: `⏳ Changement du préfixe en cours... (0/${members.size})`
      });

      // Appliquer le nouveau préfixe à chaque membre
      for (const [memberId, guildMember] of members) {
        try {
          // Ignorer les bots
          if (guildMember.user.bot) continue;

          // Ignorer si le bot ne peut pas modifier le pseudo
          if (!guildMember.manageable) {
            errorCount++;
            continue;
          }

          const username = guildMember.user.username;
          const newNickname = `${newPrefix}-${username}`.slice(0, 32);

          await guildMember.setNickname(newNickname);
          changedCount++;

          // Mettre à jour le message de progression tous les 5 changements
          if (changedCount % 5 === 0) {
            await progressMessage.edit({
              content: `⏳ Changement du préfixe en cours... (${changedCount}/${members.size})`
            });
          }
        } catch (error) {
          errorCount++;
        }
      }

      // Message final de confirmation
      const successMessage = `✅ Préfixe changé en \`${newPrefix}\`\n\n📊 Résultats:\n• Pseudos modifiés: **${changedCount}**\n• Erreurs ou ignorés: **${errorCount}**`;

      await interaction.followUp({
        content: successMessage
      });

      // Supprimer le message de progression
      await progressMessage.delete().catch(() => {});

      console.log(`✅ Préfixe changé: ${newPrefix} (${changedCount} membres modifiés)`);

    } catch (error) {
      console.error("Erreur lors de la commande /changerprefix :", error);

      if (interaction.replied) {
        await interaction.followUp({
          content: "❌ Une erreur est survenue pendant l'exécution de la commande.",
          ephemeral: true
        });
      } else {
        await interaction.reply({
          content: "❌ Une erreur est survenue pendant l'exécution de la commande.",
          ephemeral: true
        });
      }
    }
  }
};
