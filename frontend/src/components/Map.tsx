import React, { useEffect, useRef } from 'react';
import * as Phaser from 'phaser';
import MainScene from '../game/scenes/MainScene';
import { socket } from '../socket';

export const MapComponent: React.FC = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || gameRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: 800,
      height: 800,
      parent: containerRef.current,
      scene: [MainScene],
      backgroundColor: '#36393f',
    };

    gameRef.current = new Phaser.Game(config);

    // Lier Socket.IO aux événements de la scène
    socket.connect();

    socket.on('initial_state', (data: any) => {
      console.log('État initial reçu', data);
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (scene && scene.updateAvatar) {
        data.activeUsers.forEach((user: any) => {
          scene.updateAvatar(user.userId, user.username, user.channelId, user.avatarUrl);
        });
      }
    });

    socket.on('virtual_world_event', (event: any) => {
      console.log('Événement reçu', event);
      const scene = gameRef.current?.scene.getScene('MainScene') as MainScene;
      if (!scene) return;

      const { type, data } = event;
      if (type === 'USER_JOIN_VOICE' || type === 'USER_MOVE') {
        scene.updateAvatar(data.userId, data.username, data.channelId || data.newChannelId, data.avatarUrl);
      } else if (type === 'USER_LEAVE_VOICE') {
        scene.removeAvatar(data.userId);
      }
    });

    return () => {
      socket.disconnect();
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', width: '100%', minHeight: '100vh', backgroundColor: '#202225', padding: '20px' }}>
      <h1 style={{ color: 'white', fontSize: '2rem', fontWeight: 'bold', marginBottom: '20px', fontFamily: 'sans-serif' }}>Discord Virtual World</h1>
      <div 
        ref={containerRef} 
        style={{ width: 800, height: 800, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)', border: '4px solid #2f3136' }}
      />
    </div>
  );
};
