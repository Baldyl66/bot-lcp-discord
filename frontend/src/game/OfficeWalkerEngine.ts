/* =========================================================================
   OFFICE WALKER — TECH DEMO
   Architecture : Assets / Input / WorldMap / Player / Camera / HUD / Game
   Rendu : pixel-art procédural généré sur des canvases hors-écran (aucune
   image externe), upscalé "nearest neighbor" pour un rendu net.
   ========================================================================= */

/* ---------------------------- Constantes -------------------------------- */
const ART      = 16;         
const SCALE    = 3;          
const TILE     = ART * SCALE; 
const COLS = 55, ROWS = 24;
const WORLD_W = COLS * TILE, WORLD_H = ROWS * TILE;

/* ------------------------------ Utils ------------------------------------ */
class Px {
  static canvas(w: number, h: number) {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    return { c, ctx };
  }
  static circle(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, color: string) {
    ctx.fillStyle = color;
    for (let y = -r; y <= r; y++) {
      const half = Math.floor(Math.sqrt(Math.max(0, r * r - y * y)) + 0.5);
      ctx.fillRect(Math.round(cx - half), Math.round(cy + y), half * 2, 1);
    }
  }
  static rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, color: string) {
    ctx.fillStyle = color;
    ctx.fillRect(Math.round(x), Math.round(y), w, h);
  }

  // Contour de silhouette 1px : détoure automatiquement n'importe quel sprite
  // pour qu'il se détache proprement du sol, sans retoucher chaque dessin.
  static outline(canvas: HTMLCanvasElement, color = 'rgba(20,16,14,0.55)') {
    const ctx = canvas.getContext('2d')!;
    const w = canvas.width, h = canvas.height;
    if (w === 0 || h === 0) return;
    const src = ctx.getImageData(0, 0, w, h).data;
    const alphaAt = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h) ? 0 : src[(y * w + x) * 4 + 3];
    ctx.fillStyle = color;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (alphaAt(x, y) > 10) continue;
        if (alphaAt(x - 1, y) > 10 || alphaAt(x + 1, y) > 10 || alphaAt(x, y - 1) > 10 || alphaAt(x, y + 1) > 10) {
          ctx.fillRect(x, y, 1, 1);
        }
      }
    }
  }

  // Volume / éclairage ambiant : lumière douce en haut, ombre douce en bas.
  // 'source-atop' ne peint que sur les pixels déjà opaques du sprite => respecte sa forme.
  static addVolume(ctx: CanvasRenderingContext2D, w: number, h: number, top = 0.16, bottom = 0.22) {
    ctx.save();
    ctx.globalCompositeOperation = 'source-atop';
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, `rgba(255,255,255,${top})`);
    grad.addColorStop(0.45, 'rgba(255,255,255,0)');
    grad.addColorStop(1, `rgba(0,0,0,${bottom})`);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
    // Léger liseré de lumière rasante sur le bord gauche (profondeur)
    const rim = ctx.createLinearGradient(0, 0, Math.min(4, w), 0);
    rim.addColorStop(0, 'rgba(255,255,255,0.10)');
    rim.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = rim;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
}

class EventBus {
  listeners: any = {};
  on(evt: string, fn: any) { (this.listeners[evt] ||= []).push(fn); }
  emit(evt: string, payload?: any) { (this.listeners[evt] || []).forEach((fn: any) => fn(payload)); }
}

/* ============================== ASSETS =================================== */
class Assets {
  floors: any = {};
  wall: any = null;
  rug: any = null;
  furniture: any = {};
  player: any = { down: [], up: [], left: [], right: [] };

  constructor() {
    this._buildFloors();
    this._buildWall();
    this._buildRug();
    this._buildFurniture();
    // Default fallback sprites for global
    this.player = this.generatePlayerSprites();
  }

