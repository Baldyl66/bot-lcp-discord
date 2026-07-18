import React, { useEffect, useRef, useState } from 'react';
import { OfficeGame } from '../game/OfficeWalkerEngine';
import { io } from 'socket.io-client';
import './OfficeWalker.css';

export const MapComponent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [currentZone, setCurrentZone] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [showVestiaire, setShowVestiaire] = useState(false);
  const [skin, setSkin] = useState<{shirt: string, pants: string}>({shirt: '#3aa0ff', pants: '#25324a'});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<OfficeGame | null>(null);
  const socketRef = useRef<any>(null);

  useEffect(() => {
    // Check local storage or URL hash for auth
    let currentUser = null;
    const hash = window.location.hash;
    if (hash && hash.startsWith('#auth=')) {
      try {
        const userInfo = JSON.parse(decodeURIComponent(hash.substring(6)));
        const savedSkin = localStorage.getItem(`skin_${userInfo.id}`);
        if (savedSkin) userInfo.skin = JSON.parse(savedSkin);
        localStorage.setItem('discord_user', JSON.stringify(userInfo));
        window.location.hash = ''; // Clean URL
        currentUser = userInfo;
      } catch(e) {}
    } else {
      const stored = localStorage.getItem('discord_user');
      if (stored) {
        currentUser = JSON.parse(stored);
        const savedSkin = localStorage.getItem(`skin_${currentUser.id}`);
        if (savedSkin) currentUser.skin = JSON.parse(savedSkin);
      }
    }
    
    if (currentUser) {
      setUser(currentUser);
      if (currentUser.skin) setSkin(currentUser.skin);
    }

    if (!canvasRef.current) return;

    // Prendre tout l'écran
    canvasRef.current.width = window.innerWidth;
    canvasRef.current.height = window.innerHeight;

    const socket = io();
    socketRef.current = socket;

    // Instancie le moteur de jeu en lui passant le socket
    gameRef.current = new OfficeGame(canvasRef.current, currentUser, socket, (zone) => {
      setCurrentZone(zone);
      if (zone && currentUser && currentUser.id !== 'spectator') {
        if (zone.voiceChannelId) {
          console.log(`Le joueur est entré dans : ${zone.name}`);
          socket.emit('request_move_room', { userId: currentUser.id, channelId: zone.voiceChannelId });
        }
      }
    });

    socket.on('connect', () => {
      if (currentUser && currentUser.id !== 'spectator') {
        socket.emit('web_connect', {
          userId: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          skin: currentUser.skin
        });
      }
    });

    socket.on('initial_state', (data: any) => {
      console.log('Connecté au backend !', data);
      if (data && data.activeUsers) {
        data.activeUsers.forEach((u: any) => {
          gameRef.current?.updateRemotePlayer(u.userId, u.username, u.channelId || u.newChannelId || '0', u.avatarUrl);
          if (u.spotify) {
            gameRef.current?.updateRemotePlayerSpotify(u.userId, u.spotify);
          }
          if (u.game) {
            gameRef.current?.updateRemotePlayerGame(u.userId, u.game);
          }
          if (u.skin) {
            gameRef.current?.updateRemotePlayerSkin(u.userId, u.skin);
          }
        });
      }
    });

    socket.on('virtual_world_event', (event: any) => {
      const { type, data } = event;
      if (type === 'USER_JOIN_VOICE' || type === 'USER_MOVE') {
        gameRef.current?.updateRemotePlayer(data.userId, data.username, data.channelId || data.newChannelId, data.avatarUrl);
        if (data.skin) gameRef.current?.updateRemotePlayerSkin(data.userId, data.skin);
      } else if (type === 'USER_LEAVE_VOICE') {
        gameRef.current?.removeRemotePlayer(data.userId);
      } else if (type === 'USER_SPOTIFY_UPDATE') {
        gameRef.current?.updateRemotePlayerSpotify(data.userId, data.spotify);
      } else if (type === 'USER_GAME_UPDATE') {
        gameRef.current?.updateRemotePlayerGame(data.userId, data.game);
      } else if (type === 'CHAT_MESSAGE_RECEIVED') {
        gameRef.current?.updateRemotePlayerChat(data.userId, data.content);
      } else if (type === 'USER_SKIN_UPDATE') {
        gameRef.current?.updateRemotePlayerSkin(data.userId, data.skin);
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

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !currentZone || !currentZone.textChannelId || !socketRef.current || !user) return;
    
    socketRef.current.emit('SEND_CHAT_MESSAGE', {
      userId: user.id,
      username: user.username,
      avatarUrl: user.avatarUrl,
      channelId: currentZone.textChannelId,
      content: chatMessage
    });
    setChatMessage("");
  };

  return (
    <div className="office-walker-container">
      {!user && (
        <div className="modal-overlay" id="loginOverlay">
          <div className="modal-box">
            <h2 className="modal-title">Office Walker</h2>
            <p className="modal-desc">Connectez-vous pour incarner votre avatar et le contrôler.</p>
            <button onClick={handleLogin} className="btn-primary">
              Se connecter avec Discord
            </button>
            <br/>
            <button onClick={() => setUser({ id: 'spectator' })} className="btn-secondary">
              Mode Spectateur Invisible
            </button>
          </div>
        </div>
      )}

      {user && user.id !== 'spectator' && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '20px' }}>
          {user.avatarUrl && <img src={user.avatarUrl} width="32" height="32" style={{borderRadius: '50%'}} alt="avatar" />}
          <span style={{color: '#fff', fontWeight: 'bold'}}>{user.username}</span>
          <button onClick={() => setShowVestiaire(!showVestiaire)} style={{background: '#5865F2', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Skin</button>
          <button onClick={handleLogout} style={{background: '#ed4245', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px'}}>Déconnexion</button>
        </div>
      )}

      {showVestiaire && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 100, background: 'rgba(30,30,30,0.95)', padding: '15px', borderRadius: '8px', color: 'white', width: '200px' }}>
          <h3 style={{marginTop: 0, fontSize: '14px', marginBottom: '15px'}}>Personnaliser l'Avatar</h3>
          <div style={{marginBottom: '10px'}}>
            <label style={{fontSize: '12px', display: 'block', marginBottom: '5px'}}>Couleur T-Shirt</label>
            <input type="color" value={skin.shirt} onChange={(e) => setSkin({...skin, shirt: e.target.value})} style={{width: '100%'}} />
          </div>
          <div style={{marginBottom: '15px'}}>
            <label style={{fontSize: '12px', display: 'block', marginBottom: '5px'}}>Couleur Pantalon</label>
            <input type="color" value={skin.pants} onChange={(e) => setSkin({...skin, pants: e.target.value})} style={{width: '100%'}} />
          </div>
          <button 
            onClick={() => {
              if (!user) return;
              localStorage.setItem(`skin_${user.id}`, JSON.stringify(skin));
              if (gameRef.current) gameRef.current.updateRemotePlayerSkin(user.id, skin);
              if (socketRef.current) socketRef.current.emit('UPDATE_SKIN', skin);
              setShowVestiaire(false);
            }} 
            style={{background: '#3ba55c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', width: '100%'}}>
            Sauvegarder
          </button>
        </div>
      )}

      {currentZone && currentZone.textChannelId && user && user.id !== 'spectator' && (
        <div style={{
          position: 'absolute', bottom: '20px', left: '50%', transform: 'translateX(-50%)',
          zIndex: 100, display: 'flex', gap: '10px', background: 'rgba(0,0,0,0.7)',
          padding: '10px', borderRadius: '8px', width: '400px'
        }}>
          <input 
            type="text" 
            placeholder={`Envoyer un message dans #${currentZone.name}`}
            value={chatMessage}
            onChange={(e) => setChatMessage(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && chatMessage.trim()) {
                handleSendMessage();
              }
            }}
            style={{
              flex: 1, background: '#40444b', color: '#fff', border: 'none',
              padding: '8px 12px', borderRadius: '4px', outline: 'none'
            }}
          />
          <button onClick={handleSendMessage} style={{
            background: '#5865F2', color: '#fff', border: 'none', padding: '8px 16px', borderRadius: '4px', cursor: 'pointer'
          }}>Envoyer</button>
        </div>
      )}

      <div id="gameWrap">
        <div id="screen">
          <canvas ref={canvasRef} id="game"></canvas>
          <div id="fps">60 FPS</div>
        </div>
      </div>
    </div>
  );
};

export default MapComponent;
