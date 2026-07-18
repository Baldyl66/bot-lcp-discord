require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  ApplicationCommandPermissionType
} = require("discord.js");

const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const { GUILD_ID, WELCOME_CHANNEL_ID, GOODBYE_CHANNEL_ID, ALLOWED_ROLE_IDS, VOICE_SOUND_MEMBERS } = require("./config");
const { buildWelcomeCard } = require("./utils/welcomeCard");
const { buildGoodbyeCard } = require("./utils/goodbyeCard");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildPresences
  ]
});

const commands = [];
client.commands = new Map();

const commandsPath = path.join(__dirname, "commands");
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith(".js"));

for (const file of commandFiles) {
  const filePath = path.join(commandsPath, file);
  const command = require(filePath);

  client.commands.set(command.data.name, command);
  commands.push(command.data.toJSON());
}

client.once(Events.ClientReady, async readyClient => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    const registeredCommands = await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, GUILD_ID),
      { body: commands }
    );

    console.log("Commandes enregistrées sur le serveur.");

    console.log("Commandes enregistrées :", registeredCommands.map(c => c.name));

    console.log("ALLOWED_ROLE_IDS :", ALLOWED_ROLE_IDS);

    const allowedRoleIds = [...new Set(ALLOWED_ROLE_IDS.filter(Boolean))];
    console.log("Rôles à autoriser :", allowedRoleIds);

    if (allowedRoleIds.length === 0) {
      console.warn("Aucun rôle autorisé - permissions non appliquées.");
      return;
    }

    // Commandes qui nécessitent des permissions spéciales
    const commandsToRestrict = ["bienvenue", "adieu", "changerprefix"];

    // L'ID du serveur correspond aussi au rôle @everyone.
    const permissions = [
      {
        id: GUILD_ID,
        type: ApplicationCommandPermissionType.Role,
        permission: false
      },
      ...allowedRoleIds.map(roleId => ({
        id: roleId,
        type: ApplicationCommandPermissionType.Role,
        permission: true
      }))
    ];

    console.log("Permissions à appliquer :", JSON.stringify(permissions, null, 2));

    // Appliquer les permissions à chaque commande restreinte
    for (const commandName of commandsToRestrict) {
      const command = Array.isArray(registeredCommands)
        ? registeredCommands.find(c => c.name === commandName)
        : null;

      if (!command) {
        console.warn(`Commande /${commandName} non trouvée.`);
        continue;
      }

      try {
        await rest.put(
          Routes.applicationCommandPermissions(
            readyClient.user.id,
            GUILD_ID,
            command.id
          ),
          { body: { permissions } }
        );

        console.log(`✅ Permissions appliquées à /${commandName}.`);
      } catch (permError) {
        if (permError.code === 20001) {
          console.log("⚠️  Les permissions doivent être définies manuellement dans Discord (Intégrations → Commandes)");
        } else {
          console.error(`Erreur lors de l'application des permissions à /${commandName} :`, permError.message);
        }
      }
    }
  } catch (error) {
    console.error("Erreur lors de l’enregistrement des commandes slash :", error);
  }
});

client.on(Events.GuildMemberAdd, async member => {
  try {
    const username = member.user.username;
    const newNickname = `(LCP)-${username}`.slice(0, 32);

    if (member.manageable) {
      await member.setNickname(newNickname);
      console.log(`Pseudo modifié : ${member.user.tag} -> ${newNickname}`);
    }

    const welcomeChannel = member.guild.channels.cache.get(WELCOME_CHANNEL_ID);
    if (!welcomeChannel) return;

    const attachment = await buildWelcomeCard(member.user);

    await welcomeChannel.send({
      content: `👒 Bienvenue chez Les Chapeaux de Paille moussaillon ${member} 👒!`,
      files: [attachment]
    });

  } catch (error) {
    console.error("Erreur lors de la création de la carte de bienvenue :", error);
  }
});

// Événement pour la carte de départ quand un membre quitte
client.on(Events.GuildMemberRemove, async member => {
  try {
    const goodbyeChannel = member.guild.channels.cache.get(GOODBYE_CHANNEL_ID);
    if (!goodbyeChannel) return;

    const attachment = await buildGoodbyeCard(member.user);

    await goodbyeChannel.send({
      content: `⚔️ Au revoir ${member.user.username}... merci pour tout mais ton exécution a sonné ⚔️!`,
      files: [attachment]
    });

  } catch (error) {
    console.error("Erreur lors de la création de la carte de départ :", error);
  }
});

