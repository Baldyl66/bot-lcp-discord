import React, { useEffect, useRef, useState } from 'react';
import { OfficeGame } from '../game/OfficeWalkerEngine';
import { io } from 'socket.io-client';
import YouTube from 'react-youtube';
import './OfficeWalker.css';

export const MapComponent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [currentZone, setCurrentZone] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [showVestiaire, setShowVestiaire] = useState(false);
  const [skin, setSkin] = useState<{ shirt: string, pants: string }>({ shirt: '#3aa0ff', pants: '#25324a' });
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profilePos, setProfilePos] = useState<{x: number, y: number} | null>(null);
  const [trackingUserId, setTrackingUserId] = useState<string | null>(null);
  
  const [youtubeState, setYoutubeState] = useState<any>(null);
  const [showYoutubePrompt, setShowYoutubePrompt] = useState(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const cinemaDivRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);

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
      } catch (e) { }
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

    gameRef.current.bus.on('player_clicked', (data: {userId: string, x: number, y: number}) => {
      setProfileLoading(true);
      setSelectedProfile(null);
      setProfilePos({ x: data.x, y: data.y });
      setTrackingUserId(data.userId);
      socket.emit('REQUEST_PROFILE', data.userId);
    });

    socket.on('connect', () => {
      console.log('Connecté au serveur web via Socket.IO');
      if (currentUser && currentUser.id !== 'spectator') {
        socket.emit('web_connect', {
          userId: currentUser.id,
          username: currentUser.username,
          avatarUrl: currentUser.avatarUrl,
          avatarDecorationUrl: currentUser.avatarDecorationUrl,
          skin: currentUser.skin
        });
      }
    });

    socket.on('PROFILE_DATA', (data: any) => {
      setProfileLoading(false);
      setSelectedProfile(data);
    });

    socket.on('initial_state', (data: any) => {
      console.log('Connecté au backend !', data);
      if (data && data.youtubeState) setYoutubeState(data.youtubeState);

      if (data && data.activeUsers) {
        data.activeUsers.forEach((u: any) => {
          gameRef.current?.updateRemotePlayer(u.userId, u.username, u.channelId || u.newChannelId || '0', u.avatarUrl, u.avatarDecorationUrl);
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

    socket.on('YOUTUBE_STATE', (state: any) => {
      setYoutubeState(state);
      // Sync player time if needed
      if (ytPlayerRef.current && state.isPlaying) {
        const currentYtTime = ytPlayerRef.current.getCurrentTime() || 0;
        const targetTime = state.playbackTime + (Date.now() - state.lastUpdateTimestamp) / 1000;
        if (Math.abs(currentYtTime - targetTime) > 2) {
          ytPlayerRef.current.seekTo(targetTime);
        }
      }
    });

    socket.on('virtual_world_event', (event: any) => {
      const { type, data } = event;
      if (type === 'USER_JOIN_VOICE' || type === 'USER_MOVE') {
        gameRef.current?.updateRemotePlayer(data.userId, data.username, data.channelId || data.newChannelId, data.avatarUrl, data.avatarDecorationUrl);
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

  useEffect(() => {
    let rafId: number;
    const updatePos = () => {
      try {
        if (gameRef.current) {
          // Tracker la position du profil Discord si ouvert
          if (trackingUserId) {
            const coords = gameRef.current.getPlayerScreenCoords(trackingUserId);
            if (coords) {
              setProfilePos(coords);
            }
          }
          
          // Tracker la position de l'écran de cinéma
          const cinemaCoords = gameRef.current.getCinemaScreenCoords();
          if (cinemaDivRef.current) {
            if (cinemaCoords) {
              const h = cinemaCoords.h - 16;
              const w = Math.round(h * (16 / 9));
              const offsetX = (cinemaCoords.w - w) / 2;

              cinemaDivRef.current.style.display = 'block';
              cinemaDivRef.current.style.transform = `translate(${cinemaCoords.x + offsetX}px, ${cinemaCoords.y + 8}px)`;
              cinemaDivRef.current.style.width = `${w}px`;
              cinemaDivRef.current.style.height = `${h}px`;
            } else {
              cinemaDivRef.current.style.display = 'none';
            }
          }

          // Gérer le volume audio spatialisé
          if (ytPlayerRef.current && gameRef.current.player) {
            const px = gameRef.current.player.x;
            const py = gameRef.current.player.y;
            // Centre approximatif de l'écran dans le jeu (tile 47, 17)
            const screenCenterX = 47 * 48;
            const screenCenterY = 17 * 48;
            const dist = Math.sqrt(Math.pow(px - screenCenterX, 2) + Math.pow(py - screenCenterY, 2));
            
            let volume = Math.max(0, 100 - (dist / 1500) * 100);
            if (volume < 5) volume = 0;
            if (typeof ytPlayerRef.current.setVolume === 'function') {
              ytPlayerRef.current.setVolume(volume);
            }
          }
        }
      } catch (err) {
        console.error("Error in updatePos loop:", err);
      }
      rafId = requestAnimationFrame(updatePos);
    };
    rafId = requestAnimationFrame(updatePos);
    return () => cancelAnimationFrame(rafId);
  }, [trackingUserId]);

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !currentZone || !currentZone.textChannelId || !socketRef.current || !user) return;

    const ytMatch = chatMessage.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
    if (ytMatch) {
      socketRef.current.emit('YOUTUBE_COMMAND', { type: 'PLAY', videoId: ytMatch[1] });
    }

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
            <br />
            <button onClick={() => setUser({ id: 'spectator' })} className="btn-secondary">
              Mode Spectateur Invisible
            </button>
          </div>
        </div>
      )}

      {user && user.id !== 'spectator' && (
        <div style={{ position: 'absolute', top: '10px', left: '10px', zIndex: 100, display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.5)', padding: '5px 10px', borderRadius: '20px' }}>
          {user.avatarUrl && (
            <div style={{ position: 'relative', width: '32px', height: '32px' }}>
              <img src={user.avatarUrl} width="32" height="32" style={{ borderRadius: '50%' }} alt="avatar" />
              {user.avatarDecorationUrl && (
                <img src={user.avatarDecorationUrl} width="38" height="38" style={{ position: 'absolute', top: '-3px', left: '-3px' }} alt="decoration" />
              )}
            </div>
          )}
          <span style={{ color: '#fff', fontWeight: 'bold' }}>{user.username}</span>
          <button onClick={() => setShowVestiaire(!showVestiaire)} style={{ background: '#5865F2', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Skin</button>
          <button onClick={handleLogout} style={{ background: '#ed4245', color: '#fff', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '12px' }}>Déconnexion</button>
        </div>
      )}

      {showVestiaire && (
        <div style={{ position: 'absolute', top: '60px', left: '10px', zIndex: 100, background: 'rgba(30,30,30,0.95)', padding: '15px', borderRadius: '8px', color: 'white', width: '200px' }}>
          <h3 style={{ marginTop: 0, fontSize: '14px', marginBottom: '15px' }}>Personnaliser l'Avatar</h3>
          <div style={{ marginBottom: '10px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Couleur T-Shirt</label>
            <input type="color" value={skin.shirt} onChange={(e) => setSkin({ ...skin, shirt: e.target.value })} style={{ width: '100%' }} />
          </div>
          <div style={{ marginBottom: '15px' }}>
            <label style={{ fontSize: '12px', display: 'block', marginBottom: '5px' }}>Couleur Pantalon</label>
            <input type="color" value={skin.pants} onChange={(e) => setSkin({ ...skin, pants: e.target.value })} style={{ width: '100%' }} />
          </div>
          <button
            onClick={() => {
              if (!user) return;
              localStorage.setItem(`skin_${user.id}`, JSON.stringify(skin));
              if (gameRef.current) gameRef.current.updateRemotePlayerSkin(user.id, skin);
              if (socketRef.current) socketRef.current.emit('UPDATE_SKIN', skin);
              setShowVestiaire(false);
            }}
            style={{ background: '#3ba55c', color: '#fff', border: 'none', padding: '6px 12px', borderRadius: '4px', cursor: 'pointer', width: '100%' }}>
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

      {(profileLoading || selectedProfile) && (
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1000 }} onClick={(e) => { if (e.target === e.currentTarget) { setSelectedProfile(null); setProfileLoading(false); setProfilePos(null); setTrackingUserId(null); } }}>
          <div style={{ 
            position: 'absolute', 
            left: profilePos ? `${profilePos.x}px` : '50%', 
            top: profilePos ? `${profilePos.y - 110}px` : '50%', 
            transform: 'translate(-50%, -100%) scale(0.55)',
            transformOrigin: 'bottom center',
            pointerEvents: 'auto'
          }}>
            {profileLoading ? (
              <div style={{ background: 'rgba(0,0,0,0.8)', padding: '10px 20px', borderRadius: '8px', color: 'white', fontWeight: 'bold' }}>Chargement...</div>
            ) : (
              <div style={{
                width: '340px',
                background: '#111214',
                borderRadius: '8px',
                overflow: 'hidden',
                boxShadow: '0 8px 16px rgba(0,0,0,0.5)',
                color: '#dcddde',
                fontFamily: '"gg sans", "Noto Sans", "Helvetica Neue", Helvetica, Arial, sans-serif'
              }}>
              <div style={{
                height: '120px',
                background: selectedProfile.bannerUrl ? `url(${selectedProfile.bannerUrl}) center/cover` : selectedProfile.bannerColor || '#1e1f22'
              }}></div>

              <div style={{ padding: '16px', position: 'relative' }}>
                <div style={{ position: 'absolute', top: '-60px', left: '16px', width: '100px', height: '100px', borderRadius: '50%', background: '#111214', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                  <div style={{ position: 'relative', width: '82px', height: '82px' }}>
                    {selectedProfile.avatarUrl ? (
                      <img src={selectedProfile.avatarUrl} style={{ width: '100%', height: '100%', borderRadius: '50%' }} alt="avatar" />
                    ) : (
                      <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: '#5865F2', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '32px', color: 'white' }}>
                        {selectedProfile.username.charAt(0).toUpperCase()}
                      </div>
                    )}
                    {selectedProfile.avatarDecorationUrl && <img src={selectedProfile.avatarDecorationUrl} style={{ position: 'absolute', top: '-9px', left: '-9px', width: '100px', height: '100px' }} alt="decoration" />}
                  </div>
                </div>

                <div style={{ marginTop: '45px', background: '#2b2d31', padding: '12px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#f2f3f5', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {selectedProfile.username}
                    {selectedProfile.clanTag && (
                      <span style={{ fontSize: '11px', background: 'rgba(0,0,0,0.4)', padding: '2px 6px', borderRadius: '4px', color: '#b5bac1', border: '1px solid #3f4147' }}>
                        {selectedProfile.clanTag}
                      </span>
                    )}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '14px', borderTop: '1px solid #3f4147', paddingTop: '10px' }}>
                    <div style={{ fontWeight: 'bold', fontSize: '12px', textTransform: 'uppercase', marginBottom: '5px', color: '#b5bac1' }}>Membre Office Walker</div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </div>
      )}

      <div id="gameWrap">
        <div id="screen" style={{ position: 'relative' }}>
          <canvas ref={canvasRef} id="game"></canvas>
          <div id="fps">60 FPS</div>
          
          <div 
            ref={cinemaDivRef}
            style={{
              position: 'absolute',
              zIndex: 100,
              left: 0,
              top: 0,
              display: 'none',
              pointerEvents: 'auto',
              overflow: 'hidden',
              background: youtubeState?.videoId ? '#000' : 'transparent',
              cursor: youtubeState?.videoId ? 'default' : 'pointer'
            }}
            onClick={() => {
              if (!youtubeState?.videoId) {
                setShowYoutubePrompt(true);
              }
            }}>
              {youtubeState?.videoId && (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    if (window.confirm("⏹️ Voulez-vous arrêter la vidéo en cours ?")) {
                      socketRef.current?.emit('YOUTUBE_COMMAND', { type: 'STOP' });
                    }
                  }}
                  style={{
                    position: 'absolute',
                    top: '10px',
                    right: '10px',
                    zIndex: 200,
                    background: 'rgba(255, 0, 0, 0.8)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '30px',
                    height: '30px',
                    cursor: 'pointer',
                    fontWeight: 'bold',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '16px'
                  }}
                  title="Arrêter le film"
                >
                  ✕
                </button>
              )}
              {youtubeState?.videoId && (
              <YouTube
                videoId={youtubeState.videoId}
                className="youtube-absolute-container"
                opts={{
                  width: '100%',
                  height: '100%',
                  playerVars: {
                    autoplay: 1,
                    controls: 0,
                    disablekb: 1,
                    fs: 0,
                    modestbranding: 1
                  }
                }}
                onReady={(e) => {
                  ytPlayerRef.current = e.target;
                  // Si l'état actuel est plus avancé que 0, on avance (pour ceux qui se connectent en cours de route)
                  const targetTime = youtubeState.playbackTime + (Date.now() - youtubeState.lastUpdateTimestamp) / 1000;
                  if (targetTime > 1) {
                    e.target.seekTo(targetTime);
                  }
                }}
                onStateChange={() => {
                  // Optionnel : si on permet aux admins de faire pause, on émet un SYNC ici.
                }}
              />
              )}
            </div>
        </div>
        {showYoutubePrompt && (
          <div style={{
            position: 'absolute',
            bottom: '30px',
            left: '50%',
            transform: 'translateX(-50%)',
            background: 'rgba(0, 0, 0, 0.85)',
            padding: '15px 25px',
            borderRadius: '12px',
            display: 'flex',
            gap: '15px',
            alignItems: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.6)',
            zIndex: 1000,
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
          }}>
            <span style={{ color: 'white', fontWeight: 'bold', fontSize: '16px' }}>Vidéos :</span>
            <input 
              type="text" 
              placeholder="Collez le lien YouTube ici..."
              value={youtubeUrlInput}
              onChange={(e) => setYoutubeUrlInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const ytMatch = youtubeUrlInput.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                  if (ytMatch && socketRef.current) {
                    socketRef.current.emit('YOUTUBE_COMMAND', { type: 'PLAY', videoId: ytMatch[1] });
                    setShowYoutubePrompt(false);
                    setYoutubeUrlInput("");
                  } else {
                    alert("Lien YouTube invalide !");
                  }
                } else if (e.key === 'Escape') {
                  setShowYoutubePrompt(false);
                  setYoutubeUrlInput("");
                }
              }}
              style={{
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.2)',
                padding: '10px 15px',
                borderRadius: '8px',
                color: 'white',
                width: '350px',
                outline: 'none',
                fontSize: '15px'
              }}
              autoFocus
            />
            <button 
              onClick={() => {
                const ytMatch = youtubeUrlInput.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
                if (ytMatch && socketRef.current) {
                  socketRef.current.emit('YOUTUBE_COMMAND', { type: 'PLAY', videoId: ytMatch[1] });
                  setShowYoutubePrompt(false);
                  setYoutubeUrlInput("");
                } else {
                  alert("Lien YouTube invalide !");
                }
              }}
              style={{
                background: '#ff0000',
                color: 'white',
                border: 'none',
                padding: '10px 20px',
                borderRadius: '8px',
                cursor: 'pointer',
                fontWeight: 'bold',
                fontSize: '15px',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#cc0000'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ff0000'}
            >
              Lecture
            </button>
            <button
              onClick={() => {
                setShowYoutubePrompt(false);
                setYoutubeUrlInput("");
              }}
              style={{
                background: 'transparent',
                color: '#aaa',
                border: 'none',
                padding: '10px',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: 'bold'
              }}
              onMouseOver={(e) => e.currentTarget.style.color = 'white'}
              onMouseOut={(e) => e.currentTarget.style.color = '#aaa'}
            >
              ✕
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MapComponent;
