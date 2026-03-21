const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const rappelsPath = path.join(__dirname, "..", "rappels.json");

// Charger les rappels existants
function chargerRappels() {
  if (fs.existsSync(rappelsPath)) {
    return JSON.parse(fs.readFileSync(rappelsPath, "utf8"));
  }
  return {};
}

// Fonction pour parser un délai au format texte
function parserDelai(texte) {
  if (!texte || typeof texte !== "string") return null;

  const texteClean = texte.toLowerCase().trim();
  let delai = 0;

  // Patterns à tester
  const patterns = [
    { regex: /(\d+)\s*j(?:ours?)?\s*/i, ms: 24 * 60 * 60 * 1000 },
    { regex: /(\d+)\s*h(?:eures?)?\s*/i, ms: 60 * 60 * 1000 },
    { regex: /(\d+)\s*m(?:in(?:utes?)?)?\s*/i, ms: 60 * 1000 },
    { regex: /(\d+)\s*s(?:ec(?:ondes?)?)?\s*/i, ms: 1000 }
  ];

  let texteRestant = texteClean;

  patterns.forEach(({ regex, ms }) => {
    const match = texteRestant.match(regex);
    if (match) {
      delai += parseInt(match[1]) * ms;
      texteRestant = texteRestant.replace(regex, "");
    }
  });

  // Vérifier qu'il n'y a pas de caractères non reconnus
  if (texteRestant.replace(/\s/g, "").length > 0) {
    return null; // Format invalide
  }

  return delai > 0 ? delai : null;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rappel")
    .setDescription("Crée un rappel personnel")
    .addStringOption(option =>
      option
        .setName("temps")
        .setDescription("Temps du rappel (ex: 1j, 2h, 30min, 1h30min, 2j 3h 30min)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Le message du rappel")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const tempsText = interaction.options.getString("temps");
      const message = interaction.options.getString("message");

      // Parser le délai
      const delai = parserDelai(tempsText);

      if (!delai) {
        return interaction.reply({
          content: "❌ Format de temps invalide ! Utilise : `1j`, `2h`, `30min`, `45s` ou combina-les : `1h30min`, `2j 3h 30min`",
          ephemeral: true
        });
      }

      // Sauvegarder le rappel
      const rappels = chargerRappels();
      if (!rappels[interaction.user.id]) {
        rappels[interaction.user.id] = [];
      }

      const rappelId = Date.now();
      rappels[interaction.user.id].push({
        id: rappelId,
        message,
        tempsRestant: delai,
        creatdAt: Date.now()
      });
      sauvegarderRappels(rappels);

      // Répondre à l'utilisateur
      await interaction.reply({
        content: `✅ Rappel créé pour ${tempsText} : **${message}**`,
        ephemeral: true
      });

      // Programmer le rappel
      setTimeout(async () => {
        try {
          const user = await interaction.client.users.fetch(interaction.user.id);
          const embed = new EmbedBuilder()
            .setTitle("⏰ Rappel")
            .setDescription(`**${message}**`)
            .setColor(0xfaa61a);

          await user.send({ embeds: [embed] });

          // Supprimer le rappel de la liste
          const rappels = chargerRappels();
          if (rappels[interaction.user.id]) {
            rappels[interaction.user.id] = rappels[interaction.user.id].filter(r => r.id !== rappelId);
            sauvegarderRappels(rappels);
          }
        } catch (error) {
          console.error("Erreur lors de l'envoi du rappel :", error);
        }
      }, delai);

      await interaction.reply({
        content: `✅ Rappel défini dans **${uniteDisplay}** : *${message}*`,
        ephemeral: true
      });

    } catch (error) {
      console.error("Erreur lors de la commande /rappel :", error);

      await interaction.reply({
        content: "❌ Erreur lors de la création du rappel.",
        ephemeral: true
      });
    }
  }
};
