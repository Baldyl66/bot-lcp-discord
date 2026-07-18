import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import { PrismaClient } from '@prisma/client';
import path from 'path';

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
// API REST (Reçoit les événements du Bot)
// ==========================================
app.post('/api/bot/events', (req, res) => {
  const { type, data } = req.body;
  console.log(`[Bot Event] ${type}`, data.username);

  switch (type) {
    case 'USER_JOIN_VOICE':
    case 'USER_MOVE':
      activeUsers.set(data.userId, data);
      break;
    case 'USER_LEAVE_VOICE':
      activeUsers.delete(data.userId);
      break;
  }

  // Diffuse l'événement au Frontend via Socket.IO
  io.emit('virtual_world_event', { type, data });
  
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
// SOCKET.IO (Communique avec le Frontend)
// ==========================================
io.on('connection', (socket) => {
  console.log('Nouveau client web connecté:', socket.id);

  // Envoi l'état initial
  socket.emit('initial_state', { activeUsers: Array.from(activeUsers.values()) });

  socket.on('disconnect', () => {
    console.log('Client web déconnecté:', socket.id);
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
