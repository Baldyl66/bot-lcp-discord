const { SlashCommandBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");

const streaksPath = path.join(__dirname, "..", "streaks.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("mystreak")
    .setDescription("Affiche ta série de connexions vocales 🔥"),

  execute: async (interaction) => {
    const userId = interaction.user.id;
    
    try {
      const streaksData = JSON.parse(fs.readFileSync(streaksPath, "utf8"));
      const userStreak = streaksData[userId] || { streak: 0, lastVoiceDate: null };

      const streakEmoji = "🔥";
      const streakDisplay = streakEmoji.repeat(Math.min(userStreak.streak, 10));

      let message = `**Votre série vocale :** ${streakDisplay} (${userStreak.streak} jours)\n`;
      
      if (userStreak.streak > 0) {
        message += `Dernière connexion: ${userStreak.lastVoiceDate}\n`;
        if (userStreak.streak >= 7) {
          message += "🏆 Une semaine! Impressionnant!";
        } else if (userStreak.streak >= 3) {
          message += "⭐ Bonne persistance!";
        }
      } else {
        message += "Rejoins un canal vocal pour commencer ta série! 🎤";
      }

      await interaction.reply({
        content: message,
        ephemeral: true
      });
    } catch (error) {
      console.error("Erreur lors de la récupération du streak:", error);
      await interaction.reply({
        content: "❌ Erreur lors de la récupération de ta série.",
        ephemeral: true
      });
    }
  }
};
