const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("infos")
    .setDescription("Affiche les infos détaillées d'un membre")
    .addUserOption(option =>
      option
        .setName("utilisateur")
        .setDescription("Le membre dont tu veux voir les infos")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const user = interaction.options.getUser("utilisateur") || interaction.user;
      const member = await interaction.guild.members.fetch(user.id);

      // Dates formatées
      const accountCreated = Math.floor(user.createdTimestamp / 1000);
      const joinedServer = Math.floor(member.joinedTimestamp / 1000);

      // Rôles (sans @everyone)
      const roles = member.roles.cache
        .filter(role => role.name !== "@everyone")
        .map(role => role.toString())
        .join(", ") || "Aucun rôle";

      // Statut
      const statusEmoji = {
        online: "🟢",
        idle: "🟡",
        dnd: "🔴",
        offline: "⚫"
      };
      const status = statusEmoji[member.presence?.status] || "⚫";

      // Créer l'embed
      const embed = new EmbedBuilder()
        .setTitle(`📋 Infos de ${user.username}`)
        .setColor("#00b0f4")
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields(
          { name: "👤 Pseudo", value: `**${user.username}**`, inline: true },
          { name: "🆔 ID", value: `\`${user.id}\``, inline: true },
          { name: "🤖 Bot", value: user.bot ? "✅ Oui" : "❌ Non", inline: true },
          { name: "📅 Compte créé", value: `<t:${accountCreated}:D>\n<t:${accountCreated}:R>`, inline: false },
          { name: "🏴‍☠️ Arrivé sur serveur", value: `<t:${joinedServer}:D>\n<t:${joinedServer}:R>`, inline: false },
          { name: "🎭 Rôles", value: roles, inline: false },
          { name: `${status} Statut`, value: member.presence?.status ? member.presence.status.charAt(0).toUpperCase() + member.presence.status.slice(1) : "Hors ligne", inline: true }
        )
        .setFooter({ text: `Demandé par ${interaction.user.username}`, iconURL: interaction.user.displayAvatarURL() })
        .setTimestamp();

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur lors de la commande /infos :", error);

      await interaction.reply({
        content: "❌ Impossible de récupérer les informations du membre.",
        ephemeral: true
      });
    }
  }
};
