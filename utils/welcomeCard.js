const { createCanvas, loadImage } = require("canvas");
const { AttachmentBuilder } = require("discord.js");

function drawCenteredText(ctx, text, x, y, maxWidth, startFontSize, color, fontFamily = "Serif") {
  let fontSize = startFontSize;

  do {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    fontSize--;
  } while (ctx.measureText(text).width > maxWidth && fontSize > 18);

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

async function buildWelcomeCard(user) {
  const canvas = createCanvas(1024, 576);
  const ctx = canvas.getContext("2d");

  const background = await loadImage("./assets/welcome-template.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png", size: 512 })
  );

  // Zone photo mieux ajustée au poster
 const avatarWidth = 200;
 const avatarHeight = 215;
 const avatarX = 512 - avatarWidth / 2;
 const avatarY = 205;

  // Ombre légère
  ctx.shadowColor = "rgba(0,0,0,0.20)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight);

  // Bordure plus fine
  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = "#4a3422";
  ctx.lineWidth = 5;
  ctx.strokeRect(avatarX, avatarY, avatarWidth, avatarHeight);

  // Pseudo plus bas
  drawCenteredText(
    ctx,
    user.username,
    canvas.width / 2,
    490,
    360,
    46,
    "#4a3422",
    "Serif"
  );

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "welcome-card.png"
  });
}

module.exports = {
  buildWelcomeCard
};