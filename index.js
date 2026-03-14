require("dotenv").config();

const { Client, GatewayIntentBits, Events } = require("discord.js");

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
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
    } else {
      console.log(`Impossible de modifier le pseudo de ${member.user.tag}`);
    }
  } catch (error) {
    console.error("Erreur lors du renommage :", error);
  }
});

client.login(process.env.DISCORD_TOKEN);