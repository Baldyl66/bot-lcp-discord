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

//--- Commande slash pour afficher le nombre de membres du serveur

const commands = [
  new SlashCommandBuilder()
    .setName("equipage")
    .setDescription("Affiche le nombre de membres du serveur")
    .toJSON()
];

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationCommands(readyClient.user.id),
      { body: commands }
    );

    console.log("Commande /equipage enregistrée.");
  } catch (error) {
    console.error("Erreur lors de l’enregistrement des commandes slash :", error);
  }
});

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
});

client.login(process.env.DISCORD_TOKEN);