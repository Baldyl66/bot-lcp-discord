const { SlashCommandBuilder } = require("discord.js");
const { YouTube } = require("@distube/youtube");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");

// L'ID utilisateur de Dylan
const DYLAN_ID = "829365573766479883";

// Initialiser YouTube
const youtube = new YouTube();

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

      // Répondre immédiatement pour éviter le timeout
      await interaction.deferReply();

      const voiceChannel = interaction.member.voice.channel;

      // Se connecter au canal vocal
      const connection = joinVoiceChannel({
        channelId: voiceChannel.id,
        guildId: interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator
      });

      console.log(`🎵 Dylan lance : ${youtubeUrl}`);

      // Créer le lecteur audio
      const player = createAudioPlayer();
      let isDestroyed = false;

      try {
        // Récupérer l'info de la vidéo YouTube
        console.log(`📥 Téléchargement des infos...`);
        const video = await youtube.getVideo(youtubeUrl);

        if (!video) {
          throw new Error("Vidéo non trouvée");
        }

        console.log(`✅ Vidéo trouvée: ${video.title}`);

        // Créer le stream audio
        const stream = await video.download({ quality: "lowest" });

        if (!stream) {
          throw new Error("Impossible de créer le stream");
        }

        // Créer la ressource audio
        const resource = createAudioResource(stream, {
          inlineVolume: true
        });

        // Jouer le son
        player.play(resource);
        connection.subscribe(player);

        await interaction.editReply({
          content: `🎵 Lecture: **${video.title}** (${Math.floor(video.duration / 60)}min)`
        }).catch(() => {});

        console.log(`✅ Lecture lancée`);

        // Gérer la fin de la lecture
        player.on(AudioPlayerStatus.Idle, () => {
          if (!isDestroyed) {
            isDestroyed = true;
            try {
              connection.destroy();
            } catch (e) {}
            console.log(`✅ Lecture terminée`);
          }
        });

        // Gérer les erreurs du lecteur
        player.on("error", error => {
          console.error("❌ Erreur lecteur :", error.message);
          if (!isDestroyed) {
            isDestroyed = true;
            try {
              connection.destroy();
            } catch (e) {}
          }
        });

        // Gérer les erreurs du stream
        stream.on("error", error => {
          console.error("❌ Erreur stream :", error.message);
          if (!isDestroyed) {
            isDestroyed = true;
            try {
              connection.destroy();
            } catch (e) {}
          }
        });

      } catch (downloadError) {
        try {
          connection.destroy();
        } catch (e) {}
        console.error("❌ Erreur :", downloadError.message);
        
        await interaction.editReply({
          content: `❌ Erreur : ${downloadError.message}`
        }).catch(() => {});
      }

    } catch (error) {
      console.error("❌ Erreur commande youtube :", error.message);
      
      if (interaction.deferred) {
        await interaction.editReply({
          content: "❌ Une erreur s'est produite."
        }).catch(() => {});
      } else {
        await interaction.reply({
          content: "❌ Une erreur s'est produite.",
          ephemeral: true
        }).catch(() => {});
      }
    }
  }
};
