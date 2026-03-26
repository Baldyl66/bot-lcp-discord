const { SlashCommandBuilder } = require("discord.js");

function hasEquipagePermission(member) {
  if (!member || !member.roles || !member.roles.cache) return false;
  // Uniquement Capitaine et Assistant
  const EQUIPAGE_ROLE_IDS = [
    "1389995764280856626",   // Capitaine
    "1476639420265533613"    // Assistant
  ];
  return EQUIPAGE_ROLE_IDS.some(roleId => member.roles.cache.has(roleId));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName("equipage")
    .setDescription("Affiche le nombre de membres du serveur")
    .setDefaultMemberPermissions("0"),

  async execute(interaction) {
    const member = interaction.member;

    if (!hasEquipagePermission(member)) {
      return await interaction.reply({
        content: "❌ Tu n'as pas la permission d'utiliser cette commande.",
        ephemeral: true
      });
    }

    const memberCount = interaction.guild.memberCount;

    await interaction.reply(
      `🏴‍☠️ L'équipage compte actuellement **${memberCount} pirates** à bord !`
    );
  }
};