  _buildFloors() {
    const mk = (drawFn: any) => {
      const { c, ctx } = Px.canvas(ART, ART);
      drawFn(ctx);
      Px.addVolume(ctx, ART, ART, 0.05, 0.10); // très subtil pour que les tuiles se raccordent sans coutures visibles
      return c;
    };

    this.floors.reception = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#8a6a49');
      for (let y = 0; y < ART; y += 4) Px.rect(ctx, 0, y, ART, 1, '#6f5238');
      Px.rect(ctx, 0, 0, ART, 1, '#a3855f');
    });

    this.floors.openspace = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#37485c');
      for (let y = 0; y < ART; y++) for (let x = 0; x < ART; x++) {
        if ((x * 7 + y * 13) % 23 === 0) Px.rect(ctx, x, y, 1, 1, '#2c3a4b');
        if ((x * 5 + y * 3) % 29 === 0) Px.rect(ctx, x, y, 1, 1, '#425a72');
      }
    });

    this.floors.studio = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#2a2a2e');
      for (let y = 0; y < ART; y += 4) Px.rect(ctx, 0, y, ART, 1, '#1f1f22');
      // Damier pour insonorisation
      for (let x = 0; x < ART; x += 4) {
        for (let y = 0; y < ART; y += 4) {
          if ((x + y) % 8 === 0) Px.rect(ctx, x, y, 4, 4, '#242428');
        }
      }
    });

    this.floors.corridor = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#6e7581');
      Px.rect(ctx, 8, 0, 8, 8, '#767e8b');
      Px.rect(ctx, 0, 8, 8, 8, '#767e8b');
      Px.rect(ctx, 1, 1, 2, 2, '#95a0b0');
    });

    this.floors.japan = mk((ctx: any) => {
      // Texture de Tatami
      Px.rect(ctx, 0, 0, ART, ART, '#d9c791'); 
      // Bordures vertes des tatamis
      Px.rect(ctx, 0, 0, ART, 2, '#455934');
      Px.rect(ctx, 0, ART - 2, ART, 2, '#455934');
      Px.rect(ctx, 0, 0, 1, ART, '#314222');
      Px.rect(ctx, ART - 1, 0, 1, ART, '#314222');
      // Détails paille
      for (let y = 3; y < ART - 3; y += 3) Px.rect(ctx, 2, y, ART - 4, 1, '#c5b481');
    });

    this.floors.manager = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#4a3222');
      for (let y = 0; y < ART; y += 4) Px.rect(ctx, 0, y, ART, 1, '#3a2719');
      Px.rect(ctx, 0, ART - 1, ART, 1, '#5c4128');
    });

    this.floors.server = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#282c31');
      for (let y = 0; y < ART; y += 4) Px.rect(ctx, 0, y, ART, 1, '#33383f');
      for (let x = 0; x < ART; x += 4) Px.rect(ctx, x, 0, 1, ART, '#33383f');
      Px.rect(ctx, 3, 3, 1, 1, '#4a5058'); Px.rect(ctx, 11, 11, 1, 1, '#4a5058');
    });

    this.floors.gaming = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#0f0f16'); 
      Px.rect(ctx, 0, ART - 1, ART, 1, '#3b1b4d'); // horizontal neon line
      Px.rect(ctx, ART - 1, 0, 1, ART, '#1b3b4d'); // vertical neon line
      Px.rect(ctx, 4, 4, 1, 1, '#ff0055');
      Px.rect(ctx, 12, 12, 1, 1, '#00ffcc');
    });

    this.floors.cinema = mk((ctx: any) => {
      Px.rect(ctx, 0, 0, ART, ART, '#111111');
      for (let y = 0; y < ART; y += 8) Px.rect(ctx, 0, y, ART, 1, '#1a1a1a');
    });
  }

  _buildWall() {
    const { c, ctx } = Px.canvas(ART, ART);
    Px.rect(ctx, 0, 0, ART, ART, '#cfd3da');
    Px.rect(ctx, 0, 0, ART, 2, '#e4e7ec');
    Px.rect(ctx, 0, ART - 4, ART, 4, '#8a8f99');
    Px.rect(ctx, 0, ART - 4, ART, 1, '#6f757f');
    for (let x = 0; x < ART; x += 8) Px.rect(ctx, x, 2, 1, ART - 6, '#bcc1c9');
    Px.addVolume(ctx, ART, ART, 0.10, 0.14);
    this.wall = c;
  }

  _buildRug() {
    const w = 7 * ART, h = 4 * ART;
    const { c, ctx } = Px.canvas(w, h);
    Px.rect(ctx, 0, 0, w, h, '#7a2020');
    Px.rect(ctx, 4, 4, w - 8, h - 8, '#8f2b2b');
    Px.rect(ctx, 8, 8, w - 16, h - 16, '#a33');
    ctx.strokeStyle = '#d9b45a';
    ctx.lineWidth = 2;
    ctx.strokeRect(10, 10, w - 20, h - 20);
    Px.circle(ctx, w / 2, h / 2, Math.min(w, h) / 5, '#d9b45a');
    Px.circle(ctx, w / 2, h / 2, Math.min(w, h) / 5 - 4, '#8f2b2b');
    this.rug = c;
  }

  _buildFurniture() {
    const add = (key: string, wt: number, ht: number, drawFn: any) => {
      const { c, ctx } = Px.canvas(wt * ART, ht * ART);
      drawFn(ctx, wt * ART, ht * ART);
      Px.addVolume(ctx, wt * ART, ht * ART);   // lumière douce en haut / ombre douce en bas -> impression de relief
      Px.outline(c);                            // détoure le mobilier pour qu'il se détache nettement du sol
      this.furniture[key] = { canvas: c, wTiles: wt, hTiles: ht };
    };

    add('counter6x2', 6, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 0, 0, w, h, '#8a5a3b');
      Px.rect(ctx, 0, 0, w, 6, '#a97448');
      Px.rect(ctx, 0, h - 8, w, 8, '#2f9e93');
      Px.rect(ctx, 0, h - 8, w, 2, '#3fc0b3');
    });

    add('desk2x2', 2, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#a97845');
      Px.rect(ctx, 2, 2, w - 4, 4, '#c08f5c');
      Px.rect(ctx, 6, 6, w - 20, 12, '#232833');       
      Px.rect(ctx, 7, 7, w - 22, 9, '#3aa0ff');          
      Px.rect(ctx, 8, h - 14, w - 16, 6, '#e8ecf2');    
      Px.circle(ctx, w / 2, h - 4, 6, '#3a4250');        
      Px.circle(ctx, w / 2, h - 4, 4, '#4d5666');
    });

    add('deskboss3x2', 3, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#6b4326');
      Px.rect(ctx, 2, 2, w - 4, 4, '#8a5934');
      ctx.strokeStyle = '#d9b45a'; ctx.lineWidth = 1;
      ctx.strokeRect(6, 6, w - 12, h - 12);
      Px.rect(ctx, 10, 8, w - 30, 12, '#232833');
      Px.rect(ctx, 11, 9, w - 32, 9, '#3aa0ff');
      Px.circle(ctx, w / 2, h - 2, 8, '#5c1f24');
      Px.circle(ctx, w / 2, h - 2, 5, '#7a2a30');
    });

    add('mixingdesk3x2', 3, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#1c1c1e');
      Px.rect(ctx, 2, 2, w - 4, 6, '#2d2d30');
      ctx.fillStyle = '#444';
      for(let x = 6; x < w-6; x+=4) {
        Px.rect(ctx, x, 10, 2, h-14, '#111');
        Px.rect(ctx, x-1, 10 + Math.random()*(h-18), 4, 3, '#d9d9d9');
      }
      Px.rect(ctx, 8, -4, 12, 8, '#000');
      Px.rect(ctx, 9, -3, 10, 6, '#2b82d9');
      Px.rect(ctx, w-20, -4, 12, 8, '#000');
      Px.rect(ctx, w-19, -3, 10, 6, '#4caf50');
      Px.circle(ctx, w / 2, h - 2, 6, '#222');
    });

    add('speaker1x1', 1, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, w*0.1, h*0.1, w*0.8, h*0.8, '#1a1a1c');
      Px.circle(ctx, w/2, h/2 - 3, w*0.25, '#333');
      Px.circle(ctx, w/2, h/2 + 4, w*0.15, '#222');
    });

    add('micstand1x1', 1, 1, (ctx: any, w: number, h: number) => {
      // Pied trépied (vu de dessus, silhouette simplifiée)
      Px.circle(ctx, w / 2, h * 0.78, 3, '#2a2a2a');
      Px.rect(ctx, w / 2 - 1, h * 0.5, 2, h * 0.34, '#4a4a4a'); // tige
      Px.circle(ctx, w / 2, h * 0.34, 3.5, '#161616'); // capsule micro
      Px.circle(ctx, w / 2 - 1, h * 0.32, 1, '#3a3a3a'); // reflet
    });

    add('piano3x1', 3, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#111');
      Px.rect(ctx, 4, h/2, w - 8, h/2 - 2, '#fff');
      for(let x=6; x<w-6; x+=3) {
        if (x % 9 !== 0) Px.rect(ctx, x, h/2, 2, h/2 - 4, '#000');
      }
    });

    add('drumkit2x2', 2, 2, (ctx: any, w: number, h: number) => {
      Px.circle(ctx, w/2, h*0.6, 12, '#b03030');
      Px.circle(ctx, w/2, h*0.6, 9, '#e0e0e0');
      Px.circle(ctx, w*0.25, h*0.4, 6, '#ddd');
      Px.circle(ctx, w*0.75, h*0.4, 6, '#ddd');
      Px.circle(ctx, w*0.15, h*0.2, 7, '#d4af37');
      Px.circle(ctx, w*0.85, h*0.2, 7, '#d4af37');
      Px.circle(ctx, w/2, h*0.85, 5, '#333');
    });

    add('shoji4x1', 4, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 0, 0, w, h, '#5c3a21');
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#f0ebd8');
      for(let x=2; x<w; x+=6) Px.rect(ctx, x, 2, 1, h-4, '#5c3a21');
      for(let y=2; y<h; y+=6) Px.rect(ctx, 2, y, w-4, 1, '#5c3a21');
    });

    add('kotatsu2x2', 2, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#3b5998');
      Px.rect(ctx, 4, 4, w - 8, h - 8, '#4b69a8');
      Px.rect(ctx, 6, 6, w - 12, h - 12, '#a97845');
      Px.rect(ctx, 6, 6, w - 12, 2, '#c08f5c');
      Px.circle(ctx, w/2, h/2 - 2, 3, '#fff');
      Px.circle(ctx, w/2, h/2 - 2, 2, '#5c8a47');
    });

    add('bonsai1x1', 1, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, w*0.3, h*0.7, w*0.4, h*0.2, '#2f2f2f');
      Px.rect(ctx, w*0.25, h*0.65, w*0.5, h*0.1, '#3a3a3a');
      Px.rect(ctx, w*0.45, h*0.4, w*0.1, h*0.3, '#4a3018');
      Px.circle(ctx, w*0.5, h*0.3, 7, '#2f6636');
      Px.circle(ctx, w*0.3, h*0.4, 5, '#3b7d43');
      Px.circle(ctx, w*0.7, h*0.35, 6, '#234f29');
    });

    add('lantern1x1', 1, 1, (ctx: any, w: number, h: number) => {
      // Pied en bois
      Px.rect(ctx, w/2 - 1, h*0.72, 2, h*0.22, '#3a2a1e');
      Px.circle(ctx, w/2, h*0.7, 3, '#4a3527');
      // Corps de la lanterne en papier
      Px.circle(ctx, w/2, h*0.42, w*0.3, '#c0392b');
      Px.circle(ctx, w/2, h*0.42, w*0.22, '#e8703a');
      Px.circle(ctx, w/2, h*0.4, w*0.12, '#ffb877');
      // Bandeaux de bambou
      Px.rect(ctx, w*0.2, h*0.34, w*0.6, 1, '#7a2015');
      Px.rect(ctx, w*0.2, h*0.5, w*0.6, 1, '#7a2015');
    });

    add('cinemascreen9x5', 9, 5, (ctx: any, w: number, h: number) => {
      // Grand écran noir
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#0a0a0a');
      // Bordure argentée/métallique
      ctx.strokeStyle = '#333';
      ctx.lineWidth = 2;
      ctx.strokeRect(3, 3, w - 6, h - 6);
      
      // Logo YouTube central
      const logoW = 60;
      const logoH = 40;
      const logoX = w/2 - logoW/2;
      const logoY = h/2 - logoH/2;
      ctx.fillStyle = '#ff0000';
      ctx.beginPath();
      if (ctx.roundRect) {
        ctx.roundRect(logoX, logoY, logoW, logoH, 10);
      } else {
        ctx.rect(logoX, logoY, logoW, logoH);
      }
      ctx.fill();

      // Triangle blanc
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.moveTo(logoX + 22, logoY + 10);
      ctx.lineTo(logoX + 42, logoY + 20);
      ctx.lineTo(logoX + 22, logoY + 30);
      ctx.closePath();
      ctx.fill();

      // Stand de l'écran en bas
      Px.rect(ctx, w/2 - 20, h - 4, 40, 4, '#1a1a1a');
    });

    add('futon1x2', 1, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#eef');
      Px.rect(ctx, 4, 4, w - 8, 4, '#ddd');
      Px.rect(ctx, 2, 12, w - 4, h - 14, '#b33939');
      Px.rect(ctx, 2, 10, w - 4, 2, '#eef');
    });

    add('zabuton1x1', 1, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, w*0.2, h*0.2, w*0.6, h*0.6, '#218c74');
      Px.rect(ctx, w*0.25, h*0.25, w*0.5, h*0.5, '#33d9b2');
    });

    add('bookshelf3x1', 3, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#4a3527');
      Px.rect(ctx, 4, h / 2 - 2, w - 8, 4, '#3c2a1e');
      const colors = ['#a35b5b', '#5b7aa3', '#5ba36a', '#a3925b', '#8a5ba3'];
      for (let i = 0; i < 12; i++) {
        const cw = 3 + Math.random() * 3;
        Px.rect(ctx, 6 + i * 3.5, 4, cw, h / 2 - 6, colors[Math.floor(Math.random() * colors.length)]);
      }
    });

    add('watercooler1x1', 1, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, w*0.2, h*0.5, w*0.6, h*0.5, '#eee');
      Px.circle(ctx, w/2, h*0.3, 6, '#2196f3');
      Px.rect(ctx, w*0.4, h*0.5, w*0.2, 2, '#555');
    });

    add('whiteboard8x3', 8, 3, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#e0e0e0'); 
      Px.rect(ctx, 0, 0, w, 2, '#aaa'); 
      Px.rect(ctx, 0, h-2, w, 2, '#aaa'); 
      Px.rect(ctx, 0, 0, 2, h, '#aaa'); 
      Px.rect(ctx, w-2, 0, 2, h, '#aaa'); 
      Px.rect(ctx, 10, h-4, 4, 2, '#333');
      Px.rect(ctx, 16, h-4, 4, 2, '#f00');
    });

    const drawWhiteboard = (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#e0e0e0'); 
      Px.rect(ctx, 0, 0, w, 2, '#aaa'); Px.rect(ctx, 0, h-2, w, 2, '#aaa'); 
      Px.rect(ctx, 0, 0, 2, h, '#aaa'); Px.rect(ctx, w-2, 0, 2, h, '#aaa');
      Px.rect(ctx, 10, h-4, 4, 2, '#333'); Px.rect(ctx, 16, h-4, 4, 2, '#f00');
    };
    add('whiteboard3x1', 3, 1, drawWhiteboard);
    add('whiteboard4x1', 4, 1, drawWhiteboard);

    const drawImageBoard = (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 0, 0, w, h, '#8b5a2b'); 
      Px.rect(ctx, 4, 4, w - 8, h - 8, '#fdfdfd'); 
    };
    add('imageboard2x2', 2, 2, drawImageBoard);
    add('imageboard4x2', 4, 2, drawImageBoard);


    add('plant1x1', 1, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, w * 0.3, h - 6, w * 0.4, 5, '#7a4a2e');
      Px.circle(ctx, w / 2, h * 0.45, w * 0.42, '#2f8f4e');
      Px.circle(ctx, w * 0.38, h * 0.32, w * 0.28, '#3fae63');
    });

    add('gamingdesk2x2', 2, 2, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#1c1c24');
      Px.rect(ctx, 2, 2, w - 4, 4, '#252533');
      Px.rect(ctx, 4, h - 10, 14, 6, '#111');
      const colors = ['#f00', '#f80', '#ff0', '#0f0', '#00f', '#80f'];
      for(let i=0; i<6; i++) Px.rect(ctx, 6 + i*2, h - 8, 2, 2, colors[i]);
      Px.rect(ctx, 20, h - 8, 2, 3, '#fff');
      Px.rect(ctx, 2, 4, 12, 6, '#000'); 
      Px.rect(ctx, 3, 5, 10, 4, '#0f8'); 
      Px.rect(ctx, 15, 4, 12, 6, '#000'); 
      Px.rect(ctx, 16, 5, 10, 4, '#f08'); 
      Px.rect(ctx, w - 4, 4, 4, 10, '#222');
      Px.rect(ctx, w - 3, 5, 2, 8, '#0ff'); 
      Px.circle(ctx, w / 2 - 2, h - 2, 6, '#222');
      Px.circle(ctx, w / 2 - 2, h - 2, 4, '#f00'); 
    });

    add('arcade2x1', 2, 1, (ctx: any, _w: number, h: number) => {
      Px.rect(ctx, 2, 0, 12, h-2, '#222');
      Px.rect(ctx, 4, 0, 8, 4, '#f00'); 
      Px.rect(ctx, 4, 4, 8, 4, '#0ff'); 
      Px.rect(ctx, 4, 8, 8, 2, '#fff'); 
      Px.rect(ctx, 18, 0, 12, h-2, '#222');
      Px.rect(ctx, 20, 0, 8, 4, '#ff0'); 
      Px.rect(ctx, 20, 4, 8, 4, '#f0f'); 
      Px.rect(ctx, 20, 8, 8, 2, '#fff'); 
    });

    add('couch2x1', 2, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#222');
      Px.rect(ctx, 2, 8, w - 4, h - 8, '#333');
      Px.rect(ctx, 2, 2, 4, h - 4, '#444');
      Px.rect(ctx, w - 6, 2, 4, h - 4, '#444');
      Px.rect(ctx, 7, 2, 6, 6, '#111');
      Px.rect(ctx, 14, 2, 4, 6, '#111');
      Px.rect(ctx, 19, 2, 6, 6, '#111');
    });

    add('tv2x1', 2, 1, (ctx: any, w: number, _h: number) => {
      Px.rect(ctx, 2, 6, w - 4, 4, '#222'); 
      Px.rect(ctx, 4, 4, w - 8, 2, '#111'); 
      Px.rect(ctx, 2, 0, w - 4, 4, '#000'); 
      Px.rect(ctx, 3, 1, w - 6, 2, '#48f'); 
      Px.rect(ctx, w/2 - 4, 6, 8, 2, '#fff'); 
    });

    add('chair1x1', 1, 1, (ctx: any, w: number, h: number) => {
      Px.circle(ctx, w / 2, h / 2, w / 2 - 2, '#8a5a3b');
      Px.circle(ctx, w / 2, h / 2, w / 2 - 5, '#a5714f');
    });

    add('rack1x5', 1, 5, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 0, 0, w, h, '#23262c');
      for (let y = 4; y < h; y += 10) Px.rect(ctx, 2, y, w - 4, 1, '#1a1c20');
      Px.rect(ctx, 0, 0, w, 2, '#34383f');
    });
  }

  generatePlayerSprites(skinOptions?: { shirt: string, pants: string }) {
    const SKIN = '#e0a878', HAIR = '#3a2a1e';
    const SHIRT = skinOptions?.shirt || '#3aa0ff';
    const PANTS = skinOptions?.pants || '#25324a';
    
    const darken = (hex: string) => {
      if (!hex.startsWith('#')) return hex;
      let r = parseInt(hex.slice(1,3), 16) * 0.8;
      let g = parseInt(hex.slice(3,5), 16) * 0.8;
      let b = parseInt(hex.slice(5,7), 16) * 0.8;
      return '#' + Math.floor(r).toString(16).padStart(2,'0') + Math.floor(g).toString(16).padStart(2,'0') + Math.floor(b).toString(16).padStart(2,'0');
    };
    const SHIRT_D = darken(SHIRT);
    const W = 16, H = 24;

    const base = (ctx: any, dir: string, stride: number) => {
      // Arms logic
      const leftArmY = 12 + (dir !== 'left' && dir !== 'right' ? Math.max(0, stride) : 0);
      const rightArmY = 12 + (dir !== 'left' && dir !== 'right' ? Math.max(0, -stride) : 0);

      if (dir === 'down' || dir === 'up') {
        // Head base
        Px.circle(ctx, 8, 6, 5, dir === 'up' ? HAIR : SKIN);
        Px.rect(ctx, 5, 3, 3, 2, 'rgba(255,255,255,0.15)'); // Highlight head

        // Hair
        if (dir === 'up') {
          Px.rect(ctx, 4, 2, 8, 5, HAIR);
          Px.rect(ctx, 5, 1, 6, 1, HAIR); // Round top
        } else { 
          Px.rect(ctx, 4, 1, 8, 4, HAIR); 
          Px.rect(ctx, 3, 3, 1, 2, HAIR); // Sideburns
          Px.rect(ctx, 12, 3, 1, 2, HAIR); 
          // Eyes
          Px.rect(ctx, 5, 6, 2, 1, '#1c1c1c'); 
          Px.rect(ctx, 9, 6, 2, 1, '#1c1c1c'); 
          // Mouth
          Px.rect(ctx, 7, 8, 2, 1, '#8a5a3b');
        }
        
        // Torso
        Px.rect(ctx, 4, 11, 8, 7, SHIRT);
        Px.rect(ctx, 4, 11, 8, 2, SHIRT_D);

        // Arms (swinging)
        Px.rect(ctx, 1, leftArmY, 3, 4, SHIRT_D); // Left arm
        Px.rect(ctx, 2, leftArmY + 4, 2, 2, SKIN); // Left hand
        
        Px.rect(ctx, 12, rightArmY, 3, 4, SHIRT_D); // Right arm
        Px.rect(ctx, 12, rightArmY + 4, 2, 2, SKIN); // Right hand
        
        if (dir === 'down') Px.rect(ctx, 5, 13, 4, 3, 'rgba(255,255,255,0.15)'); // Highlight chest
      } else {
        // Head
        Px.circle(ctx, 8, 6, 5, SKIN);
        
        // Hair for side views
        if (dir === 'left') {
           Px.rect(ctx, 5, 2, 8, 4, HAIR); // Top
           Px.rect(ctx, 9, 4, 4, 5, HAIR); // Back (right side)
           Px.rect(ctx, 6, 1, 6, 2, HAIR); // Top round
        } else {
           Px.rect(ctx, 3, 2, 8, 4, HAIR); // Top
           Px.rect(ctx, 3, 4, 4, 5, HAIR); // Back (left side)
           Px.rect(ctx, 4, 1, 6, 2, HAIR); // Top round
        }
        
        Px.rect(ctx, dir === 'left' ? 4 : 9, 3, 3, 2, 'rgba(255,255,255,0.15)'); // Highlight head

        // Eye
        Px.rect(ctx, dir === 'left' ? 4 : 10, 6, 2, 1, '#1c1c1c');
        
        // Torso
        Px.rect(ctx, 5, 11, 6, 7, SHIRT);
        Px.rect(ctx, 5, 11, 6, 2, SHIRT_D);
        
        // Arm (only one visible, swinging)
        const armY = 12 + Math.abs(stride);
        Px.rect(ctx, dir === 'left' ? 7 : 5, armY, 4, 4, SHIRT_D);
        Px.rect(ctx, dir === 'left' ? 8 : 6, armY + 4, 2, 2, SKIN); // Hand
        
        Px.rect(ctx, dir === 'left' ? 5 : 9, 13, 2, 4, 'rgba(255,255,255,0.15)'); // Highlight chest side
      }
    };

    const sprites: any = { down: [], up: [], left: [], right: [] };

    ['down', 'up', 'left', 'right'].forEach(dir => {
      for (let f = 0; f < 4; f++) {
        const { c, ctx } = Px.canvas(W, H);
        const stride = [0, 2, 0, -2][f];
        base(ctx, dir, stride);
        
        const leftLegY = 18 - Math.max(0, stride);
        const rightLegY = 18 - Math.max(0, -stride);

        if (dir === 'left' || dir === 'right') {
          // One leg in front of the other
          Px.rect(ctx, 6, leftLegY, 4, 5, PANTS); // Back leg
          Px.rect(ctx, 6, rightLegY, 4, 5, PANTS); // Front leg
          Px.rect(ctx, 6, leftLegY + 5, 4, 1, '#111');
          Px.rect(ctx, 6, rightLegY + 5, 4, 1, '#111');
        } else {
          // Normal pants
          Px.rect(ctx, 4, leftLegY, 3, 5, PANTS);
          Px.rect(ctx, 9, rightLegY, 3, 5, PANTS);
          // Highlight
          Px.rect(ctx, 5, leftLegY + 1, 1, 3, 'rgba(255,255,255,0.1)');
          Px.rect(ctx, 10, rightLegY + 1, 1, 3, 'rgba(255,255,255,0.1)');
          // Shoes
          Px.rect(ctx, 4, leftLegY + 5, 3, 1, '#111');
          Px.rect(ctx, 9, rightLegY + 5, 3, 1, '#111');
        }
        
        sprites[dir].push(c);
      }
    });

    // Generate sit sprite
    const { c: sitC, ctx: sitCtx } = Px.canvas(W, H);
    base(sitCtx, 'down', 0); // draw upper body facing down
    // Sitting legs (thighs straight, shoes forward)
    Px.rect(sitCtx, 4, 18, 3, 2, PANTS);
    Px.rect(sitCtx, 9, 18, 3, 2, PANTS);
    Px.rect(sitCtx, 4, 20, 3, 2, '#111'); // Shoes
    Px.rect(sitCtx, 9, 20, 3, 2, '#111'); // Shoes
    sprites['sit'] = [sitC];

    return sprites;
  }
}

