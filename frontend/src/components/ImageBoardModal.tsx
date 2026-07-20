import React, { useState, useRef } from 'react';
import './ImageBoardModal.css';

interface ImageBoardModalProps {
  boardId: string;
  currentImage: string | null;
  onUpload: (boardId: string, image: string) => void;
  onClose: () => void;
}

export const ImageBoardModal: React.FC<ImageBoardModalProps> = ({ boardId, currentImage, onUpload, onClose }) => {
  const [preview, setPreview] = useState<string | null>(currentImage);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Veuillez sélectionner une image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const src = ev.target?.result as string;
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setPreview(compressedDataUrl);
          onUpload(boardId, compressedDataUrl);
        }
      };
      img.src = src;
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="imageboard-overlay" onClick={onClose}>
      <div className="imageboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="imageboard-header">
          <h2>Tableau d'Image</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="imageboard-content">
          {preview ? (
            <img src={preview} alt="Tableau" className="imageboard-preview" />
          ) : (
            <div className="imageboard-empty">
              <p>Aucune image sur ce tableau</p>
            </div>
          )}
          
          <div className="imageboard-actions">
            <button className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              Importer une image
            </button>
            {preview && (
              <button className="remove-btn" onClick={() => {
                setPreview(null);
                onUpload(boardId, '');
              }}>
                Retirer l'image
              </button>
            )}
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
