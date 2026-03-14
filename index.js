require("dotenv").config();

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

//--- Initialisation du client Discord avec les intents nécessaires

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

//--- Commandes slash

const commands = [
  new SlashCommandBuilder()
    .setName("equipage")
    .setDescription("Affiche le nombre de membres du serveur")
    .toJSON(),

  new SlashCommandBuilder()
    .setName("avatar")
    .setDescription("Affiche l'avatar d'un membre")
    .addUserOption(option =>
      option
        .setName("utilisateur")
        .setDescription("Le membre dont tu veux voir l'avatar")
        .setRequired(false)
    )
    .toJSON()
];

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: [] }
    );

    await rest.put(
      Routes.applicationGuildCommands(
        readyClient.user.id,
        "1385346339214462986"
      ),
      { body: commands }
    );

    console.log("Commandes /equipage et /avatar enregistrées sur le serveur.");
  } catch (error) {
    console.error("Erreur lors de l’enregistrement des commandes slash :", error);
  }
});

// --- Événement déclenché lorsqu'un nouveau membre rejoint le serveur

client.on(Events.GuildMemberAdd, async (member) => {
  try {
    const username = member.user.username;
    const newNickname = `(LCP)-${username}`.slice(0, 32);

    if (member.manageable) {
      await member.setNickname(newNickname);
      console.log(`Pseudo modifié : ${member.user.tag} -> ${newNickname}`);
    }
  } catch (error) {
    console.error("Erreur lors du renommage :", error);
  }
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "equipage") {
    const memberCount = interaction.guild.memberCount;

    await interaction.reply(
      `🏴‍☠️ L'équipage compte actuellement **${memberCount} pirates** à bord !`
    );
  }

  if (interaction.commandName === "avatar") {
    const user = interaction.options.getUser("utilisateur") || interaction.user;

    const avatarURL = user.displayAvatarURL({
      size: 1024,
      extension: "png"
    });

    await interaction.reply({
      content: `🖼️ Avatar de **${user.username}** :\n${avatarURL}`
    });
  }
});

client.login(process.env.DISCORD_TOKEN);