/* ============================== INPUT ===================================== */
class InputManager {
  keys: any = {};
  keydown: any;
  keyup: any;
  pointer: { x: number, y: number, active: boolean } = { x: 0, y: 0, active: false };

  constructor() {
    this.keydown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      this.keys[e.key.toLowerCase()] = true;
    };
    this.keyup = (e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);

    const setPointer = (e: any) => {
      let clientX, clientY;
      if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }
      const rect = e.target.getBoundingClientRect();
      const scaleX = e.target.width / (window.devicePixelRatio || 1) / rect.width;
      const scaleY = e.target.height / (window.devicePixelRatio || 1) / rect.height;
      this.pointer.x = (clientX - rect.left) * scaleX;
      this.pointer.y = (clientY - rect.top) * scaleY;
      this.pointer.active = true;
    };

    window.addEventListener('mousedown', (e) => { 
      if ((e.target as HTMLElement).tagName === 'CANVAS') setPointer(e); 
    });
    window.addEventListener('mousemove', (e) => { 
      if (e.buttons > 0 && (e.target as HTMLElement).tagName === 'CANVAS') setPointer(e); 
      else this.pointer.active = false; 
    });
    window.addEventListener('mouseup', () => { this.pointer.active = false; });
    
    window.addEventListener('touchstart', (e) => { 
      if ((e.target as HTMLElement).tagName === 'CANVAS') setPointer(e); 
    }, { passive: false });
    window.addEventListener('touchmove', (e) => { 
      if ((e.target as HTMLElement).tagName === 'CANVAS') setPointer(e); 
    }, { passive: false });
    window.addEventListener('touchend', () => { this.pointer.active = false; });
  }

  destroy() {
    window.removeEventListener('keydown', this.keydown);
    window.removeEventListener('keyup', this.keyup);
  }

  isDown(...names: string[]) { return names.some(n => this.keys[n]); }
  get up()    { return this.isDown('arrowup', 'z', 'w'); }
  get down()  { return this.isDown('arrowdown', 's'); }
  get left()  { return this.isDown('arrowleft', 'q', 'a'); }
  get right() { return this.isDown('arrowright', 'd'); }
}

/* ============================== WORLD MAP ================================= */
class WorldMap {
  grid: number[][];
  furniture: any[];
  zones: any[];
  whiteboardLines: any[] = [];
  imageBoards: Record<string, string> = {};
  imageBoardsCache: Record<string, { img: HTMLImageElement, src: string }> = {};

