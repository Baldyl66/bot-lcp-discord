const { SlashCommandBuilder, EmbedBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("définition")
    .setDescription("Affiche la définition d'un mot en français")
    .addStringOption(option =>
      option
        .setName("mot")
        .setDescription("Le mot à définir")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      const mot = interaction.options.getString("mot").toLowerCase().trim();

      if (mot.length < 2) {
        return interaction.reply({
          content: "❌ Le mot doit faire au moins 2 caractères",
          flags: 64
        });
      }

      // Utiliser Wiktionnaire API (français, gratuit, illimité)
      const response = await axios.get(
        `https://fr.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(mot)}&prop=extracts&explaintext=true&format=json`,
        { timeout: 5000 }
      );

      const pages = response.data?.query?.pages;
      
      if (!pages) {
        return interaction.reply({
          content: `❌ Impossible d'accéder au dictionnaire`,
          flags: 64
        });
      }

      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page.missing !== undefined) {
        return interaction.reply({
          content: `❌ Le mot "${mot}" n'existe pas dans le dictionnaire français`,
          flags: 64
        });
      }

      const extract = page.extract || "";

      if (!extract || extract.length < 10) {
        return interaction.reply({
          content: `❌ Aucune définition trouvée pour "${mot}"`,
          flags: 64
        });
      }

      // Nettoyer et limiter le texte
      let cleanText = extract
        .replace(/\n\n\n+/g, "\n") // Supprimer espaces excessifs
        .split("\n")[0] // Première section uniquement
        .substring(0, 1000); // Limiter à 1000 caractères

      // Construire l'embed
      const embed = new EmbedBuilder()
        .setTitle(`📖 ${mot.toUpperCase()}`)
        .setColor(0x3498db)
        .setDescription(cleanText)
        .setFooter({ text: "Powered by Wiktionnaire (FR)" });

      await interaction.reply({ embeds: [embed] });

    } catch (error) {
      console.error("Erreur /définition :", error.message);

      await interaction.reply({
        content: "❌ Erreur lors de la récupération de la définition",
        flags: 64
      });
    }
  }
};
