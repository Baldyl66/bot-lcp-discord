import React, { useEffect, useRef, useState } from 'react';
import { OfficeGame } from '../game/OfficeWalkerEngine';
import { io } from 'socket.io-client';
import './OfficeWalker.css';

export const MapComponent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<OfficeGame | null>(null);

  useEffect(() => {
    // Check local storage or URL hash for auth
    let currentUser = null;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      try {
        const userInfo = JSON.parse(decodeURIComponent(hash.substring(6)));
        localStorage.setItem('discord_user', JSON.stringify(userInfo));
        window.location.hash = ''; // Clean URL
        currentUser = userInfo;
      } catch(e) {}
    } else {
      const stored = localStorage.getItem('discord_user');
      if (stored) currentUser = JSON.parse(stored);
    }
    
    if (currentUser) {
      setUser(currentUser);
    }

    if (!canvasRef.current) return;

    // Prendre tout l'écran
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    const socket = io();

    // Instancie le moteur de jeu en lui passant le socket
    gameRef.current = new OfficeGame(canvasRef.current, currentUser, socket, (zone) => {
      if (zone && currentUser && currentUser.id !== 'spectator') {
        console.log(`Le joueur est entré dans : ${zone.name}`);
        socket.emit('request_move_room', { userId: currentUser.id, channelId: zone.channelId });
      }
    });

    socket.on('connect', () => {
      if (currentUser && currentUser.id !== 'spectator') {
        socket.emit('web_connect', {
          userId: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl
        });
      }
    });

    socket.on('initial_state', (data: any) => {
      console.log('Connecté au backend !', data);
      if (data && data.activeUsers) {
        data.activeUsers.forEach((user: any) => {
          // Le bot envoie 'channelId' dans les events, mais pour initial_state c'est stocké tel quel.
          gameRef.current?.updateRemotePlayer(user.userId, user.username, user.channelId || user.newChannelId || '0', user.avatarUrl);
          if (user.spotify) {
            gameRef.current?.updateRemotePlayerSpotify(user.userId, user.spotify);
          }
        });
      }
    });

    socket.on('virtual_world_event', (event: any) => {
      console.log('Virtual World Event:', event);
      const { type, data } = event;
      if (type === 'USER_JOIN_VOICE' || type === 'USER_MOVE') {
        gameRef.current?.updateRemotePlayer(data.userId, data.username, data.channelId || data.newChannelId, data.avatarUrl);
      } else if (type === 'USER_LEAVE_VOICE') {
        gameRef.current?.removeRemotePlayer(data.userId);
      } else if (type === 'USER_SPOTIFY_UPDATE') {
        gameRef.current?.updateRemotePlayerSpotify(data.userId, data.spotify);
      }
    });

    return () => {
      socket.disconnect();
      if (gameRef.current) {
        gameRef.current.destroy();
        gameRef.current = null;
      }
    };
  }, []);

  const handleLogin = () => {
    window.location.href = '/api/auth/discord/login';
  };

  const handleLogout = () => {
    localStorage.removeItem('discord_user');
    setUser(null);
    window.location.reload();
  };

  return (
    <div className="office-walker-container">
      {!user && (
        <div id="loginOverlay" style={{
          position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
          backgroundColor: 'rgba(0,0,0,0.8)', zIndex: 9999, display: 'flex', 
          justifyContent: 'center', alignItems: 'center'
        }}>
          <div style={{
            background: '#2f3136', padding: '40px', borderRadius: '8px',
            textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.5)'
          }}>
            <h2 style={{marginTop: 0, color: '#fff', fontFamily: 'sans-serif'}}>Office Walker</h2>
            <p style={{color: '#b9bbbe', marginBottom: '30px'}}>Connectez-vous pour incarner votre avatar et le contrôler.</p>
            <button onClick={handleLogin} style={{
              background: '#5865F2', color: 'white', border: 'none', padding: '12px 24px',
              borderRadius: '4px', fontSize: '16px', cursor: 'pointer', fontWeight: 'bold'
            }}>
              Se connecter avec Discord
            </button>
            <br/><br/>
            <button onClick={() => setUser({ id: 'spectator' })} style={{
              background: 'transparent', color: '#b9bbbe', border: '1px solid #4f545c', padding: '8px 16px',
              borderRadius: '4px', fontSize: '14px', cursor: 'pointer'
            }}>
              Mode Spectateur Invisible
            </button>
          </div>
        </div>
      )}

      {user && user.id !== 'spectator' && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '20px' }}>
          {user.avatarUrl && <img src={user.avatarUrl} width="32" height="32" style={{borderRadius: '50%'}} alt="avatar" />}
          <span style={{color: '#fff', fontWeight: 'bold'}}>{user.username}</span>
          <button onClick={handleLogout} style={{background: '#ed4245', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Déconnexion</button>
        </div>
      )}

      <div id="gameWrap">
        <div id="screen">
          <canvas ref={canvasRef} id="game"></canvas>
          {/* HUD retiré à la demande de l'utilisateur */}

          <div id="fps">60 FPS</div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
