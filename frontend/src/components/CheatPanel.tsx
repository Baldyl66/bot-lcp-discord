import React from 'react';
import './CheatPanel.css';

interface CheatPanelProps {
  onClose: () => void;
  onEquipSword: () => void;
  onUnequipSword?: () => void;
}

export const CheatPanel: React.FC<CheatPanelProps> = ({ onClose, onEquipSword }) => {
  return (
    <div className="cheat-panel-overlay">
      <div className="cheat-panel">
        <div className="cheat-panel-header">
          <h2>Panel de Triche Secret 😈</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="cheat-panel-content">
          <p>Bienvenue dans le menu secret. Choisissez un pouvoir :</p>
          <div className="cheat-list">
            <button className="cheat-btn" onClick={() => {
              onEquipSword();
              onClose();
            }}>
              🗡️ Équiper l'Épée d'Exil
            </button>
            <button className="cheat-btn disabled" disabled>
              💰 Mode Riche (Bientôt)
            </button>
            <button className="cheat-btn disabled" disabled>
              🚀 Vitesse x10 (Bientôt)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};