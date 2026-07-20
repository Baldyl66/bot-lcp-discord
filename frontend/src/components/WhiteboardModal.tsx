import React, { useRef, useEffect, useState } from 'react';
import './WhiteboardModal.css';

interface WhiteboardModalProps {
  onClose: () => void;
  socket: any;
  initialLines: any[];
  onDrawLocally?: (line: any) => void;
  onClearLocally?: () => void;
}

export const WhiteboardModal: React.FC<WhiteboardModalProps> = ({ onClose, socket, initialLines, onDrawLocally, onClearLocally }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [lineWidth, setLineWidth] = useState(2);
  const [lines, setLines] = useState<any[]>(initialLines);

  const lastPos = useRef<{x: number, y: number} | null>(null);

  useEffect(() => {
    if (!socket) return;
    
    const handleDraw = (line: any) => {
      setLines((prev) => [...prev, line]);
      drawLine(line);
    };

    const handleClear = () => {
      setLines([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    };

    socket.on('WHITEBOARD_DRAW', handleDraw);
    socket.on('WHITEBOARD_CLEAR', handleClear);

    return () => {
      socket.off('WHITEBOARD_DRAW', handleDraw);
      socket.off('WHITEBOARD_CLEAR', handleClear);
    };
  }, [socket]);

  useEffect(() => {
    // Redraw all lines when the component mounts or lines change initially
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        lines.forEach(drawLine);
      }
    }
  }, []);

  const drawLine = (line: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.beginPath();
    ctx.moveTo(line.startX, line.startY);
    ctx.lineTo(line.endX, line.endY);
    ctx.strokeStyle = line.color;
    ctx.lineWidth = line.width;
    ctx.lineCap = 'round';
    ctx.stroke();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const pos = getCoordinates(e);
    lastPos.current = pos;
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !lastPos.current) return;
    const currentPos = getCoordinates(e);
    if (!currentPos) return;

    const line = {
      startX: lastPos.current.x,
      startY: lastPos.current.y,
      endX: currentPos.x,
      endY: currentPos.y,
      color: color,
      width: lineWidth
    };

    drawLine(line);
    setLines((prev) => [...prev, line]);
    
    if (socket) {
      socket.emit('WHITEBOARD_DRAW', line);
    }
    if (onDrawLocally) {
      onDrawLocally(line);
    }

    lastPos.current = currentPos;
  };

  const stopDrawing = () => {
    setIsDrawing(false);
    lastPos.current = null;
  };

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;

    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearBoard = () => {
    if (socket) {
      socket.emit('WHITEBOARD_CLEAR');
    }
    if (onClearLocally) {
      onClearLocally();
    }
  };

  return (
    <div className="whiteboard-overlay" onClick={onClose}>
      <div className="whiteboard-modal" onClick={(e) => e.stopPropagation()}>
        <div className="whiteboard-header">
          <h2>Tableau Blanc</h2>
          <button className="close-btn" onClick={onClose}>&times;</button>
        </div>
        <div className="whiteboard-toolbar">
          <div className="colors">
            <button className={`color-btn ${color === '#000000' ? 'active' : ''}`} style={{backgroundColor: '#000000'}} onClick={() => setColor('#000000')}></button>
            <button className={`color-btn ${color === '#f44336' ? 'active' : ''}`} style={{backgroundColor: '#f44336'}} onClick={() => setColor('#f44336')}></button>
            <button className={`color-btn ${color === '#2196f3' ? 'active' : ''}`} style={{backgroundColor: '#2196f3'}} onClick={() => setColor('#2196f3')}></button>
            <button className={`color-btn ${color === '#4caf50' ? 'active' : ''}`} style={{backgroundColor: '#4caf50'}} onClick={() => setColor('#4caf50')}></button>
            <button className={`color-btn ${color === '#ffeb3b' ? 'active' : ''}`} style={{backgroundColor: '#ffeb3b'}} onClick={() => setColor('#ffeb3b')}></button>
            <button className={`color-btn ${color === '#ff9800' ? 'active' : ''}`} style={{backgroundColor: '#ff9800'}} onClick={() => setColor('#ff9800')}></button>
            <button className={`color-btn ${color === '#9c27b0' ? 'active' : ''}`} style={{backgroundColor: '#9c27b0'}} onClick={() => setColor('#9c27b0')}></button>
            <button className={`color-btn ${color === '#e91e63' ? 'active' : ''}`} style={{backgroundColor: '#e91e63'}} onClick={() => setColor('#e91e63')}></button>
            <button className={`color-btn ${color === '#795548' ? 'active' : ''}`} style={{backgroundColor: '#795548'}} onClick={() => setColor('#795548')}></button>
            <button className={`color-btn ${color === '#00bcd4' ? 'active' : ''}`} style={{backgroundColor: '#00bcd4'}} onClick={() => setColor('#00bcd4')}></button>
          </div>
          <div className="tools">
            <button className={`tool-btn ${color === '#ffffff' ? 'active' : ''}`} onClick={() => { setColor('#ffffff'); setLineWidth(10); }}>Gomme</button>
            <button className="tool-btn" onClick={() => { setColor('#000000'); setLineWidth(2); }}>Crayon</button>
            <button className="clear-btn" onClick={clearBoard}>Tout effacer</button>
          </div>
        </div>
        <div className="whiteboard-canvas-container">
          <canvas
            ref={canvasRef}
            width={800}
            height={450}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseOut={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>
      </div>
    </div>
  );
};
