import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import fs from 'fs';
import { PrismaClient } from '@prisma/client';
import path from 'path';

// Charge d'abord le .env du dossier racine (où sont DISCORD_CLIENT_ID, etc)
dotenv.config({ path: path.join(__dirname, '../../.env') });
// Charge ensuite le .env du dossier backend (écrase si doublons)
dotenv.config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*', // En production, restreindre à l'URL du frontend
    methods: ['GET', 'POST']
  }
});

const prisma = new PrismaClient();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Structure en mémoire pour MVP (simplifié)
const activeUsers = new Map<string, any>();

// Etat global pour le cinéma YouTube
let youtubeState = {
  videoId: null as string | null,
  isPlaying: false,
  playbackTime: 0,
  lastUpdateTimestamp: Date.now()
};

// Etat du tableau blanc et tableaux d'images
let whiteboardLines: any[] = [];
const IMAGEBOARDS_FILE = path.join(__dirname, '../../imageboards.json');
let imageBoards: Record<string, string> = {};

try {
  if (fs.existsSync(IMAGEBOARDS_FILE)) {
    imageBoards = JSON.parse(fs.readFileSync(IMAGEBOARDS_FILE, 'utf-8'));
  }
} catch (err) {
  console.error('Erreur lors du chargement des imageBoards:', err);
}

function saveImageBoards() {
  try {
    fs.writeFileSync(IMAGEBOARDS_FILE, JSON.stringify(imageBoards, null, 2));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde des imageBoards:', err);
  }
}

// ==========================================
// CUSTOM FURNITURE STATE
// ==========================================
const FURNITURE_FILE = path.join(__dirname, '../../furniture.json');
let customFurnitureState: { hasCustomLayout: boolean, furniture: any[] } = {
  hasCustomLayout: false,
  furniture: []
};

// Charger la sauvegarde des meubles s'il y en a une
try {
  if (fs.existsSync(FURNITURE_FILE)) {
    const data = fs.readFileSync(FURNITURE_FILE, 'utf-8');
    customFurnitureState = JSON.parse(data);
    console.log('Meubles personnalisés chargés depuis le fichier.');
  }
} catch (err) {
  console.error('Erreur lors du chargement des meubles:', err);
}

function saveCustomFurniture() {
  try {
    fs.writeFileSync(FURNITURE_FILE, JSON.stringify(customFurnitureState, null, 2));
  } catch (err) {
    console.error('Erreur lors de la sauvegarde des meubles:', err);
  }
}

// ==========================================
// OAUTH DISCORD
// ==========================================
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:3001/api/auth/discord/callback';
const FRONTEND_URL = process.env.FRONTEND_URL || '';

app.get('/api/auth/discord/login', (req, res) => {
  if (!DISCORD_CLIENT_ID) {
    return res.status(500).send("DISCORD_CLIENT_ID non configuré");
  }
  const authorizeUrl = `https://discord.com/api/oauth2/authorize?client_id=${DISCORD_CLIENT_ID}&redirect_uri=${encodeURIComponent(DISCORD_REDIRECT_URI)}&response_type=code&scope=identify`;
  res.redirect(authorizeUrl);
});

app.get('/api/auth/discord/callback', async (req, res) => {
  const code = req.query.code;
  if (!code) return res.status(400).send("No code provided");

  try {
    const data = new URLSearchParams();
    data.append('client_id', DISCORD_CLIENT_ID as string);
    data.append('client_secret', DISCORD_CLIENT_SECRET as string);
    data.append('grant_type', 'authorization_code');
    data.append('code', code as string);
    data.append('redirect_uri', DISCORD_REDIRECT_URI);

    const tokenResponse = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data
    });

    const tokenData = await tokenResponse.json();
    if (!tokenData.access_token) throw new Error("Invalid token response");

    const userResponse = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();
    console.log("Discord User Data:", JSON.stringify(userData, null, 2));
    
    // On renvoie l'utilisateur vers le frontend avec ses infos dans l'URL (ou via un JWT, mais pour l'instant via params)
    // Sécurité: c'est un projet local / tech demo, passage par hash pour que ce ne soit pas envoyé au serveur web (localStorage le lira)
    
    let decoUrl = null;
    if (userData.avatar_decoration_data && userData.avatar_decoration_data.asset) {
      decoUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${userData.avatar_decoration_data.asset}.png`;
    } else if (userData.avatar_decoration) {
      decoUrl = `https://cdn.discordapp.com/avatar-decorations/${userData.id}/${userData.avatar_decoration}.png`;
    }

    const userInfo = JSON.stringify({
      id: userData.id,
      username: userData.username,
      avatarUrl: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.${userData.avatar.startsWith('a_') ? 'gif' : 'png'}` : null,
      avatarDecorationUrl: decoUrl
    });
    
    res.redirect(`${FRONTEND_URL}/#auth=${encodeURIComponent(userInfo)}`);

  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur d'authentification");
  }
});

