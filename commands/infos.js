const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");

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
        .setColor(statusInfo.color)
        .setImage(bannerURL)
        .setThumbnail(fullUser.displayAvatarURL({ size: 512 }))
        .setDescription(`\`${fullUser.username}\`${fullUser.bot ? " 🤖" : ""}\n${statusInfo.emoji} **${statusInfo.text}** • ${fullUser.bot ? "🤖 Bot" : "👤 Utilisateur"}`)
        .addFields(
          // Section identité
          { 
            name: "👤 PROFIL", 
            value: `Surnom serveur: ${member.nickname ? `\`${member.nickname}\`` : "Aucun"}\nID: \`${fullUser.id}\``, 
            inline: false 
          },
          
          // Section dates
          { 
            name: "📅 DATES", 
            value: `📝 Créé: <t:${accountCreated}:d> (${accountAge}j)\n🏴‍☠️ Serveur: <t:${joinedServer}:d> (${timeText})`, 
            inline: false 
          },
          
          // Section rôles
          { 
            name: `🎭 RÔLES (${allRoles.length})`, 
            value: `🎮 Jeux (**${rolesGames.length}**) | 📌 Autres (**${rolesOther.length}**) | 💻 Plateforme (**${rolesPlatforms.length}**)\n\n*Clique sur les boutons ci-dessous pour voir les détails*`, 
            inline: false 
          }
        )
        .setFooter({ 
          text: `✦ Demandé par ${interaction.user.username}`, 
          iconURL: interaction.user.displayAvatarURL() 
        })
        .setTimestamp();

      // Créer les boutons
      const row = new ActionRowBuilder()
        .addComponents(
          new ButtonBuilder()
            .setCustomId(`roles_games_${user.id}`)
            .setLabel(`🎮 Jeux (${rolesGames.length})`)
            .setStyle(ButtonStyle.Primary),
          new ButtonBuilder()
            .setCustomId(`roles_other_${user.id}`)
            .setLabel(`📌 Autres (${rolesOther.length})`)
            .setStyle(ButtonStyle.Secondary),
          new ButtonBuilder()
            .setCustomId(`roles_platforms_${user.id}`)
            .setLabel(`💻 Plateforme (${rolesPlatforms.length})`)
            .setStyle(ButtonStyle.Success)
        );

      const response = await interaction.reply({ embeds: [embed], components: [row] });

      // Collecteur pour les boutons
      const filter = i => i.user.id === interaction.user.id;
      const collector = response.createMessageComponentCollector({ filter, time: 60000 });

      collector.on('collect', async (i) => {
        let detailEmbed;
        
        if (i.customId === `roles_games_${user.id}`) {
          detailEmbed = new EmbedBuilder()
            .setTitle(`🎮 Jeux de ${fullUser.username}`)
            .setColor(0x43b581)
            .setDescription(rolesGamesDisplay || "Aucun rôle de jeu")
            .setThumbnail(fullUser.displayAvatarURL({ size: 256 }));
        } else if (i.customId === `roles_other_${user.id}`) {
          detailEmbed = new EmbedBuilder()
            .setTitle(`📌 Autres rôles de ${fullUser.username}`)
            .setColor(0xfaa61a)
            .setDescription(rolesOtherDisplay || "Aucun autre rôle")
            .setThumbnail(fullUser.displayAvatarURL({ size: 256 }));
        } else if (i.customId === `roles_platforms_${user.id}`) {
          detailEmbed = new EmbedBuilder()
            .setTitle(`💻 Plateforme de ${fullUser.username}`)
            .setColor(0x00b0f4)
            .setDescription(rolesPlatformsDisplay || "Aucune plateforme")
            .setThumbnail(fullUser.displayAvatarURL({ size: 256 }));
        }

        await i.update({ embeds: [detailEmbed], components: [] });
      });

      collector.on('end', () => {
        response.edit({ components: [] }).catch(() => {});
      });

    } catch (error) {
      console.error("Erreur lors de la commande /infos :", error);

      await interaction.reply({
        content: "❌ Impossible de récupérer les informations du membre.",
        ephemeral: true
      });
    }
  }
};
