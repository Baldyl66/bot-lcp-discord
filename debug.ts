
const fs = require('fs');
let code = fs.readFileSync('frontend/src/game/OfficeWalkerEngine.ts', 'utf8');

code = code.replace(
  'ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, this.spriteW, this.spriteH);',
  \	ry {
        ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, this.spriteW, this.spriteH);
      } catch (e) {
        console.error('DRAW ERROR:', e, {img, sx, sy, w: this.spriteW, h: this.spriteH});
        ctx.fillStyle = 'red';
        ctx.fillText('ERR: ' + e.message, sx, sy);
      }\
);

fs.writeFileSync('frontend/src/game/OfficeWalkerEngine.ts', code);