// Événement pour jouer un son quand un membre rejoint un canal vocal
client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    // Vérifie que le membre a rejoint un canal vocal (pas juste changé de canal)
    if (!oldState.channel && newState.channel) {
      // Charge le membre si pas en cache
      let member = newState.member;
      if (!member) {
        member = await newState.guild.members.fetch(newState.userId);
      }

      if (!member) {
        console.log(`❌ Impossible de charger le membre`);
        return;
      }

      const memberId = member.id;
      console.log(`✅ ${member.user.tag} a rejoint le vocal (${newState.channel.name}). ID: ${memberId}`);
      
      // === Gestion des STREAKS ===
      try {
        const streaksPath = path.join(__dirname, "streaks.json");
        let streaksData = {};

        if (fs.existsSync(streaksPath)) {
          streaksData = JSON.parse(fs.readFileSync(streaksPath, "utf8"));
        }

        const today = new Date().toISOString().split("T")[0]; // Format: YYYY-MM-DD
        const userStreak = streaksData[memberId] || { streak: 0, lastVoiceDate: null };

        // Si c'est un nouveau jour
        if (userStreak.lastVoiceDate !== today) {
          // Vérifier si c'était hier
          const lastDate = new Date(userStreak.lastVoiceDate);
          const yesterday = new Date(today);
          yesterday.setDate(yesterday.getDate() - 1);
          
          if (userStreak.lastVoiceDate === yesterday.toISOString().split("T")[0]) {
            // Hier = continuer la série
            userStreak.streak += 1;
          } else {
            // Plus de 1 jour = recommencer
            userStreak.streak = 1;
          }
          
          userStreak.lastVoiceDate = today;
          streaksData[memberId] = userStreak;

          fs.writeFileSync(streaksPath, JSON.stringify(streaksData, null, 2));
          
          const streakEmoji = "🔥".repeat(Math.min(userStreak.streak, 3));
          console.log(`📊 Streak de ${member.user.tag}: ${streakEmoji} (${userStreak.streak} jours)`);
        }
      } catch (streakError) {
        console.error("Erreur lors de la gestion du streak:", streakError);
      }
      // === FIN Gestion des STREAKS ===
      
      const soundFile = VOICE_SOUND_MEMBERS ? VOICE_SOUND_MEMBERS[memberId] : null;
      console.log(`Fichier son configuré: ${soundFile}`);

      // Si ce membre a un son configuré
      if (soundFile) {
        const soundPath = path.join(__dirname, soundFile);
        console.log(`Chemin: ${soundPath}`);

        // Vérifie que le fichier existe
        if (!fs.existsSync(soundPath)) {
          console.warn(`❌ Fichier audio non trouvé : ${soundPath}`);
          return;
        }

        console.log(`✅ Fichier trouvé, connexion au canal vocal...`);

        try {
          // Se connecte au canal vocal
          const connection = joinVoiceChannel({
            channelId: newState.channel.id,
            guildId: newState.guild.id,
            adapterCreator: newState.guild.voiceAdapterCreator
          });

          console.log(`✅ Connecté au canal vocal`);

          // Crée le lecteur audio et la ressource
          const player = createAudioPlayer();
          const resource = createAudioResource(soundPath);

          // Joue le son
          player.play(resource);
          connection.subscribe(player);

          console.log(`🎵 Son en cours de lecture...`);

          // Se déconnecte après la fin du son
          player.on(AudioPlayerStatus.Idle, () => {
            connection.destroy();
            console.log(`✅ Son terminé, déconnexion`);
          });

        } catch (error) {
          console.error(`❌ Erreur lors de la lecture du son :`, error);
        }
      }
    }
  } catch (error) {
    console.error("❌ Erreur dans l'événement VoiceStateUpdate :", error);
  }
});

