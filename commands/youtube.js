const { SlashCommandBuilder } = require("discord.js");
const { joinVoiceChannel, createAudioPlayer, createAudioResource, AudioPlayerStatus } = require("@discordjs/voice");
const { exec } = require("child_process");
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
        console.log(`📥 Téléchargement avec yt-dlp...`);

        // Télécharger l'audio avec yt-dlp via CLI
        const downloadPromise = new Promise((resolve, reject) => {
          const cmd = `yt-dlp --no-warnings --extractor-args "youtube:player_client=web" -f bestaudio -o "/tmp/yt_%(id)s.%(ext)s" "${youtubeUrl}"`;
          
          exec(cmd, (error, stdout, stderr) => {
            if (error) {
              reject(new Error(`yt-dlp: ${stderr || error.message}`));
              return;
            }
            
            // Récupérer le fichier téléchargé
            fs.readdir("/tmp", (err, files) => {
              if (err) {
                reject(err);
                return;
              }
              
              const videoId = youtubeUrl.match(/watch\?v=([^&]+)/)?.[1];
              const file = files.find(f => f.startsWith(`yt_${videoId}`));
              
              if (!file) {
                reject(new Error("Fichier téléchargé non trouvé"));
                return;
              }
              
              resolve(path.join("/tmp", file));
            });
          });
        });

        const file = await downloadPromise;
        console.log(`✅ Fichier téléchargé: ${file}`);

        // Créer la ressource audio depuis le fichier
        const resource = createAudioResource(fs.createReadStream(file), {
          inlineVolume: true
        });

        // Jouer le son
        player.play(resource);
        connection.subscribe(player);

        await interaction.editReply({
          content: `🎵 Lecture en cours...`
        }).catch(() => {});

        console.log(`✅ Lecture lancée`);

        // Gérer la fin de la lecture
        player.on(AudioPlayerStatus.Idle, () => {
          if (!isDestroyed) {
            isDestroyed = true;
            try {
              connection.destroy();
              fs.unlinkSync(file);
              console.log(`✅ Fichier supprimé`);
            } catch (e) {
              console.error(`Erreur suppression: ${e.message}`);
            }
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
              fs.unlinkSync(file);
            } catch (e) {}
          }
        });

        // Timeout de sécurité (30 min)
        setTimeout(() => {
          if (!isDestroyed) {
            isDestroyed = true;
            try {
              connection.destroy();
              fs.unlinkSync(file);
            } catch (e) {}
            console.log(`⏱️ Lecture arrêtée (timeout)`);
          }
        }, 30 * 60 * 1000);

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
        });
      }
    }
  }
};
