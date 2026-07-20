import React, { useEffect, useRef, useState } from 'react';
import { OfficeGame } from '../game/OfficeWalkerEngine';
import { io } from 'socket.io-client';
import YouTube from 'react-youtube';
import './OfficeWalker.css';
import { WhiteboardModal } from './WhiteboardModal';
import { ImageBoardModal } from './ImageBoardModal';
import { CheatPanel } from './CheatPanel';

export const MapComponent: React.FC = () => {
  const [user, setUser] = useState<any>(null);
  const [currentZone, setCurrentZone] = useState<any>(null);
  const [chatMessage, setChatMessage] = useState("");
  const [showVestiaire, setShowVestiaire] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [skin, setSkin] = useState<{ shirt: string, pants: string }>({ shirt: '#3aa0ff', pants: '#25324a' });
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState<boolean>(false);
  const [profilePos, setProfilePos] = useState<{ x: number, y: number } | null>(null);
  const [trackingUserId, setTrackingUserId] = useState<string | null>(null);

  const [youtubeState, setYoutubeState] = useState<any>(null);
  const youtubeStateRef = useRef<any>(null);
  const [showYoutubePrompt, setShowYoutubePrompt] = useState(false);
  const [youtubeUrlInput, setYoutubeUrlInput] = useState("");
  const cinemaDivRef = useRef<HTMLDivElement>(null);
  const ytPlayerRef = useRef<any>(null);

  const [showCheatPanel, setShowCheatPanel] = useState(false);
  const [hasWeapon, setHasWeapon] = useState(false);

  const [showWhiteboard, setShowWhiteboard] = useState(false);
  const [whiteboardLines, setWhiteboardLines] = useState<any[]>([]);
  const [imageBoards, setImageBoards] = useState<Record<string, string>>({});
  const [showImageBoard, setShowImageBoard] = useState<string | null>(null);

  const [isBuildMode, setIsBuildMode] = useState(false);
  const [buildRotation, setBuildRotation] = useState<number>(0);
  const [selectedFurniture, setSelectedFurniture] = useState<string | null>(null);
  const [customFurniture, setCustomFurniture] = useState<any[]>([]);

  // Pour le menu déplaçable
  const [menuPos, setMenuPos] = useState({ x: 0, y: 0 });
  const [isDraggingMenu, setIsDraggingMenu] = useState(false);
  const dragMenuOffsetRef = useRef({ x: 0, y: 0 });

  const isDraggingRef = useRef(false);
  const dragTargetIdRef = useRef<string | null>(null);
  const dragOffsetRef = useRef<{ dr: number, dc: number }>({ dr: 0, dc: 0 });

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameRef = useRef<OfficeGame | null>(null);
  const socketRef = useRef<any>(null);

  const isAdmin = user?.id === '829365573766479883';
  const furnitureTypes = ['plant1x1', 'watercooler1x1', 'bonsai1x1', 'chair1x1', 'speaker1x1', 'micstand1x1', 'lantern1x1', 'zabuton1x1', 'couch2x1', 'tv2x1', 'arcade2x1', 'futon1x2', 'desk2x2', 'drumkit2x2', 'kotatsu2x2', 'piano3x1', 'whiteboard4x1', 'mixingdesk3x2', 'shoji4x1', 'counter6x2', 'imageboard2x2', 'imageboard4x2'];

  const furnitureNames: Record<string, string> = {
    'plant1x1': 'Plante',
    'watercooler1x1': 'Fontaine à eau',
    'bonsai1x1': 'Bonsaï',
    'chair1x1': 'Chaise de bureau',
    'speaker1x1': 'Enceinte',
    'micstand1x1': 'Pied de micro',
    'lantern1x1': 'Lanterne',
    'zabuton1x1': 'Coussin (Zabuton)',
    'couch2x1': 'Canapé',
    'tv2x1': 'Télévision',
    'arcade2x1': 'Borne Arcade',
    'futon1x2': 'Futon',
    'desk2x2': 'Bureau',
    'drumkit2x2': 'Batterie',
    'kotatsu2x2': 'Kotatsu',
    'piano3x1': 'Piano',
    'whiteboard4x1': 'Tableau blanc',
    'mixingdesk3x2': 'Table de mixage',
    'shoji4x1': 'Paravent Shoji',
    'counter6x2': 'Grand Comptoir',
    'imageboard2x2': 'Tableau Image',
    'imageboard4x2': 'Tableau Image Large'
  };


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

    gameRef.current.bus.on('player_clicked', (data: { userId: string, x: number, y: number }) => {
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

      if (data && data.customFurnitureState) {
        if (data.customFurnitureState.hasCustomLayout) {
          setCustomFurniture(data.customFurnitureState.furniture);
          gameRef.current?.map.syncCustomFurniture(data.customFurnitureState.furniture);
        } else {
          // Si le backend est vide, on prend la dispo par défaut du jeu
          setCustomFurniture(gameRef.current?.map.furniture || []);
        }
      }

      if (gameRef.current) {
        gameRef.current.isMapLoaded = true;
      }

      if (data && data.youtubeState) {
        setYoutubeState(data.youtubeState);
      }
      if (data.whiteboardLines) {
        setWhiteboardLines(data.whiteboardLines);
      }
      if (data.imageBoards) {
        setImageBoards(data.imageBoards);
      }
    });

    socket.on('CUSTOM_FURNITURE_UPDATE', (data: any) => {
      if (data.hasCustomLayout) {
        setCustomFurniture(data.furniture);
        gameRef.current?.map.syncCustomFurniture(data.furniture);
      }
    });

    socket.on('YOUTUBE_STATE', (state: any) => {
      youtubeStateRef.current = state;
      setYoutubeState(state);
      if (ytPlayerRef.current) {
        if (state.isPlaying) {
          ytPlayerRef.current.playVideo();
          const currentYtTime = ytPlayerRef.current.getCurrentTime() || 0;
          const targetTime = state.playbackTime + (Date.now() - state.lastUpdateTimestamp) / 1000;
          if (Math.abs(currentYtTime - targetTime) > 2) {
            ytPlayerRef.current.seekTo(targetTime);
          }
        } else if (state.videoId) {
          ytPlayerRef.current.pauseVideo();
        }
      }
    });

    gameRef.current?.bus.on('whiteboard_clicked', () => {
      setShowWhiteboard(true);
    });

    socket.on('WHITEBOARD_DRAW', (line: any) => {
      setWhiteboardLines((prev) => [...prev, line]);
    });

    socket.on('WHITEBOARD_CLEAR', () => {
      setWhiteboardLines([]);
    });

    socket.on('IMAGEBOARD_UPDATE', ({ boardId, image }: any) => {
      setImageBoards((prev) => ({ ...prev, [boardId]: image }));
    });

    gameRef.current?.bus.on('imageboard_clicked', (boardId: string) => {
      setShowImageBoard(boardId);
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

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.isBuildMode = isBuildMode;
    }
  }, [isBuildMode]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.map.whiteboardLines = whiteboardLines;
    }
  }, [whiteboardLines]);

  useEffect(() => {
    if (gameRef.current) {
      gameRef.current.map.imageBoards = imageBoards;
    }
  }, [imageBoards]);

  useEffect(() => {
    if (!isDraggingMenu) return;
    const handleMove = (e: MouseEvent) => {
      setMenuPos({
        x: Math.max(0, Math.min(window.innerWidth - 320, e.clientX - dragMenuOffsetRef.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - 50, e.clientY - dragMenuOffsetRef.current.y))
      });
    };
    const handleUp = () => setIsDraggingMenu(false);
    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [isDraggingMenu]);

  useEffect(() => {
    if (!canvasRef.current || !gameRef.current) return;

    const handleMouseDown = (e: MouseEvent) => {
      if (!isBuildMode || !canvasRef.current || !gameRef.current || !socketRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / (window.devicePixelRatio || 1) / rect.width;
      const scaleY = canvasRef.current.height / (window.devicePixelRatio || 1) / rect.height;

      const px = (e.clientX - rect.left) * scaleX + gameRef.current.camera.x;
      const py = (e.clientY - rect.top) * scaleY + gameRef.current.camera.y;

      const { r, c } = gameRef.current.map.getTileFromPx(px, py);

      if (selectedFurniture === 'MOVE') {
        const target = customFurniture.find(f => r >= f.r1 && r <= f.r2 && c >= f.c1 && c <= f.c2);
        if (target) {
          isDraggingRef.current = true;
          dragTargetIdRef.current = target.id;
          dragOffsetRef.current = { dr: target.r1 - r, dc: target.c1 - c };
        }
      } else if (selectedFurniture === 'DELETE') {
        const newLayout = customFurniture.filter(f => !(r >= f.r1 && r <= f.r2 && c >= f.c1 && c <= f.c2));
        setCustomFurniture(newLayout);
        socketRef.current.emit('SYNC_FURNITURE', { hasCustomLayout: true, furniture: newLayout });
      } else if (selectedFurniture) {
        let w = 1, h = 1;
        const match = selectedFurniture.match(/(\d+)x(\d+)$/);
        if (match) {
          w = parseInt(match[1]);
          h = parseInt(match[2]);
        }
        if (buildRotation === 90 || buildRotation === 270) {
          const temp = w;
          w = h;
          h = temp;
        }
        if (r + h - 1 >= 24 || c + w - 1 >= 55) return;

        const newLayout = [...customFurniture, {
          id: Math.random().toString(36).substring(2, 9),
          type: selectedFurniture,
          r1: r, c1: c,
          r2: r + h - 1, c2: c + w - 1,
          dir: buildRotation
        }];
        setCustomFurniture(newLayout);
        socketRef.current.emit('SYNC_FURNITURE', { hasCustomLayout: true, furniture: newLayout });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !dragTargetIdRef.current || !isBuildMode || !canvasRef.current || !gameRef.current || !socketRef.current) return;
      
      const rect = canvasRef.current.getBoundingClientRect();
      const scaleX = canvasRef.current.width / (window.devicePixelRatio || 1) / rect.width;
      const scaleY = canvasRef.current.height / (window.devicePixelRatio || 1) / rect.height;
      const px = (e.clientX - rect.left) * scaleX + gameRef.current.camera.x;
      const py = (e.clientY - rect.top) * scaleY + gameRef.current.camera.y;

      const { r, c } = gameRef.current.map.getTileFromPx(px, py);
      
      setCustomFurniture(prev => {
        const targetId = dragTargetIdRef.current;
        const item = prev.find(f => f.id === targetId);
        if (!item) return prev;
        
        let w = item.c2 - item.c1 + 1;
        let h = item.r2 - item.r1 + 1;
        
        let newR1 = r + dragOffsetRef.current.dr;
        let newC1 = c + dragOffsetRef.current.dc;

        if (newR1 < 0) newR1 = 0;
        if (newC1 < 0) newC1 = 0;
        if (newR1 + h - 1 >= 24) newR1 = 24 - h;
        if (newC1 + w - 1 >= 55) newC1 = 55 - w;
        
        if (newR1 === item.r1 && newC1 === item.c1) return prev;
        
        const newLayout = prev.map(f => {
          if (f.id === targetId) {
            return { ...f, r1: newR1, c1: newC1, r2: newR1 + h - 1, c2: newC1 + w - 1 };
          }
          return f;
        });
        
        socketRef.current.emit('SYNC_FURNITURE', { hasCustomLayout: true, furniture: newLayout });
        return newLayout;
      });
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        dragTargetIdRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (isBuildMode && (e.key === 'r' || e.key === 'R')) {
        setBuildRotation(prev => (prev + 90) % 360);
        
        if (isDraggingRef.current && dragTargetIdRef.current) {
          const targetId = dragTargetIdRef.current;
          setCustomFurniture(prev => {
            const newLayout = prev.map(f => {
              if (f.id === targetId) {
                const currentDir = f.dir || 0;
                const nextDir = (currentDir + 90) % 360;
                const w = f.c2 - f.c1 + 1;
                const h = f.r2 - f.r1 + 1;
                return { ...f, dir: nextDir, r2: f.r1 + w - 1, c2: f.c1 + h - 1 };
              }
              return f;
            });
            if (socketRef.current) {
              socketRef.current.emit('SYNC_FURNITURE', { hasCustomLayout: true, furniture: newLayout });
            }
            return newLayout;
          });
        }
      }
    };

    canvasRef.current.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('keydown', handleKeyDown);
    
    return () => {
      canvasRef.current?.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isBuildMode, selectedFurniture, customFurniture, buildRotation]);

  const handleSendMessage = () => {
    if (!chatMessage.trim() || !currentZone || !currentZone.textChannelId || !socketRef.current || !user) return;

    if (chatMessage.trim().toLowerCase() === '/cheat') {
      setShowCheatPanel(true);
      setChatMessage("");
      return;
    }

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
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              background: 'transparent', color: '#b5bac1', border: 'none',
              cursor: 'pointer', padding: '0 5px', fontSize: '10px',
              transition: 'transform 0.2s ease',
              transform: showUserMenu ? 'rotate(180deg)' : 'rotate(0deg)'
            }}
          >
            ▼
          </button>

          <div style={{ 
            position: 'absolute', top: '100%', right: '0', marginTop: '10px', 
            background: '#2b2d31', borderRadius: '6px', overflow: 'hidden', 
            display: 'flex', flexDirection: 'column', 
            boxShadow: '0 8px 15px rgba(0,0,0,0.4)',
            transition: 'all 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
            opacity: showUserMenu ? 1 : 0,
            transform: showUserMenu ? 'translateY(0) scale(1)' : 'translateY(-10px) scale(0.95)',
            pointerEvents: showUserMenu ? 'auto' : 'none',
            transformOrigin: 'top right'
          }}>
            <button
              onClick={() => { setShowVestiaire(!showVestiaire); setShowUserMenu(false); }}
              style={{ 
                background: '#5865F2', color: '#fff', border: 'none', 
                padding: '12px 20px', cursor: 'pointer', textAlign: 'center', 
                borderBottom: '1px solid #1e1f22', fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#4752c4'}
              onMouseOut={(e) => e.currentTarget.style.background = '#5865F2'}
            >
              Personnaliser Skin
            </button>
            {isAdmin && (
              <button
                onClick={() => { setIsBuildMode(!isBuildMode); setShowUserMenu(false); }}
                style={{ 
                  background: '#f39c12', color: '#fff', border: 'none', 
                  padding: '12px 20px', cursor: 'pointer', textAlign: 'center', 
                  borderBottom: '1px solid #1e1f22', fontWeight: 'bold',
                  transition: 'background 0.2s'
                }}
                onMouseOver={(e) => e.currentTarget.style.background = '#d68910'}
                onMouseOut={(e) => e.currentTarget.style.background = '#f39c12'}
              >
                {isBuildMode ? 'Quitter Construction' : 'Mode Construction'}
              </button>
            )}
            <button
              onClick={handleLogout}
              style={{ 
                background: '#ed4245', color: '#fff', border: 'none', 
                padding: '12px 20px', cursor: 'pointer', textAlign: 'center', 
                fontWeight: 'bold',
                transition: 'background 0.2s'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = '#c9383b'}
              onMouseOut={(e) => e.currentTarget.style.background = '#ed4245'}
            >
              Déconnexion
            </button>
          </div>
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
                    controls: 1,
                    disablekb: 0,
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
                  if (!youtubeState.isPlaying) {
                    e.target.pauseVideo();
                  }
                }}
                onStateChange={(e) => {
                  // e.data === 1 (Lecture), e.data === 2 (Pause)
                  if (e.data === 1 || e.data === 2) {
                    const isPlaying = e.data === 1;
                    const expectedState = youtubeStateRef.current;
                    // Éviter la boucle d'écho : on n'émet que si notre action contredit l'état serveur connu
                    if (expectedState && expectedState.isPlaying !== isPlaying) {
                      socketRef.current?.emit('YOUTUBE_COMMAND', {
                        type: 'SYNC',
                        isPlaying,
                        playbackTime: e.target.getCurrentTime()
                      });
                      youtubeStateRef.current = { ...expectedState, isPlaying };
                    }
                  }
                }}
              />
            )}
          </div>
        </div>

        {showCheatPanel && (
          <CheatPanel
            onClose={() => setShowCheatPanel(false)}
            onEquipSword={() => {
              if (gameRef.current) {
                gameRef.current.equipSword();
                setHasWeapon(true);
              }
            }}
          />
        )}

        {hasWeapon && (
          <button 
            onClick={() => {
              if (gameRef.current) gameRef.current.unequipSword();
              setHasWeapon(false);
            }}
            style={{ 
              position: 'absolute', bottom: '80px', left: '50%', transform: 'translateX(-50%)', 
              zIndex: 100, padding: '10px 20px', borderRadius: '20px', 
              background: 'rgba(239, 68, 68, 0.9)', color: 'white', fontWeight: 'bold', 
              border: 'none', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
              fontSize: '14px', transition: 'transform 0.1s'
            }}
            onMouseOver={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(1.05)')}
            onMouseOut={(e) => (e.currentTarget.style.transform = 'translateX(-50%) scale(1)')}
          >
            🖐️ Ranger l'Épée
          </button>
        )}

        {isBuildMode && (
          <div className="admin-build-toolbar" style={{
            position: 'absolute', top: menuPos.y, left: menuPos.x, bottom: menuPos.y === 0 ? 0 : 'auto', zIndex: 1000,
            background: 'rgba(30, 31, 34, 0.95)', padding: '20px',
            width: '320px', height: menuPos.y === 0 ? 'auto' : '85vh', overflowY: 'auto',
            color: 'white', border: '1px solid #444', borderRadius: menuPos.y === 0 ? 0 : '10px',
            display: 'flex', flexDirection: 'column',
            boxShadow: '4px 4px 15px rgba(0,0,0,0.5)'
          }}>
            <h3 
              onMouseDown={(e) => {
                setIsDraggingMenu(true);
                dragMenuOffsetRef.current = { x: e.clientX - menuPos.x, y: e.clientY - menuPos.y };
              }}
              style={{ 
                marginTop: 0, borderBottom: '1px solid #444', paddingBottom: 10, textAlign: 'center', 
                cursor: 'grab', userSelect: 'none' 
              }}
            >
              Outils de Construction
            </h3>
            <p style={{ fontSize: '12px', color: '#aaa', textAlign: 'center' }}>Sélectionnez un élément, puis cliquez sur la carte pour le placer/supprimer.</p>
            <p style={{ fontSize: '13px', color: '#f1c40f', textAlign: 'center', fontWeight: 'bold' }}>
              Rotation actuelle: {buildRotation}° (Appuyez sur 'R')
            </p>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
              <button
                style={{
                  flex: 1, padding: '10px', background: selectedFurniture === 'MOVE' ? '#3ba55c' : '#2b2d31',
                  color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer',
                  fontWeight: 'bold', textAlign: 'center'
                }}
                onClick={() => setSelectedFurniture('MOVE')}
              >
                Déplacer
              </button>
              <button
                style={{
                  flex: 1, padding: '10px', background: selectedFurniture === 'DELETE' ? '#e74c3c' : '#2b2d31',
                  color: 'white', border: '1px solid #444', borderRadius: '5px', cursor: 'pointer',
                  fontWeight: 'bold', textAlign: 'center'
                }}
                onClick={() => setSelectedFurniture('DELETE')}
              >
                Supprimer
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px' }}>
              {furnitureTypes.map(f => (
                <button
                  key={f}
                  style={{
                    padding: '8px 5px', fontSize: '11px',
                    background: selectedFurniture === f ? '#5865F2' : '#2b2d31',
                    color: 'white', border: '1px solid #444', borderRadius: '3px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                  }}
                  onClick={() => setSelectedFurniture(f)}
                >
                  {(() => {
                    try {
                      let c = (gameRef.current as any)?.assets?.furniture?.[f];
                      if (!c) c = (gameRef.current as any)?.sprites?.[f];
                      
                      if (c) {
                        if (typeof c.toDataURL === 'function') {
                          return <img src={c.toDataURL()} style={{ width: 20, height: 20, objectFit: 'contain' }} alt="" />;
                        } else if (c.canvas && typeof c.canvas.toDataURL === 'function') {
                          return <img src={c.canvas.toDataURL()} style={{ width: 20, height: 20, objectFit: 'contain' }} alt="" />;
                        }
                      }
                    } catch (e) {
                      console.error("Preview render error", e);
                    }
                    return null;
                  })()}
                  <span>{furnitureNames[f] || f}</span>
                </button>
              ))}
            </div>
            <div style={{ marginTop: 15, fontSize: '11px', color: '#ff5555', textAlign: 'center' }}>
              Note: Les collisions s'appliquent immédiatement pour tout le monde.
            </div>
            <div style={{ flexGrow: 1 }}></div>
            <button
              onClick={() => setIsBuildMode(false)}
              style={{
                padding: '12px', background: '#e74c3c',
                color: 'white', border: 'none', borderRadius: '5px', cursor: 'pointer',
                fontWeight: 'bold', marginTop: '20px', textAlign: 'center'
              }}
            >
              Quitter Mode Construction
            </button>
          </div>
        )}

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

      {showWhiteboard && (
        <WhiteboardModal
          socket={socketRef.current}
          initialLines={whiteboardLines}
          onClose={() => setShowWhiteboard(false)}
          onDrawLocally={(line) => setWhiteboardLines((prev) => [...prev, line])}
          onClearLocally={() => setWhiteboardLines([])}
        />
      )}

      {showImageBoard && (
        <ImageBoardModal
          boardId={showImageBoard}
          currentImage={imageBoards[showImageBoard] || null}
          onUpload={(boardId, image) => {
            setImageBoards(prev => ({ ...prev, [boardId]: image }));
            socketRef.current?.emit('IMAGEBOARD_UPDATE', { boardId, image });
          }}
          onClose={() => setShowImageBoard(null)}
        />
      )}
    </div>
  );
};

export default MapComponent;
