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

const { GUILD_ID, WELCOME_CHANNEL_ID, ALLOWED_ROLE_IDS } = require("./config");
const { buildWelcomeCard } = require("./utils/welcomeCard");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
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