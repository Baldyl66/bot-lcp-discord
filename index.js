require("dotenv").config();

const axios = require("axios");
const { createCanvas, loadImage } = require("canvas");

const {
  Client,
  GatewayIntentBits,
  Events,
  REST,
  Routes,
  SlashCommandBuilder,
  AttachmentBuilder
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

// --- Fonction utilitaire pour écrire du texte centré

function drawCenteredText(ctx, text, x, y, maxWidth, startFontSize, color, fontFamily = "Sans") {
  let fontSize = startFontSize;
  do {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    fontSize--;
  } while (ctx.measureText(text).width > maxWidth && fontSize > 16);

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

// --- Quand le bot est prêt

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

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

    const welcomeChannel = member.guild.channels.cache.get("1389997319558004847");
    if (!welcomeChannel) return;

    const canvas = createCanvas(1024, 576);
    const ctx = canvas.getContext("2d");

    // --- Fond/template

    const background = await loadImage("./assets/welcome-template.jpg");
    ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

    // --- Avatar rond

    const avatar = await loadImage(
      member.user.displayAvatarURL({ extension: "png", size: 512 })
    );

    const avatarX = 280;
    const avatarY = 270;
    const avatarRadius = 88;

    ctx.save();
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.clip();
    ctx.drawImage(
      avatar,
      avatarX - avatarRadius,
      avatarY - avatarRadius,
      avatarRadius * 2,
      avatarRadius * 2
    );
    ctx.restore();

    // --- Contour doré autour de l'avatar

    ctx.beginPath();
    ctx.arc(avatarX, avatarY, avatarRadius + 6, 0, Math.PI * 2, true);
    ctx.strokeStyle = "#c89b3c";
    ctx.lineWidth = 8;
    ctx.stroke();

    // --- Zone pseudo / membre
    // Ajuste ces coordonnées selon ton image finale
    
    drawCenteredText(ctx, member.user.username, 610, 288, 360, 62, "#f4b52b");
    drawCenteredText(
      ctx,
      `Tu es le ${member.guild.memberCount}e pirate`,
      610,
      355,
      360,
      34,
      "#f5f0e6"
    );

    const attachment = new AttachmentBuilder(canvas.toBuffer("image/png"), {
      name: "welcome-card.png"
    });

    await welcomeChannel.send({
      content: `🏴‍☠️ Bienvenue à bord, ${member} !`,
      files: [attachment]
    });

  } catch (error) {
    console.error("Erreur lors de la création de la carte de bienvenue :", error);
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
        content: `**${meme.title}**`,
        files: [meme.url]
      });

    } catch (error) {
      console.error("Erreur lors de la récupération du meme :", error);
      await interaction.reply("❌ Impossible de récupérer un meme.");
    }
  }
});

client.login(process.env.DISCORD_TOKEN);