  constructor() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.furniture = [];
    this.zones = [
      // REMPLACEZ LES 'discord_channel_id' PAR LES VRAIS IDS DE VOS SALONS VOCAUX DISCORD (clic droit -> copier l'ID du salon)
      { name: 'Open Space',        floorKey: 'openspace',  icon: '💻', voiceChannelId: '1459937261981536433', textChannelId: null, x1: 1,  y1: 1,  x2: 13, y2: 10, accent: '127,179,213' },
      { name: 'Accueil',           floorKey: 'reception', icon: '🛎️', voiceChannelId: null, textChannelId: '1459971801894621256', x1: 14, y1: 1,  x2: 26, y2: 10, accent: '201,168,118' },
      { name: 'Studio de Musique', floorKey: 'studio',     icon: '🎧', voiceChannelId: '1459960696111370433', textChannelId: null, x1: 27, y1: 1,  x2: 39, y2: 10, accent: '220,100,150' },
      { name: 'Couloir',           floorKey: 'corridor',   icon: '🚶', voiceChannelId: 'salon_id_couloir', textChannelId: null, x1: 1,  y1: 11, x2: 39, y2: 15, accent: '150,156,168' },
      { name: 'Voyage (Japon)',    floorKey: 'japan',      icon: '🌸', voiceChannelId: 'salon_id_japon', textChannelId: null, x1: 1,  y1: 16, x2: 13, y2: 23, accent: '240,150,160' },
      { name: 'Bureau du Manager', floorKey: 'manager',    icon: '👔', voiceChannelId: 'salon_id_manager', textChannelId: null, x1: 14, y1: 16, x2: 26, y2: 23, accent: '127,217,160' },
      { name: 'Salle Gaming',      floorKey: 'gaming',     icon: '🎮', voiceChannelId: 'salon_id_serveurs', textChannelId: null, x1: 27, y1: 16, x2: 39, y2: 23, accent: '180,50,250' },
      { name: 'Salle Cinéma',      floorKey: 'cinema',     icon: '🍿', voiceChannelId: 'salon_id_cinema', textChannelId: null, x1: 40, y1: 1, x2: 53, y2: 23, accent: '255,50,50' },
    ];
    this._buildWalls();
    this._generateDefaultFurniture();
  }

  syncCustomFurniture(furnitureList: any[]) {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this._buildWalls();
    this.furniture = [];
      furnitureList.forEach(f => {
        let type = f.type;
        let c2 = f.c2;
        if (type === 'whiteboard3x1' || type === 'whiteboard4x1' || type === 'whiteboard8x2') {
          type = 'whiteboard8x3';
          c2 = f.c1 + 7;
          f.r2 = f.r1 + 2;
        }
          this._addFurniture(type, f.r1, f.c1, f.r2, c2, f.dir);
        });
  }

  getTileFromPx(px: number, py: number) {
    const c = Math.floor(px / TILE);
    const r = Math.floor(py / TILE);
    return { r, c };
  }

  _setWall(r: number, c: number) { this.grid[r][c] = 1; }
  _setSolid(r1: number, c1: number, r2: number, c2: number) {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.grid[r][c] = 2;
  }
  _hWall(row: number, doorCenters: number[]) {
    for (let c = 1; c <= 39; c++) this._setWall(row, c);
    doorCenters.forEach(cc => { this.grid[row][cc - 1] = 0; this.grid[row][cc] = 0; });
  }
  _vWallSeg(col: number, rStart: number, rEnd: number, gapStart: number, gapEnd: number) {
    for (let r = rStart; r <= rEnd; r++) { if (r >= gapStart && r <= gapEnd) continue; this._setWall(r, col); }
  }

  _addFurniture(type: string, r1: number, c1: number, r2: number, c2: number, dir?: number) {
    this._setSolid(r1, c1, r2, c2);
    this.furniture.push({ id: Math.random().toString(36).substring(2, 9), type, r1, c1, r2, c2, dir });
  }

  _buildWalls() {
    for (let c = 0; c < COLS; c++) { this._setWall(0, c); this._setWall(ROWS - 1, c); }
    for (let r = 0; r < ROWS; r++) { this._setWall(r, 0); this._setWall(r, COLS - 1); }
    this._hWall(10, [7, 20, 33]);
    this._hWall(15, [7, 20, 33]);
    this._vWallSeg(13, 1, 9, 4, 5);
    this._vWallSeg(26, 1, 9, 4, 5);
    this._vWallSeg(13, 16, 22, 18, 19);
    this._vWallSeg(26, 16, 22, 18, 19);
    this._vWallSeg(39, 1, 22, 11, 15);
  }

  _generateDefaultFurniture() {
    // Nouvelle salle de gauche : Open Space
    this._addFurniture('whiteboard8x3', 1, 5, 3, 12);
    this._addFurniture('plant1x1', 1, 1, 1, 1);
    this._addFurniture('plant1x1', 1, 12, 1, 12);
    this._addFurniture('watercooler1x1', 8, 12, 8, 12);
    this._addFurniture('desk2x2', 2, 2, 3, 3);
    this._addFurniture('desk2x2', 2, 9, 3, 10);
    this._addFurniture('desk2x2', 7, 2, 8, 3);
    this._addFurniture('desk2x2', 7, 9, 8, 10);

    // Nouvelle salle de droite : Accueil
    this._addFurniture('counter6x2', 2, 17, 3, 22);
    this._addFurniture('chair1x1', 1, 18, 1, 18);
    this._addFurniture('chair1x1', 1, 21, 1, 21);
    this._addFurniture('plant1x1', 2, 15, 2, 15);
    this._addFurniture('plant1x1', 2, 24, 2, 24);
    this._addFurniture('chair1x1', 8, 15, 8, 15);
    this._addFurniture('chair1x1', 8, 16, 8, 16);
    this._addFurniture('chair1x1', 8, 23, 8, 23);
    this._addFurniture('chair1x1', 8, 24, 8, 24);
    // ---- Studio de Musique : scène sur le tapis, régie centrale, salon symétrique

    // Scène (Le tapis est rendu centré en 29.5)
    this._addFurniture('tv2x1', 1, 32, 1, 33);       // écran de monitoring centré
    this._addFurniture('speaker1x1', 2, 28, 2, 28);  // enceinte façade gauche
    this._addFurniture('piano3x1', 2, 29, 2, 31);    // piano (gauche)
    this._addFurniture('drumkit2x2', 2, 32, 3, 33);  // batterie (centrée)
    this._addFurniture('micstand1x1', 3, 34, 3, 34); // pied de micro (droite)
    
    // Mur d'amplis (pour balancer visuellement le piano)
    this._addFurniture('speaker1x1', 2, 35, 2, 35);
    this._addFurniture('speaker1x1', 3, 35, 3, 35);
    this._addFurniture('speaker1x1', 2, 36, 2, 36);
    this._addFurniture('speaker1x1', 3, 36, 3, 36);

    this._addFurniture('speaker1x1', 2, 37, 2, 37);  // enceinte façade droite
    this._addFurniture('chair1x1', 3, 30, 3, 30);    // tabouret du piano

    // Régie / mixage, parfaitement centrée face à la scène
    this._addFurniture('mixingdesk3x2', 6, 32, 7, 34);

    // Salon d'écoute (symétrique sur la ligne du bas)
    this._addFurniture('couch2x1', 9, 28, 9, 29);    // canapé gauche (à côté de la fontaine)
    this._addFurniture('couch2x1', 9, 36, 9, 37);    // canapé droit (à côté du bonsaï)
    
    // Décorations dans les 4 coins
    this._addFurniture('plant1x1', 1, 27, 1, 27);    // haut gauche
    this._addFurniture('plant1x1', 1, 38, 1, 38);    // haut droite
    this._addFurniture('watercooler1x1', 9, 27, 9, 27); // bas gauche
    this._addFurniture('bonsai1x1', 9, 38, 9, 38);   // bas droite

    // ---- Voyage (Japon) : genkan à l'entrée, allée centrale balisée par des
    //      lanternes, coin thé (kotatsu) à gauche, coin nuit (futons) à droite.
    //      La colonne 12 (lignes 17-20) reste libre : c'est le passage vers
    //      la porte du Bureau du Manager (mur droit, colonne 13, lignes 18-19).

    // Genkan (entrée), écrans coulissants en vis-à-vis du couloir
    this._addFurniture('shoji4x1', 16, 2, 16, 5);
    this._addFurniture('shoji4x1', 16, 8, 16, 11);
    this._addFurniture('bonsai1x1', 16, 1, 16, 1);
    this._addFurniture('bonsai1x1', 16, 12, 16, 12);

    // Allée, balisée par deux lanternes en vis-à-vis de l'entrée
    this._addFurniture('lantern1x1', 17, 5, 17, 5);
    this._addFurniture('lantern1x1', 17, 8, 17, 8);

    // Coin thé — kotatsu entouré de coussins sur ses quatre côtés
    this._addFurniture('lantern1x1', 18, 3, 18, 3);
    this._addFurniture('kotatsu2x2', 20, 3, 21, 4);
    this._addFurniture('zabuton1x1', 19, 3, 19, 3);
    this._addFurniture('zabuton1x1', 19, 4, 19, 4);
    this._addFurniture('zabuton1x1', 20, 2, 20, 2);
    this._addFurniture('zabuton1x1', 21, 5, 21, 5);
    this._addFurniture('zabuton1x1', 22, 3, 22, 3);
    this._addFurniture('zabuton1x1', 22, 4, 22, 4);

    // Coin nuit — futons avec lanterne et bonsaï de chevet
    this._addFurniture('lantern1x1', 18, 10, 18, 10);
    this._addFurniture('bonsai1x1', 18, 11, 18, 11);
    this._addFurniture('futon1x2', 21, 9, 22, 9);
    this._addFurniture('futon1x2', 21, 11, 22, 11);
    this._addFurniture('deskboss3x2', 18, 19, 19, 21); // Bureau centré face à la porte
    this._addFurniture('chair1x1', 17, 19, 17, 19); // Chaise invité gauche
    this._addFurniture('chair1x1', 17, 21, 17, 21); // Chaise invité droite
    this._addFurniture('bookshelf3x1', 22, 15, 22, 17); // Bibliothèque gauche
    this._addFurniture('bookshelf3x1', 22, 19, 22, 21); // Bibliothèque centrale
    this._addFurniture('bookshelf3x1', 22, 23, 22, 25); // Bibliothèque droite
    this._addFurniture('plant1x1', 16, 14, 16, 14); // Plante coin haut gauche
    this._addFurniture('plant1x1', 16, 25, 16, 25); // Plante coin haut droite
    
    // Salle Gaming (Ancienne salle Serveurs)
    this._addFurniture('arcade2x1', 16, 27, 16, 28);
    this._addFurniture('arcade2x1', 16, 29, 16, 30);
    this._addFurniture('tv2x1', 16, 36, 16, 37);
    this._addFurniture('couch2x1', 18, 36, 18, 37);
    this._addFurniture('gamingdesk2x2', 20, 30, 21, 31);
    this._addFurniture('gamingdesk2x2', 20, 34, 21, 35);
    this._addFurniture('watercooler1x1', 22, 38, 22, 38);
    
    // Salle Cinéma (Prend toute la hauteur à droite)
    // Grand écran au mur du haut (Ratio 16:9 = 9 tiles de large, 5 tiles de haut)
    this._addFurniture('cinemascreen9x5', 3, 42, 7, 50);
    // Rangées de sièges resserrées vers l'écran
    this._addFurniture('couch2x1', 9, 43, 9, 44);
    this._addFurniture('couch2x1', 9, 46, 9, 47);
    this._addFurniture('couch2x1', 9, 49, 9, 50);

    this._addFurniture('couch2x1', 13, 43, 13, 44);
    this._addFurniture('couch2x1', 13, 46, 13, 47);
    this._addFurniture('couch2x1', 13, 49, 13, 50);
    
    this._addFurniture('couch2x1', 17, 43, 17, 44);
    this._addFurniture('couch2x1', 17, 46, 17, 47);
    this._addFurniture('couch2x1', 17, 49, 17, 50);
    
    this._addFurniture('couch2x1', 21, 43, 21, 44);
    this._addFurniture('couch2x1', 21, 46, 21, 47);
    this._addFurniture('couch2x1', 21, 49, 21, 50);
    
    // Décorations à l'arrière et sur les côtés
    this._addFurniture('plant1x1', 1, 41, 1, 41);
    this._addFurniture('plant1x1', 1, 52, 1, 52);
    
    // Décoration au fond de la salle (y = 20 à 22)
    // Alignement des passages avec les sièges (passages aux colonnes 45 et 48)
    this._addFurniture('arcade2x1', 20, 43, 20, 44);
    this._addFurniture('watercooler1x1', 20, 49, 20, 49);
    this._addFurniture('bonsai1x1', 20, 50, 20, 50);
    this._addFurniture('plant1x1', 22, 41, 22, 41);
    this._addFurniture('plant1x1', 22, 52, 22, 52);
  }

  isSolid(px: number, py: number) {
    const tc = Math.floor(px / TILE), tr = Math.floor(py / TILE);
    if (tr < 0 || tr >= ROWS || tc < 0 || tc >= COLS) return true;
    return this.grid[tr][tc] === 1 || this.grid[tr][tc] === 2;
  }

  zoneAt(px: number, py: number) {
    const tc = Math.floor(px / TILE), tr = Math.floor(py / TILE);
    return this.zones.find(z => tr >= z.y1 && tr <= z.y2 && tc >= z.x1 && tc <= z.x2) || null;
  }

  render(ctx: CanvasRenderingContext2D, cam: any, assets: any, time: number) {
    const startCol = Math.max(0, Math.floor(cam.x / TILE));
    const endCol   = Math.min(COLS - 1, Math.ceil((cam.x + cam.viewW) / TILE));
    const startRow = Math.max(0, Math.floor(cam.y / TILE));
    const endRow   = Math.min(ROWS - 1, Math.ceil((cam.y + cam.viewH) / TILE));

    for (let r = startRow; r <= endRow; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const x = c * TILE - cam.x, y = r * TILE - cam.y;
        if (this.grid[r][c] === 1) {
          ctx.drawImage(assets.wall, x, y, TILE, TILE);
        } else {
          const z = this.zoneAt(c * TILE + 1, r * TILE + 1);
          const tex = assets.floors[z ? z.floorKey : 'corridor'];
          ctx.drawImage(tex, x, y, TILE, TILE);
        }
      }
    }

    const rugX = Math.round(29.5 * TILE) - cam.x, rugY = 2 * TILE - cam.y;
    if (rugX + assets.rug.width * SCALE > 0 && rugX < cam.viewW && rugY + assets.rug.height * SCALE > 0 && rugY < cam.viewH) {
      ctx.drawImage(assets.rug, 0, 0, assets.rug.width, assets.rug.height, rugX, rugY, assets.rug.width * SCALE, assets.rug.height * SCALE);
    }

    const viewRect = { x1: cam.x, y1: cam.y, x2: cam.x + cam.viewW, y2: cam.y + cam.viewH };
    this.furniture.forEach(f => {
      const x1 = f.c1 * TILE, y1 = f.r1 * TILE;
      const x2 = (f.c2 + 1) * TILE, y2 = (f.r2 + 1) * TILE;
      if (x2 < viewRect.x1 || x1 > viewRect.x2 || y2 < viewRect.y1 || y1 > viewRect.y2) return; 

      const sx = x1 - cam.x, sy = y1 - cam.y;
      const w = x2 - x1, h = y2 - y1;
      const sprite = assets.furniture[f.type]; if (!sprite) { console.error('MISSING SPRITE FOR FURNITURE:', f.type); return; }

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + h - 4, w / 2.1, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const originalW = (f.dir === 90 || f.dir === 270) ? h : w;
      const originalH = (f.dir === 90 || f.dir === 270) ? w : h;
      
      ctx.save();
      ctx.translate(sx + w / 2, sy + h / 2);
      if (f.dir) {
        ctx.rotate((f.dir * Math.PI) / 180);
      }
      
      const drawX = -originalW / 2;
      const drawY = -originalH / 2;

      ctx.drawImage(sprite.canvas, 0, 0, sprite.canvas.width, sprite.canvas.height, drawX, drawY, originalW, originalH);

      if (f.type.startsWith('imageboard') && this.imageBoards && this.imageBoards[f.id]) {
        const b64 = this.imageBoards[f.id];
        if (!this.imageBoardsCache[f.id] || this.imageBoardsCache[f.id].src !== b64) {
          const img = new Image();
          img.src = b64;
          this.imageBoardsCache[f.id] = { img, src: b64 };
        }
        const cached = this.imageBoardsCache[f.id];
        if (cached.img.complete && cached.img.naturalHeight !== 0) {
          ctx.drawImage(cached.img, drawX + 4, drawY + 4, originalW - 8, originalH - 8);
        }
      }

      if (f.type.startsWith('whiteboard') && this.whiteboardLines) {
        ctx.save();
        const scaleX = (originalW - 4) / 800;
        const scaleY = (originalH - 4) / 450;
        ctx.translate(drawX + 2, drawY + 2);
        ctx.scale(scaleX, scaleY);
        this.whiteboardLines.forEach(line => {
          ctx.beginPath();
          ctx.moveTo(line.startX, line.startY);
          ctx.lineTo(line.endX, line.endY);
          ctx.strokeStyle = line.color;
          ctx.lineWidth = line.width; 
          ctx.lineCap = 'round';
          ctx.stroke();
        });
        ctx.restore();
      }

      ctx.restore();

      if (['desk2x2', 'deskboss3x2', 'gamingdesk2x2', 'arcade2x1', 'tv2x1', 'mixingdesk3x2'].includes(f.type)) {
        const glow = 0.35 + Math.sin(time * 2 + f.c1) * 0.08;
        const gx = sx + w * 0.5, gy = sy + h * 0.5;
        const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, w * 0.8);
        const color = f.type === 'gamingdesk2x2' ? '200,50,255' : 
                      f.type === 'arcade2x1' ? '50,255,100' : 
                      f.type === 'tv2x1' ? '100,100,255' :
                      f.type === 'mixingdesk3x2' ? '230,120,170' : '120,190,255';
        grad.addColorStop(0, `rgba(${color},${glow})`);
        grad.addColorStop(1, `rgba(${color},0)`);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 10, sy - 10, w + 20, h + 20);
        ctx.restore();
      }

      if (f.type === 'lantern1x1') {
        // Scintillement chaleureux façon flamme (deux fréquences superposées, pas un pulse régulier)
        const flicker = 0.4 + Math.sin(time * 5 + f.c1 * 3) * 0.08 + Math.sin(time * 11 + f.r1 * 2) * 0.05;
        const gx = sx + w * 0.5, gy = sy + h * 0.42;
        const grad = ctx.createRadialGradient(gx, gy, 1, gx, gy, w * 1.6);
        grad.addColorStop(0, `rgba(255,170,90,${flicker})`);
        grad.addColorStop(0.5, `rgba(255,120,60,${flicker * 0.35})`);
        grad.addColorStop(1, 'rgba(255,120,60,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(sx - w, sy - h, w * 3, h * 3);
        ctx.restore();
      }

      if (f.type === 'rack1x5') {
        const n = Math.floor(h / (10 * SCALE));
        for (let i = 0; i < n; i++) {
          const blink = Math.sin(time * 3 + i * 1.7 + f.c1) > 0.2;
          ctx.fillStyle = blink ? '#4be37a' : '#1c4a2c';
          ctx.fillRect(sx + 4, sy + 8 + i * 10 * SCALE, 6, 5);
          ctx.fillStyle = (i % 3 === 0) ? '#e3564b' : '#332';
          ctx.fillRect(sx + w - 12, sy + 8 + i * 10 * SCALE, 6, 5);
          if (blink) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(80,255,140,0.35)';
            ctx.fillRect(sx + 2, sy + 6 + i * 10 * SCALE, 12, 9);
            ctx.restore();
          }
        }
      }
    });
  }
}

