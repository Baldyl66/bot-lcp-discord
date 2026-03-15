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
};