import { io } from 'socket.io-client';

const SOCKET_URL = import.meta.env.VITE_BACKEND_URL || 
  (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

export const socket = io(SOCKET_URL, {
  autoConnect: false, // On se connectera manuellement quand on veut
});