/* ================================ PLAYER =================================== */
class Player {
  hw: number; hh: number; x: number; y: number;
  vx: number; vy: number;
  spriteW: number; spriteH: number; speed: number;
  dir: string; moving: boolean; animTime: number; frame: number;
  currentZoneName: string | null;
  user: any; socket: any; avatarImg: HTMLImageElement | null; avatarDecoImg: HTMLImageElement | null = null;
  lastEmit: number;
  spotify: any | null;
  game: any | null;
  chatMessage: string | null = null;
  chatTimer: number = 0;
  skin: any = null;
  sprites: any = null;
  isSitting: boolean = false;
  jumpTime: number = 0;
  jumpMaxTime: number = 0;
  jumpStartX: number = 0;
  jumpStartY: number = 0;
  jumpEndX: number = 0;
  jumpEndY: number = 0;
  jumpAction: string | null = null;
  isDragged: boolean = false;
  isDraggingPending: boolean = false;
  wasPointerActive: boolean = false;
  isSleeping: boolean = false;
  hasWeapon: boolean = false;
  isAttacking: boolean = false;
  attackTime: number = 0;
  particles: any[] = [];
  dragStartX: number = 0;
  dragStartY: number = 0;
  dragOffsetX: number = 0;
  dragOffsetY: number = 0;
  dragPointerStartX: number = 0;
  dragPointerStartY: number = 0;

  constructor(x: number, y: number, user: any, socket: any) {
    this.hw = 28; this.hh = 18;
    this.x = x; this.y = y; 
    this.vx = 0; this.vy = 0;
    this.spriteW = 16 * SCALE; this.spriteH = 24 * SCALE;
    this.speed = 280;
    this.dir = 'down';
    this.moving = false;
    this.animTime = 0;
    this.frame = 0;
    this.currentZoneName = null;
    this.user = user;
    this.socket = socket;
    this.avatarImg = null;
    this.avatarDecoImg = null;
    this.lastEmit = 0;
    this.spotify = null;
    this.game = null;
    this.skin = user?.skin || null;

    console.log("Player User Object:", user);

    if (user && user.id !== 'spectator') {
      if (user.avatarUrl) {
        const img = new Image();
        img.src = user.avatarUrl;
        img.crossOrigin = "Anonymous";
        img.onload = () => { this.avatarImg = img; };
      }
      if (user.avatarDecorationUrl) {
        const decoImg = new Image();
        decoImg.src = user.avatarDecorationUrl;
        decoImg.crossOrigin = "Anonymous";
        decoImg.onload = () => { this.avatarDecoImg = decoImg; };
      }
    }
  }

  get centerX() { return this.x + this.hw / 2; }
  get centerY() { return this.y + this.hh / 2; }

  _collides(map: any, x: number, y: number) {
    if (this.user?.id === 'spectator') {
      const tc1 = Math.floor(x / 16), tr1 = Math.floor(y / 16);
      const tc2 = Math.floor((x + this.hw) / 16), tr2 = Math.floor((y + this.hh) / 16);
      return (tr1 < 0 || tr2 >= map.grid.length || tc1 < 0 || tc2 >= map.grid[0].length);
    }
    const pts = [[x, y], [x + this.hw, y], [x, y + this.hh], [x + this.hw, y + this.hh]];
    return pts.some(([px, py]) => map.isSolid(px, py));
  }

  update(dt: number, input: any, map: any, bus: any, _camera: any, isBuildMode: boolean = false) {
    if (this.jumpTime > 0) {
      this.jumpTime -= dt;
      const t = 1 - Math.max(0, this.jumpTime / this.jumpMaxTime);
      this.x = this.jumpStartX + (this.jumpEndX - this.jumpStartX) * t;
      this.y = this.jumpStartY + (this.jumpEndY - this.jumpStartY) * t;
      
      const now = performance.now();
      if (this.user && this.user.id !== 'spectator' && now - this.lastEmit > 50) {
        this.socket?.emit('player_move_xy', {
          userId: this.user.id, username: this.user.username, avatarUrl: this.user.avatarUrl, skin: this.skin,
          x: this.x, y: this.y, dir: this.dir, frame: 0, isSitting: this.isSitting
        });
        this.lastEmit = now;
      }
      
      if (this.jumpTime <= 0) {
        this.jumpTime = 0;
        if (this.jumpAction === 'sit' || this.jumpAction === 'sleep') {
          this.isSitting = true;
          this.isSleeping = this.jumpAction === 'sleep';
          this.jumpAction = null;
          
          if (this.user && this.user.id !== 'spectator') {
            this.socket?.emit('player_move_xy', {
              userId: this.user.id, username: this.user.username, avatarUrl: this.user.avatarUrl, skin: this.skin,
              x: this.x, y: this.y, dir: this.dir, frame: 0, isSitting: this.isSitting, isSleeping: this.isSleeping
            });
            this.lastEmit = performance.now();
          }
        }
        try { localStorage.setItem('discord_user_pos', JSON.stringify({ x: this.centerX, y: this.centerY })); } catch(e) {}
      }
      return;
    }

    let inputDx = 0, inputDy = 0;
    if (input.up) inputDy -= 1;
    if (input.down) inputDy += 1;
    if (input.left) inputDx -= 1;
    if (input.right) inputDx += 1;

    const p = input.pointer;
    if (p && p.active && _camera) {
      const targetX = p.x + _camera.x;
      const targetY = p.y + _camera.y;

      if (!this.wasPointerActive) {
        const cx = this.x + this.hw / 2;
        const sy = this.y + this.hh;
        // On utilise la même zone que pour le clic (qui englobe la tête)
        if (targetX >= cx - 24 && targetX <= cx + 24 &&
            targetY >= sy - 60 && targetY <= sy + 10) {
          this.isDraggingPending = true;
          this.dragStartX = this.x;
          this.dragStartY = this.y;
          this.dragPointerStartX = targetX;
          this.dragPointerStartY = targetY;
        } else {
          // Check for sitting interaction
          const SCALE = 3; // hardcoded scale
          const TILE = 16 * SCALE;
          const tr = Math.floor(targetY / TILE);
          const tc = Math.floor(targetX / TILE);
          const sitables = ['couch2x1', 'chair1x1', 'gamingdesk2x2', 'deskboss3x2'];
          const sleepables = ['futon1x2'];
          const targetFurn = map.furniture.find((f: any) => 
            (sitables.includes(f.type) || sleepables.includes(f.type)) && tr >= f.r1 && tr <= f.r2 && tc >= f.c1 && tc <= f.c2
          );
          if (targetFurn && !this.isDraggingPending && !isBuildMode) {
            const targetXPos = (targetFurn.c1 + (targetFurn.c2 - targetFurn.c1 + 1)/2) * TILE - this.hw / 2;
            let targetYPos = (targetFurn.r1 + (targetFurn.r2 - targetFurn.r1 + 1)/2) * TILE - this.hh / 2;
            
            this.jumpMaxTime = 0.25;
            this.jumpTime = this.jumpMaxTime;
            this.jumpStartX = this.x;
            this.jumpStartY = this.y;
            this.jumpEndX = targetXPos;
            this.jumpEndY = targetYPos;
            this.jumpAction = sleepables.includes(targetFurn.type) ? 'sleep' : 'sit';
            
            if (this.jumpAction === 'sleep') {
              if (targetFurn.dir === 90) this.dir = 'right';
              else if (targetFurn.dir === 180) this.dir = 'down';
              else if (targetFurn.dir === 270) this.dir = 'left';
              else this.dir = 'up';
            } else {
              this.dir = 'down';
            }
            
            this.vx = 0;
            this.vy = 0;
            this.moving = false;
          }
        }
      }

      if (this.isDraggingPending && !this.isDragged) {
         if (Math.hypot(targetX - this.dragPointerStartX, targetY - this.dragPointerStartY) > 5) {
             this.isDragged = true;
             this.isDraggingPending = false;
             this.dragOffsetX = this.x - targetX;
             this.dragOffsetY = this.y - targetY;
         }
      }

      if (this.isDragged) {
        this.x = targetX + this.dragOffsetX;
        this.y = targetY + this.dragOffsetY;
        this.x = Math.max(0, Math.min(WORLD_W - this.hw, this.x));
        this.y = Math.max(0, Math.min(WORLD_H - this.hh, this.y));
        this.vx = 0;
        this.vy = 0;
        this.moving = false;
        
        const now = performance.now();
        if (this.user && this.user.id !== 'spectator' && now - this.lastEmit > 50) {
          this.socket?.emit('player_move_xy', {
            userId: this.user.id, username: this.user.username, avatarUrl: this.user.avatarUrl, skin: this.skin,
            x: this.x, y: this.y, dir: this.dir, frame: 0, isSitting: this.isSitting
          });
          this.lastEmit = now;
        }
      }
    } else {
      if (this.isDraggingPending) {
         this.isDraggingPending = false;
      }
      if (this.isDragged) {
        this.isDragged = false;
        if (this._collides(map, this.x, this.y)) {
          this.x = this.dragStartX;
          this.y = this.dragStartY;
        }
        try { localStorage.setItem('discord_user_pos', JSON.stringify({ x: this.centerX, y: this.centerY })); } catch(e) {}
        (window as any).lastDragEndTime = performance.now();
      }
    }
    
    if (p) this.wasPointerActive = p.active;

    if (inputDx !== 0 || inputDy !== 0) {
      if (this.isSitting) {
        this.isSitting = false;
        this.isSleeping = false;
        
        this.jumpMaxTime = 0.25; // 250ms de saut
        this.jumpTime = this.jumpMaxTime;
        this.jumpStartX = this.x;
        this.jumpStartY = this.y;
        this.jumpEndX = this.x;
        this.jumpEndY = this.y + 16 * 3;
        
        return;
      }
    }

    if (inputDx !== 0 && inputDy !== 0) { 
      const length = Math.sqrt(inputDx * inputDx + inputDy * inputDy);
      inputDx /= length; 
      inputDy /= length; 
    }

    const accel = 3500;
    const friction = 10;
    
    this.vx += inputDx * accel * dt;
    this.vy += inputDy * accel * dt;
    
    this.vx -= this.vx * friction * dt;
    this.vy -= this.vy * friction * dt;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > this.speed) {
       this.vx = (this.vx / currentSpeed) * this.speed;
       this.vy = (this.vy / currentSpeed) * this.speed;
    }

    if (Math.abs(this.vx) < 5) this.vx = 0;
    if (Math.abs(this.vy) < 5) this.vy = 0;

    this.moving = this.vx !== 0 || this.vy !== 0;

    if (this.moving && Math.random() < 0.25) {
      this.particles.push({
        type: 'dust',
        x: this.x + this.hw / 2 + (Math.random() - 0.5) * 15,
        y: this.y + this.hh,
        vx: -this.vx * 0.15 + (Math.random() - 0.5) * 20,
        vy: -this.vy * 0.15 + (Math.random() - 0.5) * 20,
        life: 0.4,
        maxLife: 0.4,
        size: 2 + Math.random() * 3
      });
    }

