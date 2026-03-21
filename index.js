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
const { GUILD_ID, WELCOME_CHANNEL_ID, ALLOWED_ROLE_IDS, VOICE_SOUND_MEMBERS } = require("./config");
const { buildWelcomeCard } = require("./utils/welcomeCard");

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

    const bienvenueCommand = Array.isArray(registeredCommands)
      ? registeredCommands.find(command => command.name === "bienvenue")
      : null;

    console.log("Commande bienvenue trouvée :", bienvenueCommand);
    console.log("ALLOWED_ROLE_IDS :", ALLOWED_ROLE_IDS);

    const allowedRoleIds = [...new Set(ALLOWED_ROLE_IDS.filter(Boolean))];
    console.log("Rôles à autoriser :", allowedRoleIds);

    if (!bienvenueCommand || allowedRoleIds.length === 0) {
      console.warn("Permissions /bienvenue non appliquées (commande ou rôles introuvables).");
      return;
    }

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

    const permResponse = await rest.put(
      Routes.applicationCommandPermissions(
        readyClient.user.id,
        GUILD_ID,
        bienvenueCommand.id
      ),
      { body: { permissions } }
    );

    console.log("Réponse permissions Discord :", permResponse);
    console.log("Permissions /bienvenue appliquées aux rôles autorisés.");
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
      
      const soundFile = VOICE_SOUND_MEMBERS[memberId];
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

client.login(process.env.DISCORD_TOKEN);