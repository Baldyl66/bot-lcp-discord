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

async function buildGoodbyeCard(user) {
  const canvas = createCanvas(1024, 576);
  const ctx = canvas.getContext("2d");

  const background = await loadImage("./assets/goodbye-template.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png", size: 512 })
  );

  const avatarWidth = 155;
  const avatarHeight = 165;
  const avatarX = 510 - avatarWidth / 2;
  const avatarY = 250;

  ctx.shadowColor = "rgba(0,0,0,0.20)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 4;

  ctx.drawImage(avatar, avatarX, avatarY, avatarWidth, avatarHeight);

  ctx.shadowColor = "transparent";
  ctx.shadowBlur = 0;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 0;

  ctx.strokeStyle = "#4a3422";
  ctx.lineWidth = 5;
  ctx.strokeRect(avatarX, avatarY, avatarWidth, avatarHeight);

  // Croix rouge pour indiquer la mort
  ctx.strokeStyle = "#FF0000";
  ctx.lineWidth = 10;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  
  // Première diagonale (haut-gauche à bas-droite)
  ctx.beginPath();
  ctx.moveTo(avatarX + 15, avatarY + 15);
  ctx.lineTo(avatarX + avatarWidth - 15, avatarY + avatarHeight - 15);
  ctx.stroke();
  
  // Deuxième diagonale (haut-droite à bas-gauche)
  ctx.beginPath();
  ctx.moveTo(avatarX + avatarWidth - 15, avatarY + 15);
  ctx.lineTo(avatarX + 15, avatarY + avatarHeight - 15);
  ctx.stroke();

  drawCenteredText(
    ctx,
    user.username,
    510,
    515,
    360,
    46,
    "#4a3422",
    "Serif"
  );

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "goodbye-card.png"
  });
}

module.exports = {
  buildGoodbyeCard
};
