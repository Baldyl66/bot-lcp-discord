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

      // Utiliser Wiktionnaire API (français, gratuit, illimité)
      const response = await axios.get(
        `https://fr.wiktionary.org/w/api.php?action=query&titles=${encodeURIComponent(mot)}&prop=extracts&explaintext=true&format=json`,
        { 
          timeout: 5000,
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
          }
        }
      );

      // Vérifier les erreurs dans la réponse
      if (response.data?.batchcomplete === false || response.data?.query?.general?.mainpage === undefined) {
        // Essayer avec Wikipedia à la place
        const wikiResponse = await axios.get(
          `https://fr.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(mot)}&prop=extracts&explaintext=true&format=json&exintro=true`,
          { 
            timeout: 5000,
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
            }
          }
        );

        const wikiPages = wikiResponse.data?.query?.pages;
        if (!wikiPages) {
          return interaction.reply({
            content: `❌ Le mot "${mot}" n'existe pas`,
            flags: 64
          });
        }

        const wikiPageId = Object.keys(wikiPages)[0];
        const wikiPage = wikiPages[wikiPageId];

        if (wikiPage.missing !== undefined) {
          return interaction.reply({
            content: `❌ Le mot "${mot}" n'existe pas`,
            flags: 64
          });
        }

        let wikiExtract = wikiPage.extract || "";
        if (!wikiExtract) {
          return interaction.reply({
            content: `❌ Aucune définition trouvée pour "${mot}"`,
            flags: 64
          });
        }

        wikiExtract = wikiExtract
          .substring(0, 2048)
          .replace(/\n\n/g, "\n");

        const wikiEmbed = new EmbedBuilder()
          .setTitle(`📖 ${mot.toUpperCase()}${domaine ? ` (${domaine})` : ""}`)
          .setColor(0x3498db)
          .setDescription(wikiExtract || "Aucune information")
          .addFields({
            name: "📚 Source",
            value: "Wikipedia (FR)",
            inline: true
          })
          .setFooter({ text: "Cliquez sur la source pour plus d'infos" });

        return await interaction.reply({ embeds: [wikiEmbed] });
      }

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
        .replace(/\n\n\n+/g, "\n")
        .substring(0, 2048);

      // Si domaine spécifié, essayer de filtrer
      if (domaine) {
        const lignes = cleanText.split("\n");
        const domaineFiltered = lignes.filter(ligne => ligne.toLowerCase().includes(domaine));
        if (domaineFiltered.length > 0) {
          cleanText = domaineFiltered.join("\n").substring(0, 1024);
        }
      }

      // Construire l'embed avec meilleure structure
      const embed = new EmbedBuilder()
        .setTitle(`📖 ${mot.toUpperCase()}${domaine ? ` (${domaine})` : ""}`)
        .setColor(0x9b59b6)
        .setDescription(cleanText)
        .addFields(
          {
            name: "📚 Source",
            value: "Wiktionnaire (FR)",
            inline: true
          },
          {
            name: "🏷️ Langue",
            value: "Français",
            inline: true
          }
        )
        .setFooter({ text: "Utilisez /définition pour plus de résultats" });

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
