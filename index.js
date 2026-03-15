require("dotenv").config();

const fs = require("fs");
const path = require("path");

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes
} = require("discord.js");

const { GUILD_ID, WELCOME_CHANNEL_ID } = require("./config");
const { buildWelcomeCard } = require("./utils/welcomeCard");

// --- Initialisation du client Discord avec les intents nécessaires

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Chargement des commandes

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

// --- Quand le bot est prêt

client.once(Events.ClientReady, async readyClient => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(readyClient.user.id, GUILD_ID),
      { body: commands }
    );

    console.log("Commandes enregistrées sur le serveur.");
  } catch (error) {
    console.error("Erreur lors de l’enregistrement des commandes slash :", error);
  }
});

// --- Événement déclenché lorsqu'un nouveau membre rejoint le serveur

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

    const attachment = await buildWelcomeCard(member.user, member.guild.memberCount);

    await welcomeChannel.send({
      content: `🏴‍☠️ Bienvenue à bord, ${member} !`,
      files: [attachment]
    });
  } catch (error) {
    console.error("Erreur lors de la création de la carte de bienvenue :", error);
  }
});

// --- Gestion des commandes slash

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