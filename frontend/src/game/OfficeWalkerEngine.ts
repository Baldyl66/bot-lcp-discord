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
const COLS = 40, ROWS = 24;
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
    this._buildPlayer();
  }

  _buildFloors() {
    const mk = (drawFn: any) => { const { c, ctx } = Px.canvas(ART, ART); drawFn(ctx); return c; };

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
  }

  _buildWall() {
    const { c, ctx } = Px.canvas(ART, ART);
    Px.rect(ctx, 0, 0, ART, ART, '#cfd3da');
    Px.rect(ctx, 0, 0, ART, 2, '#e4e7ec');
    Px.rect(ctx, 0, ART - 4, ART, 4, '#8a8f99');
    Px.rect(ctx, 0, ART - 4, ART, 1, '#6f757f');
    for (let x = 0; x < ART; x += 8) Px.rect(ctx, x, 2, 1, ART - 6, '#bcc1c9');
    this.wall = c;
  }

  _buildRug() {
    const w = 6 * ART, h = 4 * ART;
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

    add('whiteboard3x1', 3, 1, (ctx: any, w: number, h: number) => {
      Px.rect(ctx, 2, 2, w - 4, h - 4, '#e0e0e0'); 
      Px.rect(ctx, 0, 0, w, 2, '#aaa'); 
      Px.rect(ctx, 0, h-2, w, 2, '#aaa'); 
      Px.rect(ctx, 0, 0, 2, h, '#aaa'); 
      Px.rect(ctx, w-2, 0, 2, h, '#aaa'); 
      Px.rect(ctx, 10, 6, 6, 4, '#3b5998');
      Px.rect(ctx, 22, 4, 6, 6, '#4caf50');
      Px.rect(ctx, 34, 2, 6, 8, '#f44336');
    }); add('plant1x1', 1, 1, (ctx: any, w: number, h: number) => {
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

  _buildPlayer() {
    const SKIN = '#e0a878', HAIR = '#3a2a1e', SHIRT = '#3aa0ff', SHIRT_D = '#2b7cc9', PANTS = '#25324a';
    const W = 16, H = 24;

    const base = (ctx: any, dir: string) => {
      if (dir === 'down' || dir === 'up') {
        Px.circle(ctx, 8, 6, 5, dir === 'up' ? HAIR : SKIN);
        if (dir === 'up') Px.rect(ctx, 4, 3, 8, 5, HAIR);
        else { Px.rect(ctx, 3, 2, 10, 4, HAIR); Px.rect(ctx, 6, 6, 1, 1, '#1c1c1c'); Px.rect(ctx, 9, 6, 1, 1, '#1c1c1c'); }
        Px.rect(ctx, 3, 11, 10, 7, SHIRT);
        Px.rect(ctx, 3, 11, 10, 2, SHIRT_D);
        Px.rect(ctx, 1, 12, 2, 5, SHIRT_D);
        Px.rect(ctx, 13, 12, 2, 5, SHIRT_D);
      } else {
        Px.circle(ctx, 8, 6, 5, SKIN);
        Px.rect(ctx, 3, 2, 10, 4, HAIR);
        Px.rect(ctx, dir === 'left' ? 4 : 9, 6, 1, 1, '#1c1c1c');
        Px.rect(ctx, 4, 11, 8, 7, SHIRT);
        Px.rect(ctx, 4, 11, 8, 2, SHIRT_D);
        Px.rect(ctx, dir === 'left' ? 10 : 2, 12, 2, 5, SHIRT_D);
      }
    };

    ['down', 'up', 'left', 'right'].forEach(dir => {
      for (let f = 0; f < 4; f++) {
        const { c, ctx } = Px.canvas(W, H);
        base(ctx, dir);
        const stride = [0, 2, 0, -2][f];
        Px.rect(ctx, 4, 18 + (f % 2 === 1 ? Math.abs(stride) * 0 : 0), 3, 5 - stride * 0, PANTS);
        Px.rect(ctx, 4, 18 - Math.max(0, stride), 3, 6, PANTS);
        Px.rect(ctx, 9, 18 - Math.max(0, -stride), 3, 6, PANTS);
        Px.rect(ctx, 4, 23, 3, 1, '#111');
        Px.rect(ctx, 9, 23, 3, 1, '#111');
        this.player[dir].push(c);
      }
    });
  }
}

/* ============================== INPUT ===================================== */
class InputManager {
  keys: any = {};
  keydown: any;
  keyup: any;

  constructor() {
    this.keydown = (e: KeyboardEvent) => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key)) e.preventDefault();
      this.keys[e.key.toLowerCase()] = true;
    };
    this.keyup = (e: KeyboardEvent) => { this.keys[e.key.toLowerCase()] = false; };
    window.addEventListener('keydown', this.keydown);
    window.addEventListener('keyup', this.keyup);
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

  constructor() {
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(0));
    this.furniture = [];
    this.zones = [
      // REMPLACEZ LES 'discord_channel_id' PAR LES VRAIS IDS DE VOS SALONS VOCAUX DISCORD (clic droit -> copier l'ID du salon)
      { name: 'Open Space',        floorKey: 'openspace',  icon: '💻', channelId: '1459937261981536433', x1: 1,  y1: 1,  x2: 13, y2: 10, accent: '127,179,213' },
      { name: 'Accueil',           floorKey: 'reception', icon: '🛎️', channelId: 'salon_id_accueil', x1: 14, y1: 1,  x2: 26, y2: 10, accent: '201,168,118' },
      { name: 'Studio de Musique', floorKey: 'studio',     icon: '🎧', channelId: '1459960696111370433', x1: 27, y1: 1,  x2: 39, y2: 10, accent: '220,100,150' },
      { name: 'Couloir',           floorKey: 'corridor',   icon: '🚶', channelId: 'salon_id_couloir', x1: 1,  y1: 11, x2: 39, y2: 15, accent: '150,156,168' },
      { name: 'Voyage (Japon)',    floorKey: 'japan',      icon: '🌸', channelId: 'salon_id_japon', x1: 1,  y1: 16, x2: 13, y2: 23, accent: '240,150,160' },
      { name: 'Bureau du Manager', floorKey: 'manager',    icon: '👔', channelId: 'salon_id_manager', x1: 14, y1: 16, x2: 26, y2: 23, accent: '127,217,160' },
      { name: 'Salle Gaming',      floorKey: 'gaming',     icon: '🎮', channelId: 'salon_id_serveurs', x1: 27, y1: 16, x2: 39, y2: 23, accent: '180,50,250' },
    ];
    this._generateLayout();
  }

  _setWall(r: number, c: number) { this.grid[r][c] = 1; }
  _setSolid(r1: number, c1: number, r2: number, c2: number) {
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.grid[r][c] = 2;
  }
  _hWall(row: number, doorCenters: number[]) {
    for (let c = 1; c < COLS - 1; c++) this._setWall(row, c);
    doorCenters.forEach(cc => { this.grid[row][cc - 1] = 0; this.grid[row][cc] = 0; });
  }
  _vWallSeg(col: number, rStart: number, rEnd: number, gapStart: number, gapEnd: number) {
    for (let r = rStart; r <= rEnd; r++) { if (r >= gapStart && r <= gapEnd) continue; this._setWall(r, col); }
  }

  _addFurniture(type: string, r1: number, c1: number, r2: number, c2: number) {
    this._setSolid(r1, c1, r2, c2);
    this.furniture.push({ type, r1, c1, r2, c2 });
  }

  _generateLayout() {
    for (let c = 0; c < COLS; c++) { this._setWall(0, c); this._setWall(ROWS - 1, c); }
    for (let r = 0; r < ROWS; r++) { this._setWall(r, 0); this._setWall(r, COLS - 1); }
    this._hWall(10, [7, 20, 33]);
    this._hWall(15, [7, 20, 33]);
    this._vWallSeg(13, 1, 9, 4, 5);
    this._vWallSeg(26, 1, 9, 4, 5);
    this._vWallSeg(13, 16, 22, 18, 19);
    this._vWallSeg(26, 16, 22, 18, 19);

    // Nouvelle salle de gauche : Open Space
    this._addFurniture('whiteboard3x1', 1, 5, 1, 7);
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
    this._addFurniture('rack1x5', 2, 38, 6, 38); // Déplacé sur le mur de DROITE pour libérer la porte à gauche
    this._addFurniture('piano3x1', 2, 29, 2, 31); // Piano décalé le long du mur du haut
    this._addFurniture('drumkit2x2', 2, 36, 3, 37); // Batterie bien calée dans le coin haut droit
    this._addFurniture('speaker1x1', 6, 30, 6, 30); // Enceinte gauche
    this._addFurniture('mixingdesk3x2', 6, 31, 7, 33); // Table de mixage parfaitement centrée sur le tapis
    this._addFurniture('speaker1x1', 6, 34, 6, 34); // Enceinte droite
    this._addFurniture('plant1x1', 8, 36, 8, 36); // Petite plante dans le coin bas droit
    this._addFurniture('shoji4x1', 16, 2, 16, 5);
    this._addFurniture('shoji4x1', 16, 8, 16, 11);
    this._addFurniture('bonsai1x1', 16, 1, 16, 1);
    this._addFurniture('bonsai1x1', 16, 12, 16, 12);
    
    // Coin Repas (En bas à gauche pour libérer les portes)
    this._addFurniture('kotatsu2x2', 20, 3, 21, 4);
    this._addFurniture('zabuton1x1', 19, 3, 19, 3);
    this._addFurniture('zabuton1x1', 19, 4, 19, 4);
    this._addFurniture('zabuton1x1', 22, 3, 22, 3);
    this._addFurniture('zabuton1x1', 22, 4, 22, 4);
    
    // Coin Nuit (En bas à droite)
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

    const rugX = 30 * TILE - cam.x, rugY = 5 * TILE - cam.y;
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
      const sprite = assets.furniture[f.type];

      ctx.save();
      ctx.globalAlpha = 0.28;
      ctx.fillStyle = '#000';
      ctx.beginPath();
      ctx.ellipse(sx + w / 2, sy + h - 4, w / 2.1, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      ctx.drawImage(sprite.canvas, 0, 0, sprite.canvas.width, sprite.canvas.height, sx, sy, w, h);

      if (['desk2x2', 'deskboss3x2', 'gamingdesk2x2', 'arcade2x1', 'tv2x1'].includes(f.type)) {
        const glow = 0.35 + Math.sin(time * 2 + f.c1) * 0.08;
        const gx = sx + w * 0.5, gy = sy + h * 0.5;
        const grad = ctx.createRadialGradient(gx, gy, 2, gx, gy, w * 0.8);
        const color = f.type === 'gamingdesk2x2' ? '200,50,255' : 
                      f.type === 'arcade2x1' ? '50,255,100' : 
                      f.type === 'tv2x1' ? '100,100,255' : '120,190,255';
        grad.addColorStop(0, `rgba(${color},${glow})`);
        grad.addColorStop(1, `rgba(${color},0)`);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.fillStyle = grad;
        ctx.fillRect(sx - 10, sy - 10, w + 20, h + 20);
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
  spriteW: number; spriteH: number; speed: number;
  dir: string; moving: boolean; animTime: number; frame: number;
  currentZoneName: string | null;
  user: any; socket: any; avatarImg: HTMLImageElement | null;
  lastEmit: number;
  spotify: any | null;

  constructor(x: number, y: number, user: any, socket: any) {
    this.hw = 28; this.hh = 18;
    this.x = x; this.y = y; 
    this.spriteW = 16 * SCALE; this.spriteH = 24 * SCALE;
    this.speed = 190;
    this.dir = 'down';
    this.moving = false;
    this.animTime = 0;
    this.frame = 0;
    this.currentZoneName = null;
    this.user = user;
    this.socket = socket;
    this.avatarImg = null;
    this.lastEmit = 0;
    this.spotify = null;

    if (user && user.avatarUrl && user.id !== 'spectator') {
      const img = new Image();
      img.src = user.avatarUrl;
      img.crossOrigin = "Anonymous";
      img.onload = () => { this.avatarImg = img; };
    }
  }

  get centerX() { return this.x + this.hw / 2; }
  get centerY() { return this.y + this.hh / 2; }

  _collides(map: any, x: number, y: number) {
    const pts = [[x, y], [x + this.hw, y], [x, y + this.hh], [x + this.hw, y + this.hh]];
    return pts.some(([px, py]) => map.isSolid(px, py));
  }

  update(dt: number, input: any, map: any, bus: any) {
    let dx = 0, dy = 0;
    if (input.up) dy -= 1;
    if (input.down) dy += 1;
    if (input.left) dx -= 1;
    if (input.right) dx += 1;

    this.moving = dx !== 0 || dy !== 0;
    if (dx !== 0 && dy !== 0) { dx *= 0.7071; dy *= 0.7071; }

    if (dx > 0) this.dir = 'right';
    else if (dx < 0) this.dir = 'left';
    else if (dy > 0) this.dir = 'down';
    else if (dy < 0) this.dir = 'up';

    const moveX = dx * this.speed * dt;
    const moveY = dy * this.speed * dt;
    if (moveX !== 0 && !this._collides(map, this.x + moveX, this.y)) this.x += moveX;
    if (moveY !== 0 && !this._collides(map, this.x, this.y + moveY)) this.y += moveY;

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
          x: this.x,
          y: this.y,
          dir: this.dir,
          frame: this.frame
        });
        this.lastEmit = now;
      }
    } else {
      this.animTime = 0; this.frame = 0;
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

    // Sinon, on se dessine normalement (comme un RemotePlayer mais local)
    const frames = assets.player[this.dir];
    const img = frames[this.frame];
    const spriteOffsetX = (this.spriteW - this.hw) / 2;
    const spriteOffsetY = this.spriteH - this.hh;
    const sx = this.x - spriteOffsetX - cam.x;
    const sy = this.y - spriteOffsetY - cam.y;

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x + this.hw / 2 - cam.x, this.y + this.hh - cam.y, this.hw / 1.7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, this.spriteW, this.spriteH);

    // Dessin du pseudo et avatar
    const name = this.user.username || "Vous";
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    const textMetrics = ctx.measureText(name);
    const textW = textMetrics.width;
    const cx = sx + this.spriteW / 2;
    const cy = this.spotify ? sy - 28 : sy - 14;
    
    // Background du pseudo (avec bordure verte pour signaler "Moi")
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.strokeStyle = '#5865F2';
    ctx.lineWidth = 2;
    ctx.beginPath();
    const avatarSize = 16;
    const bgWidth = textW + 8 + (this.avatarImg ? avatarSize + 4 : 0);
    const bgX = cx - bgWidth / 2;
    ctx.roundRect(bgX, cy - 12, bgWidth, 16, 4);
    ctx.fill();
    ctx.stroke();

    // Avatar Discord
    let textStartX = cx;
    if (this.avatarImg) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(bgX + 4 + avatarSize / 2, cy - 4, avatarSize / 2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(this.avatarImg, bgX + 4, cy - 12, avatarSize, avatarSize);
      ctx.restore();
      textStartX = bgX + 4 + avatarSize + 4 + textW / 2;
    }

    // Texte blanc
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, textStartX, cy - 1);

    // Spotify
    if (this.spotify) {
      ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
      const spText = `${this.spotify.song} - ${this.spotify.artist}`;
      const textW = ctx.measureText(spText).width;
      
      const spBgW = textW + 30; // 16 padding + 14 for icon
      const spBgX = cx - spBgW / 2;
      const spBgY = cy + 8; // More space below username

      ctx.fillStyle = '#1DB954';
      ctx.beginPath();
      ctx.roundRect(spBgX, spBgY, spBgW, 16, 8);
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
         ctx.arc(spBgX + 8, spBgY + 8, 6, 0, Math.PI * 2);
         ctx.clip();
         ctx.drawImage(this.spotify.albumImg, spBgX + 2, spBgY + 2, 12, 12);
         ctx.restore();
      } else {
         ctx.fillStyle = '#ffffff';
         ctx.fillText('🎵', spBgX + 8, spBgY + 11);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(spText, cx + 7, spBgY + 11);
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
  username: string; avatarUrl: string; avatarImg: HTMLImageElement | null;
  spotify: any | null;

  constructor(id: string, x: number, y: number, username: string, avatarUrl: string) {
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

    if (avatarUrl) {
      const img = new Image();
      img.src = avatarUrl;
      img.crossOrigin = "Anonymous";
      img.onload = () => { this.avatarImg = img; };
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
  }

  draw(ctx: CanvasRenderingContext2D, cam: any, assets: any) {
    const frames = assets.player[this.dir];
    const img = frames[this.frame];
    const spriteOffsetX = (this.spriteW - this.hw) / 2;
    const spriteOffsetY = this.spriteH - this.hh;
    const sx = this.x - spriteOffsetX - cam.x;
    const sy = this.y - spriteOffsetY - cam.y;

    ctx.save();
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = '#000';
    ctx.beginPath();
    ctx.ellipse(this.x + this.hw / 2 - cam.x, this.y + this.hh - cam.y, this.hw / 1.7, 6, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    ctx.drawImage(img, 0, 0, img.width, img.height, sx, sy, this.spriteW, this.spriteH);

    // Dessin du pseudo et avatar
    const name = this.username;
    ctx.save();
    ctx.font = 'bold 11px "Segoe UI", Arial, sans-serif';
    const textMetrics = ctx.measureText(name);
    const textW = textMetrics.width;
    const cx = sx + this.spriteW / 2;
    const cy = this.spotify ? sy - 28 : sy - 14;
    
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
      textStartX = bgX + 4 + avatarSize + 4 + textW / 2;
    }

    // Texte blanc
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.fillText(name, textStartX, cy - 1);

    // Spotify
    if (this.spotify) {
      ctx.font = 'bold 9px "Segoe UI", Arial, sans-serif';
      const spText = `${this.spotify.song} - ${this.spotify.artist}`;
      const textW = ctx.measureText(spText).width;
      
      const spBgW = textW + 30; // 16 padding + 14 for icon
      const spBgX = cx - spBgW / 2;
      const spBgY = cy + 8; // More space below username

      ctx.fillStyle = '#1DB954';
      ctx.beginPath();
      ctx.roundRect(spBgX, spBgY, spBgW, 16, 8);
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
         ctx.arc(spBgX + 8, spBgY + 8, 6, 0, Math.PI * 2);
         ctx.clip();
         ctx.drawImage(this.spotify.albumImg, spBgX + 2, spBgY + 2, 12, 12);
         ctx.restore();
      } else {
         ctx.fillStyle = '#ffffff';
         ctx.fillText('🎵', spBgX + 8, spBgY + 11);
      }

      ctx.fillStyle = '#ffffff';
      ctx.fillText(spText, cx + 7, spBgY + 11);
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
  lastTime: number; fpsAccum: number; fpsFrames: number; 
  running: boolean = true;

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
    const cx = startTileCol * TILE + TILE / 2, cy = startTileRow * TILE + TILE / 2;
    this.player = new Player(cx - 14, cy - 9, currentUser, socket);
    this.camera.x = Math.max(0, Math.min(WORLD_W - this.viewW, cx - this.viewW / 2));
    this.camera.y = Math.max(0, Math.min(WORLD_H - this.viewH, cy - this.viewH / 2));

    this._buildVignette();
    this.bus.on('roomchange', (z: any) => {
      this._onRoomChange(z);
      if (onRoomChange) onRoomChange(z);
    });

    // Écoute les mouvements X,Y des autres joueurs
    socket.on('player_move_xy', (data: any) => {
      if (currentUser && data.userId === currentUser.id) return; // Ignore nos propres mouvements
      let rp = this.remotePlayers.get(data.userId);
      if (!rp) {
        rp = new RemotePlayer(data.userId, data.x, data.y, data.username, data.avatarUrl);
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

    this.onClick = this.onClick.bind(this);
    this.canvas.addEventListener('click', this.onClick);

    requestAnimationFrame(t => this._loop(t));
  }

  destroy() {
    this.running = false;
    this.input.destroy();
    this.canvas.removeEventListener('click', this.onClick);
  }

  onClick(e: MouseEvent) {
    const rect = this.canvas.getBoundingClientRect();
    // Gérer l'échelle si le canvas est redimensionné via CSS
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const cx = (e.clientX - rect.left) * scaleX;
    const cy = (e.clientY - rect.top) * scaleY;

    const players = [this.player, ...Array.from(this.remotePlayers.values())];
    
    for (const p of players) {
      if (!p) continue;
      const id = (p as any).userId || (p as any).user?.id;
      if (!id || id === 'spectator') continue;

      const spriteOffsetX = (p.spriteW - p.hw) / 2;
      const spriteOffsetY = p.spriteH - p.hh;
      const sx = p.x - spriteOffsetX - this.camera.x;
      const sy = p.y - spriteOffsetY - this.camera.y;

      if (cx >= sx && cx <= sx + p.spriteW && cy >= sy && cy <= sy + p.spriteH) {
        window.open(`https://discord.com/users/${id}`, '_blank');
        return;
      }
    }
  }

  updateRemotePlayer(id: string, username: string, channelId: string, avatarUrl: string) {
    // Si ce joueur est NOUS, on ne crée pas de "clone" distant, c'est le Player local qui gère
    if (this.player.user && this.player.user.id === id) return;

    let rp = this.remotePlayers.get(id);
    
    // Fallback: mapper les channels sur nos zones en dur si l'ID n'est pas clair
    // On va utiliser un petit trick: prendre le dernier chiffre de l'ID Discord
    const index = parseInt(channelId.slice(-1) || '0', 10) % this.map.zones.length;
    const targetZone = this.map.zones[index] || this.map.zones[0]; 

    // Point aléatoire dans la zone pour qu'ils ne se chevauchent pas trop
    const targetX = (targetZone.x1 + targetZone.x2) / 2 * TILE + (Math.random() * 60 - 30);
    const targetY = (targetZone.y1 + targetZone.y2) / 2 * TILE + (Math.random() * 60 - 30);

    if (!rp) {
      rp = new RemotePlayer(id, targetX, targetY, username, avatarUrl);
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

    this.player.update(dt, this.input, this.map, this.bus);
    this.remotePlayers.forEach(rp => rp.update(dt));
    this.camera.update(this.player.centerX, this.player.centerY, dt);
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
}
