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
      
      // Récupérer les données complètes de l'utilisateur pour avoir la bannière
      const fullUser = await user.fetch();

      // Dates formatées
      const accountCreated = Math.floor(fullUser.createdTimestamp / 1000);
      const joinedServer = Math.floor(member.joinedTimestamp / 1000);

      // Rôles (sans @everyone)
      const allRoles = member.roles.cache
        .filter(role => role.name !== "@everyone")
        .map(role => ({ name: role.name, mention: role.toString() }));

      // Mots-clés pour catégoriser
      const gamesKeywords = [
        'valorant', 'rocket league', 'minecraft', 'fortnite', 'call of duty', 'black ops', 'apex', 'csgo', 'pubg', 
        'gta', 'elden', 'dark souls', 'rust', 'ark', 'factorio', 'terraria', 'stardew', 'palworld',
        'albion', 'brawlhalla', 'marvel rivals', 'cyberpunk', 'subnautica', 'genshin', 'honkai', 'overwatch',
        'warframe', 'forza', 'league of legends', 'lol', "baldur's gate", 'roblox'
      ];
      const platformKeywords = ['pc', 'ps5', 'ps4', 'xbox', 'switch', 'android', 'ios', 'mobile', 'console'];

      // Catégoriser les rôles
      const rolesGames = allRoles.filter(r => gamesKeywords.some(kw => r.name.toLowerCase().includes(kw)));
      const rolesPlatforms = allRoles.filter(r => platformKeywords.some(kw => r.name.toLowerCase().includes(kw)));
      const rolesOther = allRoles.filter(r => !rolesGames.includes(r) && !rolesPlatforms.includes(r));

      const rolesGamesDisplay = rolesGames.length > 0 ? rolesGames.map(r => `• ${r.mention}`).join("\n") : "Aucun";
      const rolesPlatformsDisplay = rolesPlatforms.length > 0 ? rolesPlatforms.map(r => `• ${r.mention}`).join("\n") : "Aucun";
      const rolesOtherDisplay = rolesOther.length > 0 ? rolesOther.map(r => `• ${r.mention}`).join("\n") : "Aucun";

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
      const accountAge = Math.floor((Date.now() - fullUser.createdTimestamp) / (1000 * 60 * 60 * 24));

      // Récupérer la bannière
      const bannerURL = fullUser.bannerURL({ size: 512, extension: 'png' });

      // Créer l'embed amélioré
      const embed = new EmbedBuilder()
        .setAuthor({ 
          name: `${fullUser.username}${fullUser.bot ? " 🤖" : ""}`, 
          iconURL: fullUser.displayAvatarURL() 
        })
        .setDescription(`${statusInfo.emoji} **${statusInfo.text}**`)
        .setColor(statusInfo.color)
        .setThumbnail(fullUser.displayAvatarURL({ size: 512 }));

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
          name: `━━━━━━ 🎭 RÔLES (${allRoles.length}) ━━━━━━`, 
          value: " ", 
          inline: false 
        },
        { 
          name: "🎮 Jeux", 
          value: rolesGamesDisplay, 
          inline: true 
        },
        { 
          name: "📌 Autres", 
          value: rolesOtherDisplay, 
          inline: true 
        },
        { 
          name: "💻 Plateforme", 
          value: rolesPlatformsDisplay, 
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
