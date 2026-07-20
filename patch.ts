const fs = require('fs');
let content = fs.readFileSync('frontend/src/game/OfficeWalkerEngine.ts', 'utf8');
content = content.replace('    if (!this.user || this.user.id === \\'spectator\\') return;', '    if (!this.user || this.user.id === \\'spectator\\') return;\\n    try {');
content = content.replace('      const chatX = cx - chatW / 2;\\n        \\n        ctx.fillStyle = \\'#fff\\';', '      const chatX = cx - chatW / 2;\\n        \\n        ctx.fillStyle = \\'#fff\\';');
// Actually let's just wrap the whole draw method body in try catch!

