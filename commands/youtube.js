const { SlashCommandBuilder } = require("discord.js");
const ytdl = require("ytdl-core");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const fs = require("fs");
const path = require("path");

// L'ID utilisateur de Dylan
const DYLAN_ID = "829365573766479883";

// Fonction pour vérifier que c'est Dylan
function isDylan(userId) {
  return userId === DYLAN_ID;
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("youtube")
    .setDescription("[Dylan only] 🎵 Joue l'audio d'une vidéo YouTube dans le canal vocal")
    .addStringOption(option =>
      option
        .setName("lien")
        .setDescription("Le lien de la vidéo YouTube")
        .setRequired(true)
    ),

  async execute(interaction) {
    try {
      // Vérifier que c'est Dylan
      if (!isDylan(interaction.user.id)) {
        return await interaction.reply({
          content: "❌ Cette commande est réservée à Dylan uniquement.",
          ephemeral: true
        });
      }

      // Vérifier que l'utilisateur est connecté à un canal vocal
      if (!interaction.member.voice.channel) {
        return await interaction.reply({
          content: "❌ Tu dois être connecté à un canal vocal pour utiliser cette commande.",
          ephemeral: true
        });
      }

      const youtubeUrl = interaction.options.getString("lien");

      // Valider le lien YouTube
      if (!ytdl.validateURL(youtubeUrl)) {
        return await interaction.reply({
          content: "❌ Le lien fourni n'est pas un lien YouTube valide.",
          ephemeral: true
        });
      }

      // Répondre immédiatement pour éviter le timeout
      await interaction.deferReply();

      const voiceChannel = interaction.member.voice.channel;

      // Se connecter au canal vocal
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      console.log(`🎵 Dylan lance un téléchargement YouTube: ${youtubeUrl}`);

      // Créer le lecteur audio
      const player = createAudioPlayer();

      try {
        // Télécharger l'audio en streaming
        const stream = ytdl(youtubeUrl, {
          quality: "highestaudio",
          filter: "audioonly"
        });

        // Créer la ressource audio
        const resource = createAudioResource(stream);

        // Jouer le son
        player.play(resource);
        connection.subscribe(player);

        await interaction.editReply({
          content: "🎵 Lecture en cours..."
        });

        console.log(`✅ Lecture YouTube lancée`);

        // Gérer les événements du lecteur
        player.on(AudioPlayerStatus.Idle, () => {
          connection.destroy();
          console.log(`✅ Lecture YouTube terminée, déconnexion`);
        });

        player.on("error", error => {
          console.error("❌ Erreur lors de la lecture :", error);
          connection.destroy();
        });

      } catch (downloadError) {
        connection.destroy();
        console.error("❌ Erreur lors du téléchargement YouTube :", downloadError);
        
        return await interaction.editReply({
          content: `❌ Erreur lors du téléchargement : ${downloadError.message}`
        });
      }

    } catch (error) {
      console.error("❌ Erreur dans la commande youtube :", error);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ Une erreur s'est produite."
        });
      } else {
        await interaction.reply({
          content: "❌ Une erreur s'est produite.",
          ephemeral: true
        });
      }
    }
  }
};