    if (this.isSleeping && Math.random() < 0.05) {
      this.particles.push({
        type: 'zzz',
        x: this.x + this.hw / 2 + (Math.random() - 0.5) * 10,
        y: this.y - 25,
        vx: (Math.random() - 0.5) * 10,
        vy: -10 - Math.random() * 10,
        life: 1.5,
        maxLife: 1.5,
        size: 10 + Math.random() * 6
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }

    if (inputDx > 0) this.dir = 'right';
    else if (inputDx < 0) this.dir = 'left';
    else if (inputDy > 0) this.dir = 'down';
    else if (inputDy < 0) this.dir = 'up';

    if (this.hasWeapon) {
      if (this.attackTime > 0) {
        this.attackTime -= dt;
        if (this.attackTime <= 0) this.isAttacking = false;
      } else if (input.keys[' ']) {
        this.isAttacking = true;
        this.attackTime = 0.3;
        input.keys[' '] = false;
        if (this.game && this.game.remotePlayers) {
          const attackRange = 48;
          const attackWidth = 48;
          let hitBox = { x: 0, y: 0, w: 0, h: 0 };
          if (this.dir === 'up') hitBox = { x: this.x - attackWidth/2, y: this.y - attackRange, w: attackWidth + this.hw, h: attackRange };
          if (this.dir === 'down') hitBox = { x: this.x - attackWidth/2, y: this.y + this.hh, w: attackWidth + this.hw, h: attackRange };
          if (this.dir === 'left') hitBox = { x: this.x - attackRange, y: this.y - attackWidth/2, w: attackRange, h: attackWidth + this.hh };
          if (this.dir === 'right') hitBox = { x: this.x + this.hw, y: this.y - attackWidth/2, w: attackRange, h: attackWidth + this.hh };
          this.game.remotePlayers.forEach((rp: any) => {
            if (rp.x < hitBox.x + hitBox.w && rp.x + rp.hw > hitBox.x && rp.y < hitBox.y + hitBox.h && rp.y + rp.hh > hitBox.y) {
              this.socket.emit('REQUEST_PUNISH_USER', { userId: rp.id });
              for (let i = 0; i < 5; i++) {
                this.particles.push({ x: rp.x + rp.hw/2, y: rp.y + rp.hh/2, vx: (Math.random() - 0.5) * 200, vy: (Math.random() - 0.5) * 200, life: 0.2 + Math.random() * 0.2, type: 'blood' });
              }
            }
          });
        }
      }
    }

    const moveX = this.vx * dt;
    const moveY = this.vy * dt;
    
    if (moveX !== 0 && !this._collides(map, this.x + moveX, this.y)) this.x += moveX;
    else this.vx = 0;
    
    if (moveY !== 0 && !this._collides(map, this.x, this.y + moveY)) this.y += moveY;
    else this.vy = 0;

    this.x = Math.max(0, Math.min(WORLD_W - this.hw, this.x));
    this.y = Math.max(0, Math.min(WORLD_H - this.hh, this.y));

    if (this.moving) {
      this.animTime += dt;
      this.frame = Math.floor(this.animTime / 0.12) % 4;
      
      // Synchro WebSocket toutes les ~100ms
      const now = performance.now();
      if (this.user && this.user.id !== 'spectator' && now - this.lastEmit > 100) {
        this.socket?.emit('player_move_xy', {
          userId: this.user.id,
          username: this.user.username,
          avatarUrl: this.user.avatarUrl,
          skin: this.skin,
          x: this.x,
          y: this.y,
          dir: this.dir,
          frame: this.frame,
          isSitting: this.isSitting
        });
        this.lastEmit = now;
        try { localStorage.setItem('discord_user_pos', JSON.stringify({ x: this.centerX, y: this.centerY })); } catch(e) {}
      }
    } else {
      this.animTime = 0; this.frame = 0;
    }

    if (this.chatTimer > 0) {
      this.chatTimer -= dt;
      if (this.chatTimer <= 0) {
        this.chatMessage = null;
      }
    }

    const zone = map.zoneAt(this.centerX, this.centerY);
    const name = zone ? zone.name : null;
    if (name !== this.currentZoneName) {
      this.currentZoneName = name;
      bus.emit('roomchange', zone);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cam: any, assets: any) {
    // Si on est en mode spectateur, on est complètement invisible.
    if (!this.user || this.user.id === 'spectator') return;

    if (!this.sprites) {
      this.sprites = assets.generatePlayerSprites(this.skin);
    }

    const frames = this.isSitting ? this.sprites['sit'] : (this.sprites[this.dir] || assets.player[this.dir]);
    const img = this.isSitting ? frames[0] : frames[this.frame];
    if (!img) return;
    
    let bounce = 0;
    if (this.jumpTime > 0) {
      const t = 1 - (this.jumpTime / this.jumpMaxTime);
      bounce = Math.sin(t * Math.PI) * 24; // Arc parabolique vers le haut
    } else if (this.isSitting) {
      bounce = -16; // Abaisser le personnage pour qu'il soit posé sur l'assise
    } else if (this.isDragged) {
      bounce = 12 + Math.sin(performance.now() / 100) * 3;
    } else if (this.moving) {
      bounce = Math.abs(Math.sin(this.animTime * Math.PI * 4)) * 3;
    } else {
      bounce = Math.sin(performance.now() / 400) * 1.5;
    }

    const spriteOffsetX = (this.spriteW - this.hw) / 2;
    const spriteOffsetY = this.spriteH - this.hh;
    const sx = this.x - spriteOffsetX - cam.x;
    const sy = this.y - spriteOffsetY - cam.y - bounce;

    ctx.save();
    for (const p of this.particles) {
      if (p.type === 'zzz') {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = '#64b5f6'; // Bleu clair
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = `bold ${Math.floor(p.size)}px "Segoe UI", Arial, sans-serif`;
        ctx.strokeText('Z', p.x - cam.x, p.y - cam.y);
        ctx.fillText('Z', p.x - cam.x, p.y - cam.y);
      } else {
        ctx.globalAlpha = (p.life / p.maxLife) * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const shadowScale = Math.max(0, 1 - (Math.max(0, bounce) / 10));
    ctx.ellipse(this.x + this.hw / 2 - cam.x, this.y + this.hh - cam.y, (this.hw / 1.7) * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.isSleeping) {
      ctx.save();
      const scx = this.x + this.hw / 2 - cam.x;
      const scy = this.y + this.hh / 2 - cam.y;
      ctx.translate(scx, scy);
      if (this.dir === 'left') ctx.rotate(-Math.PI / 2);
      else if (this.dir === 'right') ctx.rotate(Math.PI / 2);
      else if (this.dir === 'down') ctx.rotate(Math.PI);
      ctx.drawImage(img, 0, 0, img.width, img.height, -this.spriteW / 2, -this.spriteH / 2, this.spriteW, this.spriteH);
      ctx.restore();
    } else {
      try { ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, this.spriteW, this.spriteH); } catch(e) { console.error('ERR', e, sx, sy, img); }
    }

    if (this.hasWeapon) {
      ctx.save();
      const x1 = sx + this.spriteW / 2;
      const y1 = sy + this.spriteH / 2;
      
      let hx = 0, hy = 0, baseAngle = 0;
      
      if (this.dir === 'down') { hx = x1 - 12; hy = y1 + 10; baseAngle = -Math.PI * 0.25; }
      else if (this.dir === 'up') { hx = x1 + 12; hy = y1 + 10; baseAngle = Math.PI * 0.25; }
      else if (this.dir === 'left') { hx = x1 - 10; hy = y1 + 10; baseAngle = -Math.PI * 0.25; }
      else if (this.dir === 'right') { hx = x1 + 10; hy = y1 + 10; baseAngle = Math.PI * 0.25; }

      ctx.translate(hx, hy);

      if (this.isAttacking) {
        const progress = 1 - (this.attackTime / 0.3);
        // Reduce the swing arc to ~120 degrees (Math.PI * 0.7)
        // Start slightly behind, swing forward
        let swing = -Math.PI * 0.35 + progress * Math.PI * 0.7;
        if (this.dir === 'left' || this.dir === 'up') swing = -swing;
        ctx.rotate(baseAngle + swing);

        ctx.beginPath();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.lineWidth = 10;
        ctx.lineCap = 'round';
        // Adjust the swoosh arc
        ctx.arc(0, 0, 30, -Math.PI/2, -Math.PI/2 - (swing * 0.6), swing > 0);
        ctx.stroke();
      } else {
        ctx.rotate(baseAngle);
        if (this.moving) {
           ctx.translate(0, Math.sin(performance.now() / 150) * 4);
        }
      }
      
      // Scale down the sword by ~30%
      ctx.scale(0.7, 0.7);

      // Draw actual sword (Exile Greatsword vibe)
      ctx.fillStyle = '#e2e8f0'; 
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(6, 0);
      ctx.lineTo(0, -45); 
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      
      // Ligne centrale rouge pour l'épée d'exil
      ctx.beginPath();
      ctx.moveTo(0, -2);
      ctx.lineTo(0, -40);
      ctx.strokeStyle = '#ef4444';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Garde (guard)
      ctx.fillStyle = '#1e293b'; 
      ctx.fillRect(-12, -4, 24, 8);
      ctx.fillStyle = '#ef4444'; 
      ctx.beginPath();
      ctx.arc(0, 0, 4, 0, Math.PI * 2);
      ctx.fill();
      
      // Manche (handle)
      ctx.fillStyle = '#78350f'; 
      ctx.fillRect(-4, 4, 8, 14);
      
      // Pommeau (pommel)
      ctx.fillStyle = '#1e293b';
      ctx.beginPath();
      ctx.arc(0, 18, 5, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.restore();
    }

    // Dessin du pseudo et avatar
    const name = this.user.username || "Vous";
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    const textMetrics = ctx.measureText(name);
    const textW = textMetrics.width;
    const cx = sx + this.spriteW / 2;
    let extraHeight = 0;
    if (this.spotify) extraHeight += 18;
    if (this.game) extraHeight += 18;

    // Dessin de la bulle de chat
    if (this.chatMessage) {
      ctx.save();
      const chatMetrics = ctx.measureText(this.chatMessage);
      const chatW = chatMetrics.width + 12;
      const chatH = 20;
      const chatY = sy - 24 - extraHeight - chatH;
      const chatX = cx - chatW / 2;
      
      // Bulle background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      try { ctx.roundRect(chatX, chatY, chatW, chatH, 8); } catch(e) { console.error('ROUNDRECT ERR 2', e); }
      ctx.fill();
      
      // Petit triangle de la bulle
      ctx.beginPath();
      ctx.moveTo(cx - 5, chatY + chatH);
      ctx.lineTo(cx + 5, chatY + chatH);
      ctx.lineTo(cx, chatY + chatH + 5);
      ctx.fill();

      // Texte du chat
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Segoe UI", Arial, sans-serif';
      ctx.fillText(this.chatMessage, chatX + 6, chatY + 14);
      ctx.restore();

      extraHeight += chatH + 10;
    }

    const cy = sy - 14 - extraHeight;
    
    // Background du pseudo (avec bordure verte pour signaler "Moi")
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const avatarSize = 16;
    const bgWidth = textW + 8 + (this.avatarImg ? avatarSize + 4 : 0);
    const bgX = cx - bgWidth / 2;
    try {
      try { ctx.roundRect(bgX, cy - 12, bgWidth, 16, 4); } catch(e) { console.error('ROUNDRECT ERR', e, bgX, cy - 12, bgWidth, 16, 4); }
      ctx.fill();
      ctx.stroke();
    } catch(e: any) {
      ctx.fillStyle = 'red';
      ctx.fillText('RERR: ' + e.message, this.x - cam.x, this.y - cam.y + 20);
    }

    // Avatar Discord
    let textStartX = cx;
    if (this.avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bgX + 4 + avatarSize / 2, cy - 4, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.avatarImg, bgX + 4, cy - 12, avatarSize, avatarSize);
      ctx.restore();
      if (this.avatarDecoImg) {
        ctx.drawImage(this.avatarDecoImg, bgX + 4 - 2, cy - 12 - 2, avatarSize + 4, avatarSize + 4);
      }
      textStartX = bgX + 4 + avatarSize + 4 + textW / 2;
    }

    // Texte blanc
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, textStartX, cy - 1);

    let currentY = cy + 8;

    // Game
    if (this.game) {
      ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
      const gameText = `Joue à ${this.game.name}`;
      const gTextW = ctx.measureText(gameText).width;
      
      const gBgW = gTextW + 30; // 16 padding + 14 for icon
      const gBgX = cx - gBgW / 2;

      ctx.fillStyle = '#5865F2'; // Discord blurple
      ctx.beginPath();
      ctx.roundRect(gBgX, currentY, gBgW, 16, 8);
      ctx.fill();

      if (this.game.art && this.game.artImg === undefined) {
         this.game.artImg = null;
         const img = new Image();
         img.src = this.game.art;
         img.crossOrigin = "Anonymous";
         img.onload = () => { this.game.artImg = img; };
      }

      if (this.game.artImg) {
         ctx.save();
         ctx.beginPath();
         ctx.arc(gBgX + 8, currentY + 8, 6, 0, Math.PI * 2);
         ctx.clip();
         ctx.drawImage(this.game.artImg, gBgX + 2, currentY + 2, 12, 12);
         ctx.restore();
      } else {
         ctx.fillStyle = '#ffffff';
         ctx.fillText('🎮', gBgX + 8, currentY + 11);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(gameText, cx + 7, currentY + 11);
      
      currentY += 18;
    }

    // Spotify
    if (this.spotify) {
      ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
      const spText = `${this.spotify.song} - ${this.spotify.artist}`;
      const spTextW = ctx.measureText(spText).width;
      
      const spBgW = spTextW + 30; // 16 padding + 14 for icon
      const spBgX = cx - spBgW / 2;

      ctx.fillStyle = '#1DB954';
      ctx.beginPath();
      ctx.roundRect(spBgX, currentY, spBgW, 16, 8);
      ctx.fill();

      if (this.spotify.albumArt && this.spotify.albumImg === undefined) {
         this.spotify.albumImg = null;
         const img = new Image();
         img.src = this.spotify.albumArt;
         img.crossOrigin = "Anonymous";
         img.onload = () => { this.spotify.albumImg = img; };
      }

      if (this.spotify.albumImg) {
         ctx.save();
         ctx.beginPath();
         ctx.arc(spBgX + 8, currentY + 8, 6, 0, Math.PI * 2);
         ctx.clip();
         ctx.drawImage(this.spotify.albumImg, spBgX + 2, currentY + 2, 12, 12);
         ctx.restore();
      } else {
         ctx.fillStyle = '#ffffff';
         ctx.fillText('🎵', spBgX + 8, currentY + 11);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(spText, cx + 7, currentY + 11);
      
      currentY += 18;
    }
    
    ctx.restore();
  }
}

/* ============================ REMOTE PLAYER ================================= */
class RemotePlayer {
  id: string; hw: number; hh: number; x: number; y: number;
  targetX: number; targetY: number;
  spriteW: number; spriteH: number; speed: number;
  dir: string; moving: boolean; animTime: number; frame: number;
  username: string; avatarUrl: string; avatarImg: HTMLImageElement | null; avatarDecoImg: HTMLImageElement | null = null;
  spotify: any | null;
  game: any | null;
  chatMessage: string | null = null;
  chatTimer: number = 0;
  skin: any = null;
  sprites: any = null;
  isSitting: boolean = false;
  isSleeping: boolean = false;
  particles: any[] = [];

  constructor(id: string, x: number, y: number, username: string, avatarUrl: string, avatarDecorationUrl?: string, skin?: any) {
    this.id = id;
    this.hw = 28; this.hh = 18;
    this.x = x; this.y = y; 
    this.targetX = x; this.targetY = y;
    this.spriteW = 16 * SCALE; this.spriteH = 24 * SCALE;
    this.speed = 100;
    this.dir = 'down';
    this.moving = false;
    this.animTime = 0;
    this.frame = 0;
    this.username = username;
    this.avatarUrl = avatarUrl;
    this.avatarImg = null;
    this.spotify = null;
    this.game = null;
    this.skin = skin || null;

    if (avatarUrl) {
      const img = new Image();
      img.src = avatarUrl;
      img.crossOrigin = "Anonymous";
      img.onload = () => { this.avatarImg = img; };
    }
    
    if (avatarDecorationUrl) {
      const decoImg = new Image();
      decoImg.src = avatarDecorationUrl;
      decoImg.crossOrigin = "Anonymous";
      decoImg.onload = () => { this.avatarDecoImg = decoImg; };
    }
  }

  update(dt: number) {
    const dx = this.targetX - this.x;
    const dy = this.targetY - this.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    this.moving = dist > 2;

    if (this.moving) {
      if (Math.abs(dx) > Math.abs(dy)) {
        this.dir = dx > 0 ? 'right' : 'left';
      } else {
        this.dir = dy > 0 ? 'down' : 'up';
      }

      this.x += dx * 8 * dt;
      this.y += dy * 8 * dt;

      this.animTime += dt;
      this.frame = Math.floor(this.animTime / 0.12) % 4;
    } else {
      this.animTime = 0; this.frame = 0;
    }

    if (this.chatTimer > 0) {
      this.chatTimer -= dt;
      if (this.chatTimer <= 0) {
        this.chatMessage = null;
      }
    }
    
    if (this.moving && Math.random() < 0.25) {
      this.particles.push({
        type: 'dust',
        x: this.x + this.hw / 2 + (Math.random() - 0.5) * 15,
        y: this.y + this.hh,
        vx: (Math.random() - 0.5) * 30,
        vy: (Math.random() - 0.5) * 30,
        life: 0.4,
        maxLife: 0.4,
        size: 2 + Math.random() * 3
      });
    }

    if (this.isSleeping && Math.random() < 0.05) {
      this.particles.push({
        type: 'zzz',
        x: this.x + this.hw / 2 + (Math.random() - 0.5) * 10,
        y: this.y - 25,
        vx: (Math.random() - 0.5) * 10,
        vy: -10 - Math.random() * 10,
        life: 1.5,
        maxLife: 1.5,
        size: 10 + Math.random() * 6
      });
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  draw(ctx: CanvasRenderingContext2D, cam: any, assets: any) {
    if (!this.sprites) {
      this.sprites = assets.generatePlayerSprites(this.skin);
    }

    const frames = (this.isSitting && !this.isSleeping) ? this.sprites['sit'] : (this.sprites[this.dir] || assets.player[this.dir]);
    const img = (this.isSitting && !this.isSleeping) ? frames[0] : frames[this.frame];
    if (!img) return;
    
    let bounce = 0;
    if (this.isSitting) {
      bounce = -16; // Abaisser le personnage pour qu'il soit posé sur l'assise
    } else if (this.moving) {
      bounce = Math.abs(Math.sin(this.animTime * Math.PI * 4)) * 3;
    } else {
      bounce = Math.sin(performance.now() / 400) * 1.5;
    }

    const spriteOffsetX = (this.spriteW - this.hw) / 2;
    const spriteOffsetY = this.spriteH - this.hh;
    const sx = this.x - spriteOffsetX - cam.x;
    const sy = this.y - spriteOffsetY - cam.y - bounce;

    ctx.save();
    for (const p of this.particles) {
      if (p.type === 'zzz') {
        ctx.globalAlpha = p.life / p.maxLife;
        ctx.fillStyle = '#64b5f6'; // Bleu clair
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 1;
        ctx.font = `bold ${Math.floor(p.size)}px "Segoe UI", Arial, sans-serif`;
        ctx.strokeText('Z', p.x - cam.x, p.y - cam.y);
        ctx.fillText('Z', p.x - cam.x, p.y - cam.y);
      } else {
        ctx.globalAlpha = (p.life / p.maxLife) * 0.4;
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(p.x - cam.x, p.y - cam.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    const shadowScale = 1 - (Math.max(0, bounce) / 10);
    ctx.ellipse(this.x + this.hw / 2 - cam.x, this.y + this.hh - cam.y, (this.hw / 1.7) * shadowScale, 6 * shadowScale, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    if (this.isSleeping) {
      ctx.save();
      const scx = this.x + this.hw / 2 - cam.x;
      const scy = this.y + this.hh / 2 - cam.y;
      ctx.translate(scx, scy);
      if (this.dir === 'left') ctx.rotate(-Math.PI / 2);
      else if (this.dir === 'right') ctx.rotate(Math.PI / 2);
      else if (this.dir === 'down') ctx.rotate(Math.PI);
      ctx.drawImage(img, 0, 0, img.width, img.height, -this.spriteW / 2, -this.spriteH / 2, this.spriteW, this.spriteH);
      ctx.restore();
    } else {
      ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, this.spriteW, this.spriteH);
    }

    // Dessin du pseudo et avatar
    const name = this.username;
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    const textMetrics = ctx.measureText(name);
    const textW = textMetrics.width;
    const cx = sx + this.spriteW / 2;
    let extraHeight = 0;
    if (this.spotify) extraHeight += 18;
    if (this.game) extraHeight += 18;

    // Dessin de la bulle de chat
    if (this.chatMessage) {
      ctx.save();
      const chatMetrics = ctx.measureText(this.chatMessage);
      const chatW = chatMetrics.width + 12;
      const chatH = 20;
      const chatY = sy - 24 - extraHeight - chatH;
      const chatX = cx - chatW / 2;
      
      // Bulle background
      ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
      ctx.beginPath();
      ctx.roundRect(chatX, chatY, chatW, chatH, 8);
      ctx.fill();
      
      // Petit triangle de la bulle
      ctx.beginPath();
      ctx.moveTo(cx - 5, chatY + chatH);
      ctx.lineTo(cx + 5, chatY + chatH);
      ctx.lineTo(cx, chatY + chatH + 5);
      ctx.fill();

      // Texte du chat
      ctx.fillStyle = '#fff';
      ctx.font = '11px "Segoe UI", Arial, sans-serif';
      ctx.fillText(this.chatMessage, chatX + 6, chatY + 14);
      ctx.restore();

      extraHeight += chatH + 10;
    }

    const cy = sy - 14 - extraHeight;
    
    // Background du pseudo
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.beginPath();
    const avatarSize = 16;
    const bgWidth = textW + 8 + (this.avatarImg ? avatarSize + 4 : 0);
    const bgX = cx - bgWidth / 2;
    ctx.roundRect(bgX, cy - 12, bgWidth, 16, 4);
    ctx.fill();

    // Avatar Discord
    let textStartX = cx;
    if (this.avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bgX + 4 + avatarSize / 2, cy - 4, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.avatarImg, bgX + 4, cy - 12, avatarSize, avatarSize);
      ctx.restore();
      if (this.avatarDecoImg) {
        ctx.drawImage(this.avatarDecoImg, bgX + 4 - 2, cy - 12 - 2, avatarSize + 4, avatarSize + 4);
      }
      textStartX = bgX + 4 + avatarSize + 4 + textW / 2;
    }

    // Texte blanc
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, textStartX, cy - 1);

    let currentY = cy + 8;

    // Game
    if (this.game) {
      ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
      const gameText = `Joue à ${this.game.name}`;
      const gTextW = ctx.measureText(gameText).width;
      
      const gBgW = gTextW + 30; 
      const gBgX = cx - gBgW / 2;

      ctx.fillStyle = '#5865F2';
      ctx.beginPath();
      ctx.roundRect(gBgX, currentY, gBgW, 16, 8);
      ctx.fill();

      if (this.game.art && this.game.artImg === undefined) {
         this.game.artImg = null;
         const img = new Image();
         img.src = this.game.art;
         img.crossOrigin = "Anonymous";
         img.onload = () => { this.game.artImg = img; };
      }

      if (this.game.artImg) {
         ctx.save();
         ctx.beginPath();
         ctx.arc(gBgX + 8, currentY + 8, 6, 0, Math.PI * 2);
         ctx.clip();
         ctx.drawImage(this.game.artImg, gBgX + 2, currentY + 2, 12, 12);
         ctx.restore();
      } else {
         ctx.fillStyle = '#ffffff';
         ctx.fillText('🎮', gBgX + 8, currentY + 11);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(gameText, cx + 7, currentY + 11);
      
      currentY += 18;
    }

    // Spotify
    if (this.spotify) {
      ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
      const spText = `${this.spotify.song} - ${this.spotify.artist}`;
      const spTextW = ctx.measureText(spText).width;
      
      const spBgW = spTextW + 30; // 16 padding + 14 for icon
      const spBgX = cx - spBgW / 2;

      ctx.fillStyle = '#1DB954';
      ctx.beginPath();
      ctx.roundRect(spBgX, currentY, spBgW, 16, 8);
      ctx.fill();

      if (this.spotify.albumArt && this.spotify.albumImg === undefined) {
         this.spotify.albumImg = null;
         const img = new Image();
         img.src = this.spotify.albumArt;
         img.crossOrigin = "Anonymous";
         img.onload = () => { this.spotify.albumImg = img; };
      }

      if (this.spotify.albumImg) {
         ctx.save();
         ctx.beginPath();
         ctx.arc(spBgX + 8, currentY + 8, 6, 0, Math.PI * 2);
         ctx.clip();
         ctx.drawImage(this.spotify.albumImg, spBgX + 2, currentY + 2, 12, 12);
         ctx.restore();
      } else {
         ctx.fillStyle = '#ffffff';
         ctx.fillText('🎵', spBgX + 8, currentY + 11);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(spText, cx + 7, currentY + 11);
      
      currentY += 18;
    }
    
    ctx.restore();
  }
}

/* ================================ CAMERA ==================================== */
class Camera {
  viewW: number; viewH: number; x: number; y: number;
  constructor(viewW: number, viewH: number) {
    this.viewW = viewW; this.viewH = viewH;
    this.x = 0; this.y = 0;
  }
  update(targetX: number, targetY: number, dt: number) {
    const tx = Math.max(0, Math.min(WORLD_W - this.viewW, targetX - this.viewW / 2));
    const ty = Math.max(0, Math.min(WORLD_H - this.viewH, targetY - this.viewH / 2));
    const lerp = 1 - Math.pow(0.001, dt); 
    this.x += (tx - this.x) * lerp;
    this.y += (ty - this.y) * lerp;
  }
}

/* ================================== HUD ====================================== */
class HUD {
  hudEl: HTMLElement; roomText: HTMLElement; roomIcon: HTMLElement; fpsEl: HTMLElement;

  constructor() {
    this.hudEl = document.getElementById('hud')!;
    this.roomText = document.getElementById('roomText')!;
    this.roomIcon = document.getElementById('roomIcon')!;
    this.fpsEl = document.getElementById('fps')!;
  }

  onRoomChange(zone: any) {
    if (!this.hudEl) return;
    this.roomText.textContent = zone ? zone.name : '—';
    this.roomIcon.textContent = zone ? zone.icon : '❔';
    if (zone) document.documentElement.style.setProperty('--glow', zone.accent);
    this.hudEl.classList.remove('pulse');
    void this.hudEl.offsetWidth; 
    this.hudEl.classList.add('pulse');
  }

  drawMinimap(_map: any, _player: any) {
    // Minimap disabled
  }

  setFps(v: number) { 
    if(this.fpsEl) this.fpsEl.textContent = `${v} FPS`; 
  }
}

/* ================================== GAME ====================================== */
export class OfficeGame {
  canvas: HTMLCanvasElement; viewW: number; viewH: number; ctx: CanvasRenderingContext2D;
  assets: Assets; input: InputManager; map: WorldMap; camera: Camera; hud: HUD; bus: EventBus;
  player: Player; vignette: any; remotePlayers: Map<string, RemotePlayer> = new Map();
  isBuildMode: boolean = false;
  isMapLoaded: boolean = false;
  socket: any; lastTime: number = 0;
  fpsAccum: number = 0;
  fpsFrames: number = 0;
  running: boolean = true;

  equipSword() {
    if (this.player) {
      this.player.hasWeapon = true;
    }
    this.bus.emit('chat', { user: 'Système', text: "L'Épée d'Exil a été équipée ! \nEspace pour attaquer." });
  }

  unequipSword() {
    if (this.player) {
      this.player.hasWeapon = false;
      this.player.isAttacking = false;
    }
    this.bus.emit('chat', { user: 'Système', text: "L'Épée d'Exil a été rangée." });
  }

  constructor(canvas: HTMLCanvasElement, currentUser: any, socket: any, onRoomChange?: (zone: any) => void) {
    this.canvas = canvas;
    const dpr = window.devicePixelRatio || 1;
    this.viewW = canvas.width; this.viewH = canvas.height;
    canvas.width = this.viewW * dpr;
    canvas.height = this.viewH * dpr;
    canvas.style.width = this.viewW + 'px';
    canvas.style.height = this.viewH + 'px';
    this.ctx = canvas.getContext('2d')!;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.ctx.imageSmoothingEnabled = false;

    this.assets = new Assets();
    this.input = new InputManager();
    this.map = new WorldMap();
    this.camera = new Camera(this.viewW, this.viewH);
    this.hud = new HUD();
    this.bus = new EventBus();

    const startTileRow = 13, startTileCol = 20;
    let cx = startTileCol * TILE + TILE / 2, cy = startTileRow * TILE + TILE / 2;
    try {
      const saved = localStorage.getItem('discord_user_pos');
      if (saved) {
        const p = JSON.parse(saved);
        if (typeof p.x === 'number' && typeof p.y === 'number') {
          cx = p.x; cy = p.y;
        }
      }
    } catch(e) {}

    this.player = new Player(cx - 14, cy - 9, currentUser, socket);
    this.camera.x = Math.max(0, Math.min(WORLD_W - this.viewW, cx - this.viewW / 2));
    this.camera.y = Math.max(0, Math.min(WORLD_H - this.viewH, cy - this.viewH / 2));

    this._buildVignette();
    this.bus.on('roomchange', (z: any) => {
      this._onRoomChange(z);
      if (onRoomChange) onRoomChange(z);
    });

    this.canvas.addEventListener('click', (e) => {
      if ((window as any).lastDragEndTime && performance.now() - (window as any).lastDragEndTime < 200) {
        return; // Ignore ce clic, c'était la fin d'un glisser-déposer
      }
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.viewW / rect.width;
      const scaleY = this.viewH / rect.height;
      const clickX = (e.clientX - rect.left) * scaleX + this.camera.x;
      const clickY = (e.clientY - rect.top) * scaleY + this.camera.y;

      const allPlayers: any[] = [this.player, ...Array.from(this.remotePlayers.values())];
      allPlayers.sort((a, b) => (b.y + b.hh) - (a.y + a.hh));

      const tc = Math.floor(clickX / 48);
      const tr = Math.floor(clickY / 48);
      const sitables = ['couch2x1', 'futon1x2', 'chair1x1', 'gamingdesk2x2', 'deskboss3x2'];
      const clickedFurn = this.map.furniture.find((f: any) => 
        sitables.includes(f.type) && tr >= f.r1 && tr <= f.r2 && tc >= f.c1 && tc <= f.c2
      );
      if (clickedFurn) return; // Si on clique sur un siège, on ne déclenche pas le profil

      const whiteboardClicked = this.map.furniture.find((f: any) =>
        f.type.startsWith('whiteboard') && tr >= f.r1 && tr <= f.r2 && tc >= f.c1 && tc <= f.c2
      );
      if (whiteboardClicked) {
        this.bus.emit('whiteboard_clicked');
        return;
      }

      const imageboardClicked = this.map.furniture.find((f: any) =>
        f.type.startsWith('imageboard') && tr >= f.r1 && tr <= f.r2 && tc >= f.c1 && tc <= f.c2
      );
      if (imageboardClicked) {
        this.bus.emit('imageboard_clicked', imageboardClicked.id);
        return;
      }

      for (const p of allPlayers) {
        const cx = p.x + p.hw / 2;
        const sy = p.y + p.hh;
        // On augmente la zone vers le haut (pour couvrir la tête et le pseudo) et on l'élargit
        if (clickX >= cx - 24 && clickX <= cx + 24 &&
            clickY >= sy - 60 && clickY <= sy + 10) {
          const userId = p.user ? p.user.id : p.id;
          if (userId && userId !== 'spectator') {
            // Calculer les coordonnées sur l'écran
            const screenX = (cx - this.camera.x) / scaleX + rect.left;
            const screenY = (sy - this.camera.y) / scaleY + rect.top;
            this.bus.emit('player_clicked', { userId, x: screenX, y: screenY });
            break;
          }
        }
      }
    });

    // Écoute les mouvements X,Y des autres joueurs
    socket.on('player_move_xy', (data: any) => {
      if (currentUser && data.userId === currentUser.id) return; // Ignore nos propres mouvements
      let rp = this.remotePlayers.get(data.userId);
      if (!rp) {
        rp = new RemotePlayer(data.userId, data.x, data.y, data.username, data.avatarUrl, data.avatarDecorationUrl, data.skin);
        this.remotePlayers.set(data.userId, rp);
      } else {
        rp.targetX = data.x;
        rp.targetY = data.y;
        rp.dir = data.dir;
        rp.frame = data.frame;
      }
    });

    this.lastTime = performance.now();
    this.fpsAccum = 0; this.fpsFrames = 0;

    requestAnimationFrame(t => this._loop(t));
  }

  destroy() {
    this.running = false;
    this.input.destroy();
  }

  updateRemotePlayer(id: string, username: string, voiceChannelId: string, avatarUrl: string, avatarDecorationUrl?: string) {
    // Si ce joueur est NOUS, on ne crée pas de "clone" distant, c'est le Player local qui gère
    if (this.player.user && this.player.user.id === id) return;

    let rp = this.remotePlayers.get(id);
    
    // Fallback: mapper les channels sur nos zones en dur si l'ID n'est pas clair
    // On va utiliser un petit trick: prendre le dernier chiffre de l'ID Discord
    const index = parseInt(voiceChannelId?.slice(-1) || '0', 10) % this.map.zones.length;
    const targetZone = this.map.zones[index] || this.map.zones[0]; 

    // Point aléatoire dans la zone pour qu'ils ne se chevauchent pas trop
    const targetX = (targetZone.x1 + targetZone.x2) / 2 * TILE + (Math.random() * 60 - 30);
    const targetY = (targetZone.y1 + targetZone.y2) / 2 * TILE + (Math.random() * 60 - 30);

    if (!rp) {
      rp = new RemotePlayer(id, targetX, targetY, username, avatarUrl, avatarDecorationUrl);
      this.remotePlayers.set(id, rp);
    } else {
      rp.targetX = targetX;
      rp.targetY = targetY;
    }
  }

  removeRemotePlayer(id: string) {
    this.remotePlayers.delete(id);
  }

  updateRemotePlayerSpotify(id: string, spotify: any) {
    if (this.player.user && this.player.user.id === id) {
      this.player.spotify = spotify;
      return;
    }
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.spotify = spotify;
    }
  }

  updateRemotePlayerGame(id: string, game: any | null) {
    if (this.player.user && this.player.user.id === id) {
      this.player.game = game;
      return;
    }
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.game = game;
    }
  }

  updateRemotePlayerSkin(id: string, skin: any) {
    if (this.player.user && this.player.user.id === id) {
      this.player.skin = skin;
      this.player.sprites = null; // Force regenerate
      return;
    }
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.skin = skin;
      rp.sprites = null; // Force regenerate
    }
  }

  updateRemotePlayerChat(id: string, content: string) {
    if (this.player.user && this.player.user.id === id) {
      this.player.chatMessage = content;
      this.player.chatTimer = 5; // Bulle visible 5 secondes
      return;
    }
    const rp = this.remotePlayers.get(id);
    if (rp) {
      rp.chatMessage = content;
      rp.chatTimer = 5;
    }
  }

  _buildVignette() {
    const { c, ctx } = Px.canvas(this.viewW, this.viewH);
    const grad = ctx.createRadialGradient(
      this.viewW / 2, this.viewH / 2, this.viewH * 0.35,
      this.viewW / 2, this.viewH / 2, this.viewH * 0.85
    );
    grad.addColorStop(0, 'rgba(0,0,0,0)');
    grad.addColorStop(1, 'rgba(0,0,0,0.45)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, this.viewW, this.viewH);
    this.vignette = c;
  }

  _onRoomChange(zone: any) {
    this.hud.onRoomChange(zone);
    if (zone) {
      console.log(`[office-walker] roomchange -> ${zone.name}`);
    }
  }

  _loop(now: number) {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.lastTime) / 1000);
    this.lastTime = now;

    this.player.update(dt, this.input, this.map, this.bus, this.camera, this.isBuildMode);
    this.remotePlayers.forEach(rp => rp.update(dt));
    if (!this.player.isDragged) {
      this.camera.update(this.player.centerX, this.player.centerY, dt);
    }
    this._render(now / 1000);
    this.hud.drawMinimap(this.map, this.player);

    this.fpsAccum += dt; this.fpsFrames++;
    if (this.fpsAccum >= 0.5) {
      this.hud.setFps(Math.round(this.fpsFrames / this.fpsAccum));
      this.fpsAccum = 0; this.fpsFrames = 0;
    }

    requestAnimationFrame(t => this._loop(t));
  }

  _render(time: number) {
    if (!this.isMapLoaded) {
      this.ctx.fillStyle = '#1e1f22';
      this.ctx.fillRect(0, 0, this.viewW, this.viewH);
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = '16px "gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.fillText("Chargement du bureau...", this.viewW / 2, this.viewH / 2);
      this.ctx.textAlign = 'left';
      return;
    }
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.viewW, this.viewH);
    this.map.render(ctx, { x: this.camera.x, y: this.camera.y, viewW: this.viewW, viewH: this.viewH }, this.assets, time);
    
    // Trier les joueurs (local + remote) par leur Y pour gérer la profondeur (Z-Index)
    const allPlayers: any[] = [this.player, ...Array.from(this.remotePlayers.values())];
    allPlayers.sort((a, b) => (a.y + a.hh) - (b.y + b.hh));

    allPlayers.forEach(p => p.draw(ctx, this.camera, this.assets));

    const zone = this.map.zoneAt(this.player.centerX, this.player.centerY);
    if (zone) {
      ctx.save();
      ctx.globalAlpha = 0.07;
      ctx.fillStyle = `rgb(${zone.accent})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.restore();
    }

    // Filtre Jour/Nuit calculé dynamiquement
    const hour = new Date().getHours();
    let alpha = 0.0;
    let color = '0, 0, 50'; // Bleu nuit

    if (hour >= 19 || hour <= 6) {
      // Nuit (19h à 6h)
      alpha = 0.55;
    } else if (hour >= 17 && hour < 19) {
      // Soirée (Coucher de soleil)
      alpha = 0.3;
      color = '40, 10, 0'; // Rougeâtre
    } else {
      // Jour
      alpha = 0.0; 
    }

    if (alpha > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = `rgba(${color}, ${alpha})`;
      ctx.fillRect(0, 0, this.viewW, this.viewH);
      ctx.restore();
    }

    ctx.drawImage(this.vignette, 0, 0);
  }

  getPlayerScreenCoords(userId: string): { x: number, y: number } | null {
    let targetPlayer: any = null;
    if (this.player && this.player.user && this.player.user.id === userId) {
      targetPlayer = this.player;
    } else {
      for (const rp of this.remotePlayers.values()) {
        if ((rp as any).user && (rp as any).user.id === userId) {
          targetPlayer = rp;
          break;
        }
      }
    }

    if (!targetPlayer) return null;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.viewW;
    const scaleY = rect.height / this.viewH;

    const cx = targetPlayer.x + targetPlayer.hw / 2;
    const sy = targetPlayer.y + targetPlayer.hh;

    const screenX = (cx - this.camera.x) * scaleX + rect.left;
    const screenY = (sy - this.camera.y) * scaleY + rect.top;

    return { x: screenX, y: screenY };
  }

  getCinemaScreenCoords(): { x: number, y: number, w: number, h: number } | null {
    // La télé est placée à c1=42, r1=1. Elle fait 9 tiles de large (w=9) et 5 tiles de haut (h=5).
    // Les dimensions d'une tile sont définies par TILE = ART * SCALE = 16 * 3 = 48.
    const screenTileX = 42;
    const screenTileY = 3;
    const screenTileW = 9;
    const screenTileH = 5;

    const gameX = screenTileX * TILE;
    const gameY = screenTileY * TILE;
    const gameW = screenTileW * TILE;
    const gameH = screenTileH * TILE;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = rect.width / this.viewW;
    const scaleY = rect.height / this.viewH;

    // Si le bord droit de l'écran est avant le bord gauche de la caméra, ou l'inverse, il est hors champ
    if (gameX + gameW < this.camera.x || gameX > this.camera.x + this.viewW ||
        gameY + gameH < this.camera.y || gameY > this.camera.y + this.viewH) {
      return null;
    }

    const screenX = (gameX - this.camera.x) * scaleX + rect.left;
    const screenY = (gameY - this.camera.y) * scaleY + rect.top;
    const screenW = gameW * scaleX;
    const screenH = gameH * scaleY;

    return { x: screenX, y: screenY, w: screenW, h: screenH };
  }
}
