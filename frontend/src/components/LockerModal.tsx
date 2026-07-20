import React, { useEffect, useRef } from 'react';
import './LockerModal.css';
import { renderSkinPreview } from '../game/OfficeWalkerEngine';

interface LockerModalProps {
  skin: { shirt: string, pants: string, hair: string, gender: string };
  setSkin: (skin: any) => void;
  onSave: () => void;
  onClose: () => void;
}

export const LockerModal: React.FC<LockerModalProps> = ({ skin, setSkin, onSave, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (canvasRef.current) {
      renderSkinPreview(canvasRef.current, skin);
    }
  }, [skin]);

  return (
    <div className="locker-modal-overlay">
      <div className="locker-modal-container">
        <div className="locker-left-panel">
          <canvas ref={canvasRef} width={256} height={384} className="locker-canvas" />
        </div>
        <div className="locker-right-panel">
          <h2 className="locker-title">Casier</h2>
          
          <div className="locker-option">
            <label>Modèle</label>
            <select className="locker-select" value={skin.gender} onChange={(e) => setSkin({ ...skin, gender: e.target.value })}>
              <option value="male">Masculin</option>
              <option value="female">Féminin</option>
            </select>
          </div>

          <div className="locker-option">
            <label>Couleur Cheveux</label>
            <div className="locker-color-picker">
              <input type="color" value={skin.hair} onChange={(e) => setSkin({ ...skin, hair: e.target.value })} />
              <span className="locker-color-hex">{skin.hair.toUpperCase()}</span>
            </div>
          </div>

          <div className="locker-option">
            <label>Couleur Haut</label>
            <div className="locker-color-picker">
              <input type="color" value={skin.shirt} onChange={(e) => setSkin({ ...skin, shirt: e.target.value })} />
              <span className="locker-color-hex">{skin.shirt.toUpperCase()}</span>
            </div>
          </div>

          <div className="locker-option">
            <label>Couleur Bas</label>
            <div className="locker-color-picker">
              <input type="color" value={skin.pants} onChange={(e) => setSkin({ ...skin, pants: e.target.value })} />
              <span className="locker-color-hex">{skin.pants.toUpperCase()}</span>
            </div>
          </div>

          <div className="locker-actions">
            <button className="locker-btn locker-btn-cancel" onClick={onClose}>Annuler</button>
            <button className="locker-btn locker-btn-save" onClick={onSave}>Équiper</button>
          </div>
        </div>
      </div>
    </div>
  );
};
