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

// Sauvegarder les rappels
function sauvegarderRappels(rappels) {
  fs.writeFileSync(rappelsPath, JSON.stringify(rappels, null, 2));
}

// Parser le temps (ex: "1h", "30min", "2d")
function parserTemps(tempsStr) {
  const match = tempsStr.match(/^(\d+)([smhdjw])$/i);
  if (!match) return null;

  const nombre = parseInt(match[1]);
  const unite = match[2].toLowerCase();

  const conversions = {
    s: 1000,
    m: 60 * 1000,
    h: 60 * 60 * 1000,
    d: 24 * 60 * 60 * 1000,
    j: 24 * 60 * 60 * 1000,
    w: 7 * 24 * 60 * 60 * 1000
  };

  return nombre * (conversions[unite] || 0);
}

// Formater le temps en texte lisible
function formaterTemps(ms) {
  const secondes = Math.floor(ms / 1000);
  const minutes = Math.floor(secondes / 60);
  const heures = Math.floor(minutes / 60);
  const jours = Math.floor(heures / 24);

  if (jours > 0) return `${jours}j`;
  if (heures > 0) return `${heures}h`;
  if (minutes > 0) return `${minutes}min`;
  return `${secondes}s`;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rappel")
    .setDescription("Crée un rappel personnel")
    .addStringOption(option =>
      option
        .setName("temps")
        .setDescription("Temps avant le rappel (ex: 1h, 30min, 2d)")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Le message du rappel")
        .setRequired(true)
    )
    .addSubcommand(subcommand =>
      subcommand
        .setName("list")
        .setDescription("Affiche tous tes rappels actifs")
    ),

  async execute(interaction) {
    try {
      // Commande /rappel list
      if (interaction.options.getSubcommand() === "list") {
        const rappels = chargerRappels();
        const userRappels = rappels[interaction.user.id] || [];

        if (userRappels.length === 0) {
          return await interaction.reply({
            content: "✅ Tu n'as aucun rappel actif.",
            ephemeral: true
          });
        }

        const embed = new EmbedBuilder()
          .setTitle(`⏰ Tes rappels (${userRappels.length})`)
          .setColor(0x43b581)
          .setDescription(
            userRappels
              .map((r, i) => `${i + 1}. **${r.message}** - dans ${formaterTemps(r.tempsRestant)}`)
              .join("\n")
          )
          .setFooter({ text: "Utilise /rappel pour en ajouter un nouveau" });

        return await interaction.reply({ embeds: [embed], ephemeral: true });
      }

      // Commande /rappel [temps] [message]
      const tempsStr = interaction.options.getString("temps");
      const message = interaction.options.getString("message");

      const delai = parserTemps(tempsStr);
      if (!delai || delai <= 0) {
        return await interaction.reply({
          content: "❌ Format invalide! Utilise: 30min, 1h, 2d, 1w (s, m, h, d, j, w)",
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

      // Programmer le rappel
      setTimeout(async () => {
        try {
          const user = await interaction.client.users.fetch(interaction.user.id);
          const embed = new EmbedBuilder()
            .setTitle("⏰ Tes rappels")
            .setDescription(`**${message}**`)
            .setColor(0xfaa61a)
            .setFooter({ text: "Tu peux fermer ce message" });

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
        content: `✅ Rappel défini dans **${formaterTemps(delai)}** : *${message}*`,
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
