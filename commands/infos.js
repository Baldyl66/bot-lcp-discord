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
        .map(role => role.name);
      
      const rolesDisplay = roles.length > 0 
        ? roles.map(role => `• ${role}`).join("\n")
        : "Aucun rôle spécial";

      // Statut avec meilleure présentation
      const statusMap = {
        online: { emoji: "🟢", text: "En ligne", color: 0x43b581 },
        idle: { emoji: "🟡", text: "Absent", color: 0xfaa61a },
        dnd: { emoji: "🔴", text: "Ne pas déranger", color: 0xf04747 },
        offline: { emoji: "⚫", text: "Hors ligne", color: 0x747f8d }
      };
      
      const userStatus = member.presence?.status || "offline";
      const statusInfo = statusMap[userStatus] || statusMap.offline;

      // Calcul du temps sur le serveur
      const joinTime = Math.floor((Date.now() - member.joinedTimestamp) / (1000 * 60 * 60 * 24));
      const timeText = joinTime === 0 ? "Aujourd'hui" : `${joinTime} jour${joinTime > 1 ? 's' : ''}`;

      // Calcul de l'ancienneté du compte
      const accountAge = Math.floor((Date.now() - user.createdTimestamp) / (1000 * 60 * 60 * 24));

      // Récupérer la bannière avec les options correctes
      const bannerURL = user.bannerURL({ size: 512, extension: 'png' });

      // Créer l'embed amélioré
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: `${user.username}${user.bot ? " 🤖" : ""}`, 
          iconURL: user.displayAvatarURL() 
        })
        .setDescription(`${statusInfo.emoji} **${statusInfo.text}**`)
        .setColor(statusInfo.color)
        .setThumbnail(user.displayAvatarURL({ size: 512 }));

      // Ajouter la bannière si elle existe
      if (bannerURL) {
        embed.setImage(bannerURL);
      }

      embed.addFields(
        // Section identité
        { 
          name: "━━━━━━ 👤 IDENTITÉ ━━━━━━", 
          value: " ", 
          inline: false 
        },
        { 
          name: "👤 Profil", 
          value: `\`${user.username}\``, 
          inline: true 
        },
        { 
          name: "🏴‍☠️ Surnom serveur", 
          value: member.nickname ? `\`${member.nickname}\`` : "Aucun surnom", 
          inline: true 
        },
        { 
          name: "ID", 
          value: `\`${user.id}\``, 
          inline: true 
        },
        { 
          name: "Type", 
          value: user.bot ? "🤖 Bot" : "👤 Utilisateur", 
          inline: true 
        },
        
        // Section dates
        { 
          name: "━━━━━━ 📅 DATES ━━━━━━", 
          value: " ", 
          inline: false 
        },
        { 
          name: "📝 Compte créé", 
          value: `<t:${accountCreated}:D>\n*Il y a ${accountAge} jours*`, 
          inline: true 
        },
        { 
          name: "🏴‍☠️ Arrivé sur serveur", 
          value: `<t:${joinedServer}:D>\n*${timeText}*`, 
          inline: true 
        },
        
        // Section rôles
        { 
          name: `━━━━━━ 🎭 RÔLES (${roles.length}) ━━━━━━`, 
          value: rolesDisplay || "Aucun rôle", 
          inline: false 
        }
      )
        .setFooter({ 
          text: `✦ Demandé par ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
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
