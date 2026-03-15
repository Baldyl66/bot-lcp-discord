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

//--- Configuration

const GUILD_ID = "1385346339214462986";
const WELCOME_CHANNEL_ID = "1389997319558004847";

//--- Liste des rôles autorisés a effectuer certaines actions

const ALLOWED_ROLE_IDS = [
  "1389995764280856626",   //--- Rôle Capitaine
  "1476639420265533613",  //--- Rôle Assistant
  "1425092687815508078"  //--- Rôle Admin
];

//--- Initialisation du client Discord avec les intents nécessaires

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
    .toJSON(),

  new SlashCommandBuilder()
    .setName("bienvenue")
    .setDescription("Génère une carte de bienvenue")
    .addUserOption(option =>
      option
        .setName("utilisateur")
        .setDescription("Le membre pour lequel générer la carte")
        .setRequired(false)
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

// --- Vérifie si un membre a le droit d'utiliser /bienvenue

function hasBienvenuePermission(member) {
  if (!member || !member.roles || !member.roles.cache) return false;

  return ALLOWED_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

// --- Génération de la carte de bienvenue

async function buildWelcomeCard(user, memberCount) {
  const canvas = createCanvas(1024, 576);
  const ctx = canvas.getContext("2d");

  // --- Fond/template
  const background = await loadImage("./assets/welcome-template.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  // --- Avatar rond
  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png", size: 512 })
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

  // --- Texte
  drawCenteredText(ctx, user.username, 610, 288, 360, 62, "#f4b52b");
  drawCenteredText(
    ctx,
    `Tu es le ${memberCount}e pirate`,
    610,
    355,
    360,
    34,
    "#f5f0e6"
  );

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "welcome-card.png"
  });
}

// --- Quand le bot est prêt

client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Bot connecté : ${readyClient.user.tag}`);

  try {
    const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);

    await rest.put(
      Routes.applicationGuildCommands(
        readyClient.user.id,
        GUILD_ID
      ),
      { body: commands }
    );

    console.log("Commandes /equipage, /avatar, /meme et /bienvenue enregistrées sur le serveur.");
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
      await interaction.reply({
        content: "❌ Impossible de récupérer un meme.",
        ephemeral: true
      });
    }
  }

  if (interaction.commandName === "bienvenue") {
    try {
      const member = interaction.member;

      if (!hasBienvenuePermission(member)) {
        return await interaction.reply({
          content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
          ephemeral: true
        });
      }

      const targetUser = interaction.options.getUser("utilisateur") || interaction.user;
      const attachment = await buildWelcomeCard(targetUser, interaction.guild.memberCount);

      await interaction.reply({
        content: `🏴‍☠️ Aperçu de la carte de bienvenue pour **${targetUser.username}** :`,
        files: [attachment]
      });

    } catch (error) {
      console.error("Erreur lors de la commande /bienvenue :", error);
      await interaction.reply({
        content: "❌ Impossible de générer la carte de bienvenue.",
        ephemeral: true
      });
    }
  }
});

client.login(process.env.DISCORD_TOKEN);