import React, { useRef, useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { setActiveStation } from '../store/stationStore';
import { StationType } from '../types';
import { Engineering } from '../stations/Engineering';
import { Weapons } from '../stations/Weapons';

/*const playerStations: Record<Player, StationType[]> = {
  'Gobi': ['Engineering', 'Weapons'],
  'Ben': ['Navigation', 'Science'],
};*/
const allStations: StationType[] = ['Navigation', 'Science', 'Weapons', 'Engineering']

interface StationCanvasProps {
  station: StationType;
}

const DefaultStationCanvas: React.FC<StationCanvasProps> = ({ station }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#1F2937';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw station name
    ctx.fillStyle = '#E5E7EB';
    ctx.font = '24px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(station, canvas.width / 2, canvas.height / 2);

    // Draw decorative elements based on station type
    ctx.strokeStyle = '#6B7280';
    ctx.lineWidth = 2;
    
    switch (station) {
      case 'Engineering':
        // Draw gear-like pattern
        for (let i = 0; i < 8; i++) {
          const angle = (i * Math.PI) / 4;
          const x1 = canvas.width / 2 + Math.cos(angle) * 60;
          const y1 = canvas.height / 2 + Math.sin(angle) * 60;
          const x2 = canvas.width / 2 + Math.cos(angle) * 80;
          const y2 = canvas.height / 2 + Math.sin(angle) * 80;
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }
        break;
        
      case 'Navigation':
        // Draw compass-like pattern
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 60, 0, Math.PI * 2);
        ctx.stroke();
        
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2 - 60);
        ctx.lineTo(canvas.width / 2, canvas.height / 2 + 60);
        ctx.moveTo(canvas.width / 2 - 60, canvas.height / 2);
        ctx.lineTo(canvas.width / 2 + 60, canvas.height / 2);
        ctx.stroke();
        break;
        
      case 'Weapons':
        // Draw crosshair pattern
        ctx.beginPath();
        ctx.arc(canvas.width / 2, canvas.height / 2, 50, 0, Math.PI * 2);
        ctx.arc(canvas.width / 2, canvas.height / 2, 70, 0, Math.PI * 2);
        ctx.moveTo(canvas.width / 2 - 80, canvas.height / 2);
        ctx.lineTo(canvas.width / 2 + 80, canvas.height / 2);
        ctx.moveTo(canvas.width / 2, canvas.height / 2 - 80);
        ctx.lineTo(canvas.width / 2, canvas.height / 2 + 80);
        ctx.stroke();
        break;
        
      case 'Science':
        // Draw molecular pattern
        for (let i = 0; i < 6; i++) {
          const angle = (i * Math.PI) / 3;
          const x = canvas.width / 2 + Math.cos(angle) * 40;
          const y = canvas.height / 2 + Math.sin(angle) * 40;
          ctx.beginPath();
          ctx.arc(x, y, 8, 0, Math.PI * 2);
          ctx.stroke();
          
          ctx.beginPath();
          ctx.moveTo(canvas.width / 2, canvas.height / 2);
          ctx.lineTo(x, y);
          ctx.stroke();
        }
        break;
    }
  }, [station]);

  return (
    <canvas
      ref={canvasRef}
      width={600}
      height={400}
      className="bg-gray-800 border border-gray-600 rounded"
    />
  );
};

const StationContent: React.FC<{ station: StationType }> = ({ station }) => {
  switch (station) {
    case 'Engineering':
      return <Engineering />;
    case 'Weapons':
      return <Weapons />;
    default:
      return <DefaultStationCanvas station={station} />;
  }
};

export const Stations: React.FC = () => {
  const dispatch = useDispatch();
  const currentPlayer = useSelector((state: RootState) => state.game.currentPlayer);
  const activeStation = useSelector((state: RootState) => state.station.activeStation);

  if (!currentPlayer) return null;

  const availableStations = allStations;

  const handleStationChange = (station: StationType) => {
    dispatch(setActiveStation(station));
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 h-full">
      {/* Station Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {availableStations.map((station) => (
          <button
            key={station}
            onClick={() => handleStationChange(station)}
            className={`px-4 py-2 rounded-t-lg border-t border-l border-r transition-all ${
              activeStation === station
                ? 'bg-gray-700 border-gray-500 text-blue-400'
                : 'bg-gray-800 border-gray-600 text-gray-300 hover:bg-gray-700'
            }`}
            style={{
              clipPath: 'polygon(8px 0%, 100% 0%, calc(100% - 8px) 100%, 0% 100%)'
            }}
          >
            {station}
          </button>
        ))}
      </div>

      {/* Station Content */}
      <div className="flex justify-center items-center h-full">
        <StationContent station={activeStation} />
      </div>
    </div>
  );
};