import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
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

    const userResponse = await fetch('https://discord.com/api/users/@me', {
      headers: { authorization: `${tokenData.token_type} ${tokenData.access_token}` }
    });

    const userData = await userResponse.json();
    
    // On renvoie l'utilisateur vers le frontend avec ses infos dans l'URL (ou via un JWT, mais pour l'instant via params)
    // Sécurité: c'est un projet local / tech demo, passage par hash pour que ce ne soit pas envoyé au serveur web (localStorage le lira)
    const userInfo = JSON.stringify({
      id: userData.id,
      username: userData.username,
      avatarUrl: userData.avatar ? `https://cdn.discordapp.com/avatars/${userData.id}/${userData.avatar}.png` : null
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

  // Diffuse uniquement l'événement Spotify au Frontend via Socket.IO
  // Les events de connexion vocale sont ignorés pour l'affichage web
  if (type === 'USER_SPOTIFY_UPDATE') {
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
  socket.emit('initial_state', { activeUsers: Array.from(activeUsers.values()) });

  // Événement pour le mouvement continu 60fps (X,Y)
  socket.on('player_move_xy', (data) => {
    // data: { userId, x, y, dir, frame }
    // On broadcast à tous les autres clients web
    socket.broadcast.emit('player_move_xy', data);
  });

  // Événement quand l'avatar franchit la porte d'une salle
  socket.on('request_move_room', (data) => {
    // data: { userId, channelId }
    console.log(`Le Web a demandé à bouger ${data.userId} vers ${data.channelId}`);
    // On l'envoie à TOUT LE MONDE (donc le Bot qui écoute aussi va le recevoir et exécuter l'action Discord)
    io.emit('MOVE_USER_DISCORD', data);
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
