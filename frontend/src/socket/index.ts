import { io } from 'socket.io-client';

const SOCKET_URL = 'https://backend-production-d094.up.railway.app';

export const socket = io(SOCKET_URL, {
  autoConnect: false, // On se connectera manuellement quand on veut
});