client.on(Events.InteractionCreate, async interaction => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Erreur dans la commande ${interaction.commandName} :`, error);

    if (interaction.replied || interaction.deferred) {
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
});

// =========================================================
// DISCORD VIRTUAL WORLD - Événements Temps Réel
// =========================================================
const VIRTUAL_WORLD_GUILD_ID = "1459937260181917861";
const VIRTUAL_WORLD_API = process.env.VIRTUAL_WORLD_API || "http://localhost:3001/api/bot/events";

async function sendVirtualWorldEvent(eventType, payload) {
  try {
    // Si le backend n'est pas encore prêt, cela échouera silencieusement (catch)
    await fetch(VIRTUAL_WORLD_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: eventType, data: payload })
    });
  } catch (err) {
    // Backend indisponible pour le moment
  }
}

// === ÉCOUTE DES ORDRES DU BACKEND ===
const { io } = require("socket.io-client");
const backendSocket = io("http://localhost:3001");

backendSocket.on("connect", () => {
  console.log("[Virtual World] Bot connecté au Backend Web !");
});

backendSocket.on("MOVE_USER_DISCORD", async ({ userId, channelId }) => {
  try {
    const guild = await client.guilds.fetch(VIRTUAL_WORLD_GUILD_ID);
    const member = await guild.members.fetch(userId);
    // On déplace l'utilisateur uniquement s'il est déjà connecté en vocal quelque part
    if (member && member.voice.channel) {
      if (member.voice.channel.id !== channelId) {
        await member.voice.setChannel(channelId);
        console.log(`[Virtual World] Ordre exécuté : ${member.user.username} déplacé -> ${channelId}`);
      }
    }
  } catch (e) {
    console.error("[Virtual World] Erreur lors du déplacement Discord:", e.message);
  }
});

client.on(Events.VoiceStateUpdate, async (oldState, newState) => {
  try {
    const guildId = newState.guild?.id || oldState.guild?.id;
    console.log(`[Debug] VoiceStateUpdate reçu pour le serveur : ${guildId}`);
    if (guildId !== VIRTUAL_WORLD_GUILD_ID) {
      console.log(`[Debug] Serveur ignoré car il ne correspond pas à ${VIRTUAL_WORLD_GUILD_ID}`);
      return;
    }

    let member = newState.member || oldState.member;
    if (!member && newState.userId) {
      const guild = newState.guild || oldState.guild;
      if (guild) {
        member = await guild.members.fetch(newState.userId).catch(() => null);
      }
    }
    
    if (!member || member.user.bot) return; // Ne pas tracker les bots

    const userPayload = {
      userId: member.id,
      username: member.user.username,
      avatarUrl: member.user.displayAvatarURL({ extension: 'png', forceStatic: false }) || null,
    };

    // Utilisateur rejoint un vocal (pas de oldChannel, presence d'un newChannel)
    if (!oldState.channelId && newState.channelId) {
      console.log(`[Virtual World] ${userPayload.username} JOIN ${newState.channel.name}`);
      await sendVirtualWorldEvent("USER_JOIN_VOICE", {
        ...userPayload,
        channelId: newState.channelId,
        channelName: newState.channel.name
      });
    }
    // Utilisateur change de vocal
    else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
      console.log(`[Virtual World] ${userPayload.username} MOVE ${oldState.channel.name} -> ${newState.channel.name}`);
      await sendVirtualWorldEvent("USER_MOVE", {
        ...userPayload,
        oldChannelId: oldState.channelId,
        newChannelId: newState.channelId,
        newChannelName: newState.channel.name
      });
    }
    // Utilisateur quitte un vocal
    else if (oldState.channelId && !newState.channelId) {
      console.log(`[Virtual World] ${userPayload.username} LEAVE ${oldState.channel.name}`);
      await sendVirtualWorldEvent("USER_LEAVE_VOICE", {
        ...userPayload,
        channelId: oldState.channelId
      });
    }

  } catch (error) {
    console.error("[Virtual World] Erreur VoiceStateUpdate:", error);
  }
});

client.on(Events.PresenceUpdate, async (oldPresence, newPresence) => {
  try {
    const guildId = newPresence.guild?.id;
    if (guildId !== VIRTUAL_WORLD_GUILD_ID) return;
    
    const member = newPresence.member;
    if (!member || member.user.bot) return;

    // Cherche l'activité Spotify
    const spotifyActivity = newPresence.activities.find(a => a.name === 'Spotify');
    
    if (spotifyActivity) {
      const song = spotifyActivity.details; // Nom de la chanson
      const artist = spotifyActivity.state; // Artiste
      let albumArt = null;
      if (spotifyActivity.assets && spotifyActivity.assets.largeImage) {
        const largeImage = spotifyActivity.assets.largeImage;
        if (largeImage.startsWith('spotify:')) {
          albumArt = `https://i.scdn.co/image/${largeImage.slice(8)}`;
        } else {
          albumArt = `https://i.scdn.co/image/${largeImage}`;
        }
      }
      
      await sendVirtualWorldEvent("USER_SPOTIFY_UPDATE", {
        userId: member.id,
        spotify: { song, artist, albumArt }
      });
    } else {
      // Si on n'écoute plus Spotify (il était peut-être en train d'écouter avant)
      // On peut vérifier si oldPresence avait Spotify, si oui on envoie null
      const hadSpotify = oldPresence?.activities.some(a => a.name === 'Spotify');
      if (hadSpotify) {
        await sendVirtualWorldEvent("USER_SPOTIFY_UPDATE", {
          userId: member.id,
          spotify: null
        });
      }
    }
  } catch (error) {
    console.error("[Virtual World] Erreur PresenceUpdate:", error);
  }
});

client.login(process.env.DISCORD_TOKEN);