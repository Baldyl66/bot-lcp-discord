require("dotenv").config();

const axios = require("axios");

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder
} = require("discord.js");

// --- Initialisation du client Discord avec les intents nécessaires

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// --- Commandes slash

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
    .toJSON(),

 new SlashCommandBuilder()
  .setName("meme")
  .setDescription("Envoie un meme")
  .addStringOption(option =>
    option
      .setName("type")
      .setDescription("Choisis le type de meme")
      .setRequired(true)
      .addChoices(
        { name: "🇫🇷 Français", value: "fr" },
        { name: "🌍 International", value: "int" }
      )
  )
  .toJSON()
];

// --- Quand le bot est prêt

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

    console.log("Commandes /equipage, /avatar et /meme enregistrées sur le serveur.");
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

// --- Gestion des commandes slash

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  if (interaction.commandName === "equipage") {
    const memberCount = interaction.guild.memberCount;

    await interaction.reply(
      `🏴‍☠️ L'équipage compte actuellement **${memberCount} pirates** à bord !`
    );
  }

  //-- Commande /avatar : Affiche l'avatar d'un membre ou de l'utilisateur qui a utilisé la commande
  
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

  // --- Commande /meme : Récupère un meme aléatoire depuis l'API et l'envoie dans le chat

  if (interaction.commandName === "meme") {
  try {

    const type = interaction.options.getString("type");

    let url;

    if (type === "fr") {

      const subreddits = ["rance", "memesfr", "dinosaure"];
      const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)];

      url = `https://meme-api.com/gimme/${randomSub}`;

    } else {

      url = "https://meme-api.com/gimme";

    }

    const response = await axios.get(url);
    const meme = response.data;

    await interaction.reply({
      content: `**${meme.title}**\n📍 r/${meme.subreddit}\n🌐 Type : ${type === "fr" ? "Français" : "International"}`,
      files: [meme.url]
    });

  } catch (error) {
    console.error("Erreur lors de la récupération du meme :", error);
    await interaction.reply("❌ Impossible de récupérer un meme.");
  }
}
});

client.login(process.env.DISCORD_TOKEN);