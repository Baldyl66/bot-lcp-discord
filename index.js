require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ]
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);
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

client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;

  if (message.content === "!equipage") {
    const memberCount = message.guild.memberCount;

    message.channel.send(
      `🏴‍☠️ L'équipage compte actuellement **${memberCount} pirates** à bord !`
    );
  }
});

client.login(process.env.DISCORD_TOKEN);