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
    .setDescription("Crée un rappel personnel")
    .addNumberOption(option =>
      option
        .setName("temps")
        .setDescription("Nombre d'unités de temps")
        .setRequired(true)
    )
    .addStringOption(option =>
      option
        .setName("unité")
        .setDescription("Unité de temps")
        .setRequired(true)
        .addChoices(
          { name: "Secondes", value: "secondes" },
          { name: "Minutes", value: "minutes" },
          { name: "Heures", value: "heures" },
          { name: "Jours", value: "jours" }
        )
    )
    .addStringOption(option =>
      option
        .setName("message")
        .setDescription("Le message du rappel")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const temps = interaction.options.getNumber("temps");
      const unite = interaction.options.getString("unité");
      const message = interaction.options.getString("message");

      // Déterminer le délai en millisecondes
      let delai;
      let uniteDisplay = `${temps}`;

      if (unite === "secondes") {
        delai = temps * 1000;
        uniteDisplay = `${temps}s`;
      } else if (unite === "minutes") {
        delai = temps * 60 * 1000;
        uniteDisplay = `${temps}min`;
      } else if (unite === "heures") {
        delai = temps * 60 * 60 * 1000;
        uniteDisplay = `${temps}h`;
      } else if (unite === "jours") {
        delai = temps * 24 * 60 * 60 * 1000;
        uniteDisplay = `${temps}j`;
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
