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
    )
    .addStringOption(option =>
      option
        .setName("domaine")
        .setDescription("Domaine optionnel (botanique, informatique, etc.)")
        .setRequired(false)
    ),

  async execute(interaction) {
    try {
      const mot = interaction.options.getString("mot").toLowerCase().trim();
      const domaine = interaction.options.getString("domaine")?.toLowerCase().trim() || null;

      if (mot.length < 2) {
        return interaction.reply({
          content: "❌ Le mot doit faire au moins 2 caractères",
          flags: 64
        });
      }

      let resultat = await this.chercherWiktionnaire(mot, domaine);
      
      // Si Wiktionnaire échoue, essayer Wikipedia
      if (!resultat) {
        resultat = await this.chercherWikipedia(mot, domaine);
      }

      if (!resultat) {
        return interaction.reply({
          content: `❌ Aucune définition trouvée pour "${mot}"`,
          flags: 64
        });
      }

      await interaction.reply({ embeds: [resultat.embed] });

    } catch (error) {
      console.error("Erreur /définition :", error.message);

      await interaction.reply({
        content: "❌ Erreur lors de la récupération de la définition",
        flags: 64
      });
    }
  },

  async chercherWiktionnaire(mot, domaine) {
    try {
      const response = await axios.get(
        `https://fr.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(mot)}&prop=extracts&explaintext=true&format=json`,
        { 
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );

      if (!response.data?.query?.pages) {
        return null;
      }

      const pages = response.data.query.pages;
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page.missing !== undefined || !page.extract) {
        return null;
      }

      let cleanText = page.extract
        .replace(/\n\n\n+/g, "\n")
        .substring(0, 2048);

      if (domaine) {
        const lignes = cleanText.split("\n");
        const domaineFiltered = lignes.filter(ligne => ligne.toLowerCase().includes(domaine));
        if (domaineFiltered.length > 0) {
          cleanText = domaineFiltered.join("\n").substring(0, 1024);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 ${mot.toUpperCase()}${domaine ? ` (${domaine})` : ""}`)
        .setColor(0x9b59b6)
        .setDescription(cleanText)
        .addFields(
          { name: "📚 Source", value: "Wiktionnaire (FR)", inline: true },
          { name: "🏷️ Langue", value: "Français", inline: true }
        )
        .setFooter({ text: "Dictionnaire" });

      return { embed };
    } catch (error) {
      console.error("Erreur Wiktionnaire :", error.message);
      return null;
    }
  },

  async chercherWikipedia(mot, domaine) {
    try {
      const response = await axios.get(
        `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(mot)}&prop=extracts&explaintext=true&format=json&exintro=true`,
        { 
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );

      if (!response.data?.query?.pages) {
        return null;
      }

      const pages = response.data.query.pages;
      const pageId = Object.keys(pages)[0];
      const page = pages[pageId];

      if (page.missing !== undefined || !page.extract) {
        return null;
      }

      let cleanText = page.extract
        .substring(0, 2048)
        .replace(/\n\n/g, "\n");

      if (domaine) {
        const lignes = cleanText.split("\n");
        const domaineFiltered = lignes.filter(ligne => ligne.toLowerCase().includes(domaine));
        if (domaineFiltered.length > 0) {
          cleanText = domaineFiltered.join("\n").substring(0, 1024);
        }
      }

      const embed = new EmbedBuilder()
        .setTitle(`📖 ${mot.toUpperCase()}${domaine ? ` (${domaine})` : ""}`)
        .setColor(0x3498db)
        .setDescription(cleanText)
        .addFields(
          { name: "📚 Source", value: "Wikipedia (FR)", inline: true },
          { name: "🏷️ Langue", value: "Français", inline: true }
        )
        .setFooter({ text: "Encyclopédie" });

      return { embed };
    } catch (error) {
      console.error("Erreur Wikipedia :", error.message);
      return null;
    }
  }
};
