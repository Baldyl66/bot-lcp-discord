import * as PhaserEngine from 'phaser';

export default class MainScene extends PhaserEngine.Scene {
  private avatars: Map<string, PhaserEngine.GameObjects.Container> = new Map();
  // Données factices avec des couleurs thématiques
  private rooms = [
    { id: '1', name: '📢 Hall', x: 200, y: 150, width: 400, height: 100, color: 0x5865F2 },
    { id: '2', name: '🎮 Gaming', x: 200, y: 350, width: 190, height: 200, color: 0xeb459e },
    { id: '3', name: '🎵 Music', x: 410, y: 350, width: 190, height: 200, color: 0xfee75c },
    { id: '4', name: '🔊 Vocal Général', x: 200, y: 600, width: 400, height: 150, color: 0x57F287 },
  ];

  constructor() {
    super({ key: 'MainScene' });
  }

  preload() {
    // Assets supplémentaires si besoin
  }

  create() {
    // Fond premium (dégradé simulé avec un fond sombre et une grille)
    this.cameras.main.setBackgroundColor('#1e1f22'); // Couleur de fond Discord la plus sombre
    
    // Grille subtile en fond
    this.add.grid(400, 400, 800, 800, 40, 40, 0x000000, 0, 0xffffff, 0.03);
    
    this.drawRooms();
  }

  private drawRooms() {
    this.rooms.forEach(room => {
      // Ombre sous la pièce
      const shadow = this.add.graphics();
      shadow.fillStyle(0x000000, 0.4);
      shadow.fillRoundedRect(room.x + 8, room.y + 8, room.width, room.height, 24);

      // Fond de la pièce (Glassmorphism simulé)
      const graphics = this.add.graphics();
      graphics.fillStyle(0x2b2d31, 0.9); // Fond gris sombre Discord
      graphics.fillRoundedRect(room.x, room.y, room.width, room.height, 24);

      // Bordure lumineuse colorée
      graphics.lineStyle(3, room.color, 0.8);
      graphics.strokeRoundedRect(room.x, room.y, room.width, room.height, 24);

      // Lueur interne (Glow effect)
      const glow = this.add.graphics();
      glow.lineStyle(1, room.color, 0.3);
      glow.strokeRoundedRect(room.x + 2, room.y + 2, room.width - 4, room.height - 4, 22);

      // Titre de la pièce avec une belle police
      this.add.text(room.x + 24, room.y + 20, room.name, {
        fontSize: '22px',
        color: '#ffffff',
        fontFamily: '"Inter", "Segoe UI", Roboto, sans-serif',
        fontStyle: 'bold'
      }).setShadow(0, 2, 'rgba(0,0,0,0.5)', 2);
    });
  }

  public updateAvatar(userId: string, username: string, _channelId: string, avatarUrl: string | null) {
    const room = this.rooms[Math.floor(Math.random() * this.rooms.length)]; 

    // Position cible avec un peu de padding
    const padding = 60;
    const targetX = room.x + padding + Math.random() * (room.width - padding * 2);
    const targetY = room.y + padding + Math.random() * (room.height - padding * 2);

    if (this.avatars.has(userId)) {
      const container = this.avatars.get(userId)!;
      // Animation fluide et rebondissante
      this.tweens.add({
        targets: container,
        x: targetX,
        y: targetY,
        duration: 1200,
        ease: 'Back.easeOut' // Effet "ressort" super agréable
      });
      // Effet de saut vertical (Jump) pendant le déplacement
      this.tweens.add({
        targets: container,
        y: targetY - 30,
        yoyo: true,
        duration: 600,
        ease: 'Sine.easeInOut'
      });
    } else {
      // Création du container
      const container = this.add.container(targetX, targetY);
      container.setDepth(100); // Au-dessus des salons
      
      // Bulle de pseudo
      const textWidth = Math.max(60, username.length * 8 + 20);
      const nameBg = this.add.graphics();
      nameBg.setName('nameBg');
      nameBg.fillStyle(0x111214, 0.8);
      nameBg.fillRoundedRect(-textWidth / 2, 28, textWidth, 24, 12);

      const nameText = this.add.text(0, 40, username, {
        fontSize: '13px',
        color: '#ffffff',
        fontFamily: '"Inter", sans-serif',
        fontStyle: '600'
      }).setOrigin(0.5);
      
      // Cercle de contour (Stroke)
      const ring = this.add.circle(0, 0, 24, 0x2b2d31);
      ring.setStrokeStyle(4, 0x57F287); // Vert fluo (Connecté)
      ring.setName('ring');

      container.add([ring, nameBg, nameText]);
      this.avatars.set(userId, container);

      // Chargement dynamique de la vraie image
      if (avatarUrl) {
        if (!this.textures.exists(userId)) {
          this.load.image(userId, avatarUrl);
          this.load.once(`filecomplete-image-${userId}`, () => {
            this.applyAvatarImage(userId);
          });
          this.load.start();
        } else {
          this.applyAvatarImage(userId);
        }
      }
    }
  }

  private applyAvatarImage(userId: string) {
    const container = this.avatars.get(userId);
    if (!container) return;

    // Image avatar 44x44
    const avatarImg = this.add.image(0, 0, userId).setDisplaySize(44, 44);
    
    // Le masque
    const maskShape = this.make.graphics({});
    maskShape.fillCircle(0, 0, 22);
    // Dans un Container, pour masquer l'enfant indépendamment de la position globale
    // On ajoute le maskGraphics au container, on ne l'affiche pas, mais on s'en sert de masque local.
    container.add(maskShape);
    
    const mask = maskShape.createGeometryMask();
    avatarImg.setMask(mask);
    
    // On l'ajoute au milieu de la pile (sous l'anneau, pour que l'anneau soit un vrai bord par-dessus)
    container.addAt(avatarImg, 0);
  }

  public removeAvatar(userId: string) {
    if (this.avatars.has(userId)) {
      const container = this.avatars.get(userId)!;
      // Animation de disparition douce (Pop out)
      this.tweens.add({
        targets: container,
        scaleX: 0,
        scaleY: 0,
        alpha: 0,
        duration: 300,
        ease: 'Back.easeIn',
        onComplete: () => {
          container.destroy();
          this.avatars.delete(userId);
        }
      });
    }
  }
}
