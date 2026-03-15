const { createCanvas, loadImage } = require("canvas");
const { AttachmentBuilder } = require("discord.js");

async function buildWelcomeCard(user) {

  const canvas = createCanvas(1024, 576);
  const ctx = canvas.getContext("2d");

  const background = await loadImage("./assets/welcome-template.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png", size: 512 })
  );

  const avatarSize = 220;
  const avatarX = canvas.width / 2 - avatarSize / 2;
  const avatarY = 150;

  ctx.drawImage(avatar, avatarX, avatarY, avatarSize, avatarSize);

  ctx.strokeStyle = "#3b2b1a";
  ctx.lineWidth = 10;
  ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

  ctx.font = "bold 50px Serif";
  ctx.fillStyle = "#3b2b1a";
  ctx.textAlign = "center";

  ctx.fillText(
    user.username,
    canvas.width / 2,
    avatarY + avatarSize + 80
  );

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "welcome-card.png"
  });
}

module.exports = {
  buildWelcomeCard
};