// ==========================================
// API REST (Reçoit les événements du Bot)
// ==========================================
app.post('/api/bot/events', (req, res) => {
  const { type, data } = req.body;
  console.log(`[Bot Event] ${type}`, data.username);
  if (type === 'USER_SPOTIFY_UPDATE') {
    if (activeUsers.has(data.userId)) {
      const user = activeUsers.get(data.userId);
      user.spotify = data.spotify;
      activeUsers.set(data.userId, user);
    }
  }

  if (type === 'USER_GAME_UPDATE') {
    if (activeUsers.has(data.userId)) {
      const user = activeUsers.get(data.userId);
      user.game = data.game;
      activeUsers.set(data.userId, user);
    }
  }

  // Diffuse les événements utiles au Frontend via Socket.IO
  if (type === 'USER_SPOTIFY_UPDATE' || type === 'USER_GAME_UPDATE' || type === 'CHAT_MESSAGE_RECEIVED') {
    io.emit('virtual_world_event', { type, data });
  }
  
  res.status(200).send({ success: true });
});

app.get('/api/users/active', (req, res) => {
  res.json(Array.from(activeUsers.values()));
});

// ==========================================
// SERVIR LE FRONTEND (Option A - Web)
// ==========================================
const frontendDistPath = path.join(__dirname, '../../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

// ==========================================
// SOCKET.IO (Communique avec le Frontend et le Bot)
// ==========================================
const socketUserMap = new Map();

io.on('connection', (socket) => {
  console.log('Nouveau client web connecté:', socket.id);

  // Envoi l'état initial
  socket.emit('initial_state', { 
    activeUsers: Array.from(activeUsers.values()),
    youtubeState,
    customFurnitureState,
    whiteboardLines,
    imageBoards
  });

  // Événement pour le mouvement continu 60fps (X,Y)
  socket.on('player_move_xy', (data) => {
    // data: { userId, x, y, dir, frame }
    // On broadcast à tous les autres clients web
    socket.broadcast.emit('player_move_xy', data);
  });

  // Événement quand l'avatar franchit la porte d'une salle vocale
  socket.on('request_move_room', (data) => {
    // data: { userId, channelId }
    console.log(`Le Web a demandé à bouger ${data.userId} vers vocal ${data.channelId}`);
    io.emit('MOVE_USER_DISCORD', data);
  });

  socket.on('REQUEST_PUNISH_USER', (data) => {
    console.log(`Le Web a demandé à punir (arme cheat) l'utilisateur ${data.userId}`);
    io.emit('PUNISH_USER_DISCORD', data);
  });

  // Relais d'un message chat du Web vers le Bot
  socket.on('SEND_CHAT_MESSAGE', (data) => {
    console.log(`Le Web a envoyé un message texte pour ${data.channelId}: ${data.content}`);
    // On relaie au bot pour exécution
    io.emit('DISCORD_SEND_WEBHOOK_MESSAGE', data);
  });

  // Gestion du Cinéma YouTube
  socket.on('YOUTUBE_COMMAND', (data) => {
    // data = { type: 'PLAY', videoId: '...' } ou { type: 'PAUSE', time: ... } etc.
    if (data.type === 'PLAY') {
      youtubeState = {
        videoId: data.videoId,
        isPlaying: true,
        playbackTime: 0,
        lastUpdateTimestamp: Date.now()
      };
    } else if (data.type === 'SYNC') {
      youtubeState.isPlaying = data.isPlaying;
      youtubeState.playbackTime = data.playbackTime;
      youtubeState.lastUpdateTimestamp = Date.now();
    } else if (data.type === 'STOP') {
      youtubeState = {
        videoId: null,
        isPlaying: false,
        playbackTime: 0,
        lastUpdateTimestamp: Date.now()
      };
    }
    
    // On broadcast le nouvel état à tous les clients
    io.emit('YOUTUBE_STATE', youtubeState);
  });

  // Gestion du Mode Construction (Meubles)
  socket.on('SYNC_FURNITURE', (data) => {
    // data: { hasCustomLayout: boolean, furniture: any[] }
    customFurnitureState = data;
    saveCustomFurniture();
    // On broadcast le nouvel état complet à tous les clients
    io.emit('CUSTOM_FURNITURE_UPDATE', customFurnitureState);
  });

  // Gestion du Tableau Blanc
  socket.on('WHITEBOARD_DRAW', (line) => {
    whiteboardLines.push(line);
    // On broadcast aux autres clients
    socket.broadcast.emit('WHITEBOARD_DRAW', line);
  });

  socket.on('WHITEBOARD_CLEAR', () => {
    whiteboardLines = [];
    io.emit('WHITEBOARD_CLEAR');
  });

  // Gestion des Tableaux d'Images
  socket.on('IMAGEBOARD_UPDATE', ({ boardId, image }) => {
    imageBoards[boardId] = image;
    saveImageBoards();
    socket.broadcast.emit('IMAGEBOARD_UPDATE', { boardId, image });
  });

  // Mise à jour de la couleur/skin
  socket.on('UPDATE_SKIN', (skin) => {
    const userId = socketUserMap.get(socket.id);
    if (!userId) return;
    const user = activeUsers.get(userId);
    if (user) {
      user.skin = skin;
      io.emit('virtual_world_event', { type: 'USER_SKIN_UPDATE', data: { userId, skin } });
    }
  });

  // Récupérer le profil complet d'un utilisateur Discord
  socket.on('REQUEST_PROFILE', async (userId) => {
    try {
      const response = await fetch(`https://discord.com/api/v10/users/${userId}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_TOKEN}` }
      });
      if (!response.ok) throw new Error('Failed to fetch user');
      const data = await response.json();
      
      let decoUrl = null;
      if (data.avatar_decoration_data && data.avatar_decoration_data.asset) {
        decoUrl = `https://cdn.discordapp.com/avatar-decoration-presets/${data.avatar_decoration_data.asset}.png`;
      } else if (data.avatar_decoration) {
        decoUrl = `https://cdn.discordapp.com/avatar-decorations/${data.id}/${data.avatar_decoration}.png`;
      }
      
      socket.emit('PROFILE_DATA', {
        id: data.id,
        username: data.global_name || data.username,
        clanTag: data.clan ? data.clan.tag : null,
        avatarUrl: data.avatar ? `https://cdn.discordapp.com/avatars/${data.id}/${data.avatar}.${data.avatar.startsWith('a_') ? 'gif' : 'png'}?size=256` : null,
        avatarDecorationUrl: decoUrl,
        bannerUrl: data.banner ? `https://cdn.discordapp.com/banners/${data.id}/${data.banner}.${data.banner.startsWith('a_') ? 'gif' : 'png'}?size=512` : null,
        bannerColor: data.banner_color || '#1e1f22', // default discord dark color
        badges: data.public_flags // you could parse this
      });
    } catch (e) {
      console.error('Erreur lors de la récupération du profil:', e);
    }
  });

  socket.on('web_connect', (data) => {
    socketUserMap.set(socket.id, data.userId);
    activeUsers.set(data.userId, { ...data, channelId: '0' }); // Start in lobby
    socket.broadcast.emit('virtual_world_event', {
      type: 'USER_JOIN_VOICE', 
      data: { ...data, channelId: '0' }
    });
  });

  socket.on('disconnect', () => {
    console.log('Client web déconnecté:', socket.id);
    const userId = socketUserMap.get(socket.id);
    if (userId) {
      activeUsers.delete(userId);
      socketUserMap.delete(socket.id);
      io.emit('virtual_world_event', {
        type: 'USER_LEAVE_VOICE',
        data: { userId }
      });
    }
  });
});

// Démarrage
server.listen(PORT, async () => {
  console.log(`🚀 Virtual World Backend en écoute sur le port ${PORT}`);
  try {
    await prisma.$connect();
    console.log(`✅ Connecté à la base de données PostgreSQL`);
  } catch (err) {
    console.log(`⚠️ Base de données non connectée. (Lancez le conteneur Docker/PostgreSQL)`);
  }
});
