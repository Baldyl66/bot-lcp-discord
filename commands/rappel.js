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

module.exports = {
  data: new SlashCommandBuilder()
    .setName("rappel")
    .setDescription("Crée un rappel personnel avec unités multiples")
    .addNumberOption(option =>
      option
        .setName("jours")
        .setDescription("Nombre de jours")
        .setMinValue(0)
    )
    .addNumberOption(option =>
      option
        .setName("heures")
        .setDescription("Nombre d'heures")
        .setMinValue(0)
    )
    .addNumberOption(option =>
      option
        .setName("minutes")
        .setDescription("Nombre de minutes")
        .setMinValue(0)
    )
    .addNumberOption(option =>
      option
        .setName("secondes")
        .setDescription("Nombre de secondes")
        .setMinValue(0)
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Le message du rappel")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const jours = interaction.options.getNumber("jours") || 0;
      const heures = interaction.options.getNumber("heures") || 0;
      const minutes = interaction.options.getNumber("minutes") || 0;
      const secondes = interaction.options.getNumber("secondes") || 0;
      const message = interaction.options.getString("message");

      // Vérifier qu'au least un champ de temps est rempli
      if (jours === 0 && heures === 0 && minutes === 0 && secondes === 0) {
        return await interaction.reply({
          content: "❌ Tu dois spécifier au moins une unité de temps (jours, heures, minutes ou secondes).",
          ephemeral: true
        });
      }

      // Calculer le délai total en millisecondes
      const delai = (secondes * 1000) + 
                    (minutes * 60 * 1000) + 
                    (heures * 60 * 60 * 1000) + 
                    (jours * 24 * 60 * 60 * 1000);

      // Formater l'affichage
      const parts = [];
      if (jours > 0) parts.push(`${jours}j`);
      if (heures > 0) parts.push(`${heures}h`);
      if (minutes > 0) parts.push(`${minutes}min`);
      if (secondes > 0) parts.push(`${secondes}s`);
      const uniteDisplay = parts.join(" ");

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
