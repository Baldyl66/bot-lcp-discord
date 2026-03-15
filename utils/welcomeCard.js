const { createCanvas, loadImage } = require("canvas");
const { AttachmentBuilder } = require("discord.js");

function drawCenteredText(ctx, text, x, y, maxWidth, startFontSize, color, fontFamily = "Sans") {
  let fontSize = startFontSize;

  do {
    ctx.font = `bold ${fontSize}px ${fontFamily}`;
    fontSize--;
  } while (ctx.measureText(text).width > maxWidth && fontSize > 16);

  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.fillText(text, x, y);
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function drawWoodPanel(ctx, x, y, width, height) {
  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetX = 0;
  ctx.shadowOffsetY = 8;

  const woodGradient = ctx.createLinearGradient(x, y, x, y + height);
  woodGradient.addColorStop(0, "#5b3217");
  woodGradient.addColorStop(0.5, "#7a4721");
  woodGradient.addColorStop(1, "#4a2612");

  roundRect(ctx, x, y, width, height, 18);
  ctx.fillStyle = woodGradient;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, x, y, width, height, 18);
  ctx.strokeStyle = "#d7a33c";
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 210, 120, 0.18)";
  ctx.lineWidth = 2;

  for (let i = 0; i < 4; i++) {
    const yy = y + 18 + i * 18;
    ctx.beginPath();
    ctx.moveTo(x + 20, yy);
    ctx.lineTo(x + width - 20, yy + 4);
    ctx.stroke();
  }
}

async function buildWelcomeCard(user, memberCount) {
  const canvas = createCanvas(1024, 576);
  const ctx = canvas.getContext("2d");

  const background = await loadImage("./assets/welcome-template.jpg");
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "rgba(0, 0, 0, 0.10)";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const parchmentX = 330;
  const parchmentY = 70;
  const parchmentW = 380;
  const parchmentH = 90;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.28)";
  ctx.shadowBlur = 15;
  ctx.shadowOffsetY = 6;

  const parchmentGradient = ctx.createLinearGradient(
    parchmentX,
    parchmentY,
    parchmentX,
    parchmentY + parchmentH
  );
  parchmentGradient.addColorStop(0, "#f0ddb1");
  parchmentGradient.addColorStop(0.5, "#e2c995");
  parchmentGradient.addColorStop(1, "#cfa86a");

  roundRect(ctx, parchmentX, parchmentY, parchmentW, parchmentH, 22);
  ctx.fillStyle = parchmentGradient;
  ctx.fill();
  ctx.restore();

  roundRect(ctx, parchmentX, parchmentY, parchmentW, parchmentH, 22);
  ctx.strokeStyle = "#8f6230";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = "rgba(120, 75, 25, 0.12)";
  ctx.lineWidth = 1.5;
  for (let i = 0; i < 5; i++) {
    const yy = parchmentY + 15 + i * 14;
    ctx.beginPath();
    ctx.moveTo(parchmentX + 18, yy);
    ctx.lineTo(parchmentX + parchmentW - 18, yy + 2);
    ctx.stroke();
  }

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.25)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  drawCenteredText(ctx, "Bienvenue à bord !", 520, 127, 330, 40, "#533014");
  ctx.restore();

  const avatarX = 300;
  const avatarY = 285;
  const avatarRadius = 92;

  const avatar = await loadImage(
    user.displayAvatarURL({ extension: "png", size: 512 })
  );

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 18, 0, Math.PI * 2, true);
  ctx.fillStyle = "rgba(255, 224, 120, 0.18)";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 8, 0, Math.PI * 2, true);
  ctx.fillStyle = "#6c431c";
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius, 0, Math.PI * 2, true);
  ctx.closePath();
  ctx.clip();

  ctx.drawImage(
    avatar,
    avatarX - avatarRadius,
    avatarY - avatarRadius,
    avatarRadius * 2,
    avatarRadius * 2
  );

  ctx.restore();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 8, 0, Math.PI * 2, true);
  ctx.strokeStyle = "#d9a441";
  ctx.lineWidth = 8;
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(avatarX, avatarY, avatarRadius + 18, 0, Math.PI * 2, true);
  ctx.strokeStyle = "rgba(255, 244, 200, 0.50)";
  ctx.lineWidth = 3;
  ctx.stroke();

  const woodX = 430;
  const woodY = 220;
  const woodW = 360;
  const woodH = 130;

  drawWoodPanel(ctx, woodX, woodY, woodW, woodH);

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.4)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 3;
  drawCenteredText(ctx, user.username, 610, 282, 310, 56, "#f2b532");
  ctx.restore();

  const subX = 430;
  const subY = 365;
  const subW = 360;
  const subH = 54;

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.22)";
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;

  roundRect(ctx, subX, subY, subW, subH, 14);
  ctx.fillStyle = "rgba(20, 28, 45, 0.58)";
  ctx.fill();
  ctx.restore();

  roundRect(ctx, subX, subY, subW, subH, 14);
  ctx.strokeStyle = "rgba(240, 200, 110, 0.75)";
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.save();
  ctx.shadowColor = "rgba(0,0,0,0.35)";
  ctx.shadowBlur = 6;
  ctx.shadowOffsetX = 1;
  ctx.shadowOffsetY = 2;
  drawCenteredText(
    ctx,
    `Tu es le ${memberCount}e pirate`,
    610,
    401,
    320,
    28,
    "#fff5dc"
  );
  ctx.restore();

  ctx.fillStyle = "#d9a441";
  ctx.beginPath();
  ctx.arc(410, 285, 5, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.arc(810, 285, 5, 0, Math.PI * 2);
  ctx.fill();

  return new AttachmentBuilder(canvas.toBuffer("image/png"), {
    name: "welcome-card.png"
  });
}

module.exports = {
  buildWelcomeCard
};