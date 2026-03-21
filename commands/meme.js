const { SlashCommandBuilder } = require("discord.js");
const axios = require("axios");

module.exports = {
  data: new SlashCommandBuilder()
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
    ),

  async execute(interaction) {
    try {
      const type = interaction.options.getString("type");
      let meme = null;
      let attempts = 0;
      const maxAttempts = 3;

      // Fonction pour récupérer un meme avec retry
      while (!meme && attempts < maxAttempts) {
        try {
          let url;

          if (type === "fr") {
            const subreddits = ["rance", "memesfr", "dinosaure"];
            const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)];
            url = `https://meme-api.com/gimme/${randomSub}`;
          } else {
            url = "https://meme-api.com/gimme";
          }

          const response = await axios.get(url, { timeout: 5000 });
          
          // Vérifier que les données sont valides
          if (response.data && response.data.url && response.data.title && !response.data.nsfw) {
            meme = response.data;
            break;
          }
        } catch (error) {
          attempts++;
          if (attempts < maxAttempts) {
            // Attendre un peu avant de réessayer
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      if (!meme) {
        return await interaction.reply({
          content: "❌ Impossible de récupérer un meme. Réessaie plus tard.",
          ephemeral: true
        });
      }

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
};