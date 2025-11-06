import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Seat, Desk, Zone, ZoneType } from '../types';
import { Users, Utensils } from 'lucide-react';
import { meetingRooms } from '../data/officeLayout';

// Custom Toilet Seat Icon
const ToiletIcon = ({ size = 20, style = {} }: { size?: number; style?: React.CSSProperties }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    style={style}
  >
    {/* Toilet bowl outer rim */}
    <ellipse cx="12" cy="16" rx="7" ry="4" />
    {/* Toilet bowl inner */}
    <ellipse cx="12" cy="16" rx="4.5" ry="2.5" fill="currentColor" opacity="0.2" />
    {/* Toilet seat */}
    <path d="M 5 12 Q 5 8 12 8 Q 19 8 19 12" />
    <path d="M 5 12 Q 5 14 7 15" />
    <path d="M 19 12 Q 19 14 17 15" />
    {/* Tank */}
    <rect x="9" y="3" width="6" height="5" rx="1" />
  </svg>
);

interface SeatMapProps {
  seats: Seat[];
  desks?: Desk[]; // Optional desk data for enhanced display
  zones: Zone[];
  onSeatSelect: (seat: Seat) => void;
  recommendedSeats: string[];
  selectedSeat?: Seat;
  showZones: boolean;
}

const MapContainer = styled.div`
  position: relative;
  width: 100%;
  max-width: 1500px;
  height: 800px;
  max-height: 800px;
  border: 2px solid #333;
  background-color: white;
  overflow-y: scroll;
  overflow-x: auto;
`;

const MapContent = styled.div`
  position: relative;
  width: 1500px;
  height: 1900px;
  min-height: 1900px;
`;

const MapHeader = styled.div`
  position: absolute;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(59, 130, 246, 0.1);
  border: 1px solid #3b82f6;
  border-radius: 8px;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #1e40af;
  text-align: center;
  z-index: 200;
`;

const MeetingRoomBox = styled.div`
  position: absolute;
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border: 2px solid #3b82f6;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #1e40af;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.2);
  padding: 8px;
  text-align: center;
`;

const FacilityBox = styled.div<{ facilityType: string }>`
  position: absolute;
  background: ${props => {
    switch (props.facilityType) {
      case 'kitchenette': return 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)';
      case 'bathroom': return 'linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)';
      case 'printer': return 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)';
      case 'elevator': return 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)';
      default: return 'linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.facilityType) {
      case 'kitchenette': return '#f59e0b';
      case 'bathroom': return '#6366f1';
      case 'printer': return '#a855f7';
      case 'elevator': return '#6b7280';
      default: return '#9ca3af';
    }
  }};
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: ${props => {
    switch (props.facilityType) {
      case 'kitchenette': return '#92400e';
      case 'bathroom': return '#3730a3';
      case 'printer': return '#6b21a8';
      case 'elevator': return '#374151';
      default: return '#4b5563';
    }
  }};
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  padding: 8px;
  text-align: center;
`;

const ZoneLabel = styled.div`
  position: absolute;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid #10b981;
  border-radius: 8px;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #059669;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.2);
  backdrop-filter: blur(4px);
  pointer-events: none;
`;

const TeamZoneBorder = styled.div<{ team: string }>`
  position: absolute;
  border: 3px solid ${props => {
    // Different border colors for different teams
    switch (props.team) {
      case 'Risk': return '#ef4444';
      case 'Product': return '#f59e0b';
      case 'Engineering': return '#3b82f6';
      case 'Reserved': return '#8b5cf6';
      case 'IT Security': return '#06b6d4';
      case 'DevOps': return '#10b981';
      default: return '#6b7280';
    }
  }};
  border-radius: 16px;
  background: ${props => {
    switch (props.team) {
      case 'Risk': return 'rgba(239, 68, 68, 0.03)';
      case 'Product': return 'rgba(245, 158, 11, 0.03)';
      case 'Engineering': return 'rgba(59, 130, 246, 0.03)';
      case 'Reserved': return 'rgba(139, 92, 246, 0.03)';
      case 'IT Security': return 'rgba(6, 182, 212, 0.03)';
      case 'DevOps': return 'rgba(16, 185, 129, 0.03)';
      default: return 'rgba(107, 114, 128, 0.03)';
    }
  }};
  pointer-events: none;
  z-index: 0;
  box-shadow: inset 0 0 0 1px ${props => {
    switch (props.team) {
      case 'Risk': return 'rgba(239, 68, 68, 0.1)';
      case 'Product': return 'rgba(245, 158, 11, 0.1)';
      case 'Engineering': return 'rgba(59, 130, 246, 0.1)';
      case 'Reserved': return 'rgba(139, 92, 246, 0.1)';
      case 'IT Security': return 'rgba(6, 182, 212, 0.1)';
      case 'DevOps': return 'rgba(16, 185, 129, 0.1)';
      default: return 'rgba(107, 114, 128, 0.1)';
    }
  }};
`;

const LeanDesk = styled.div`
  position: absolute;
  height: 12px;
  background: linear-gradient(180deg, #8b4513 0%, #654321 100%);
  border: 1px solid #5a3a1a;
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2), inset 0 1px 2px rgba(255, 255, 255, 0.1);
  pointer-events: none;
  z-index: 1;
`;

const SeatElement = styled(motion.div)<{ 
  isAvailable: boolean; 
  isSelected: boolean; 
  isRecommended: boolean;
  zone: ZoneType;
  team?: string;
}>`
  position: absolute;
  width: 50px;
  height: 50px;
  cursor: ${props => props.isAvailable ? 'pointer' : 'not-allowed'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4px;
  font-size: 8px;
  font-weight: 700;
  transition: all 0.3s ease;
  z-index: 1;
  
  /* Office Chair - Backrest */
  &::before {
    content: '';
    position: absolute;
    top: -2px;
    width: 32px;
    height: 18px;
    background: ${props => {
      if (props.isSelected) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
      if (!props.isAvailable) return 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)';
      if (props.isRecommended) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
      return 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)';
    }};
    border: 2px solid ${props => {
      if (props.isSelected) return '#4f46e5';
      if (props.isRecommended) return '#059669';
      if (!props.isAvailable) return '#4b5563';
      return '#1e40af';
    }};
    border-radius: 8px 8px 4px 4px;
    box-shadow: ${props => {
      if (props.isSelected) return '0 2px 8px rgba(79, 70, 229, 0.4)';
      if (props.isRecommended) return '0 2px 8px rgba(16, 185, 129, 0.3)';
      return '0 2px 6px rgba(0, 0, 0, 0.15)';
    }};
  }
  
  /* Office Chair - Seat */
  &::after {
    content: '';
    position: absolute;
    top: 14px;
    width: 36px;
    height: 20px;
    background: ${props => {
      if (props.isSelected) return 'linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)';
      if (!props.isAvailable) return 'linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)';
      if (props.isRecommended) return 'linear-gradient(135deg, #34d399 0%, #10b981 100%)';
      return 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)';
    }};
    border: 2px solid ${props => {
      if (props.isSelected) return '#6d28d9';
      if (props.isRecommended) return '#047857';
      if (!props.isAvailable) return '#6b7280';
      return '#2563eb';
    }};
    border-radius: 6px;
    box-shadow: ${props => {
      if (props.isSelected) return '0 4px 12px rgba(139, 92, 246, 0.5)';
      if (props.isRecommended) return '0 4px 12px rgba(16, 185, 129, 0.4)';
      return '0 3px 10px rgba(0, 0, 0, 0.2)';
    }};
  }
  
  color: ${props => {
    if (props.isSelected) return 'white';
    if (props.isRecommended) return 'white';
    if (!props.isAvailable) return '#4b5563';
    return '#1e3a8a';
  }};

  &:hover {
    transform: ${props => props.isAvailable ? 'translateY(-4px) scale(1.08)' : 'none'};
    z-index: 10;
    
    &::before {
      box-shadow: ${props => props.isAvailable ? '0 4px 14px rgba(0, 0, 0, 0.25)' : '0 2px 6px rgba(0, 0, 0, 0.15)'};
    }
    
    &::after {
      box-shadow: ${props => {
        if (props.isAvailable && props.isSelected) return '0 6px 18px rgba(139, 92, 246, 0.6)';
        if (props.isAvailable && props.isRecommended) return '0 6px 18px rgba(16, 185, 129, 0.5)';
        if (props.isAvailable) return '0 5px 16px rgba(0, 0, 0, 0.3)';
        return '0 3px 10px rgba(0, 0, 0, 0.2)';
      }};
    }
  }
`;

const SeatTooltip = styled(motion.div)`
  position: fixed;
  background: linear-gradient(135deg, #1f2937 0%, #111827 100%);
  color: white;
  padding: 16px;
  border-radius: 12px;
  font-size: 13px;
  pointer-events: none;
  z-index: 10000;
  max-width: 320px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.1);
  line-height: 1.6;
  
  > div {
    margin: 4px 0;
  }
  
  strong {
    color: #10b981;
    font-size: 14px;
  }
`;

const Legend = styled.div`
  position: absolute;
  top: 16px;
  right: 16px;
  background: rgba(255, 255, 255, 0.98);
  padding: 16px;
  border-radius: 12px;
  font-size: 13px;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid rgba(0, 0, 0, 0.05);
  backdrop-filter: blur(10px);
  z-index: 100;
`;

const LegendItem = styled.div`
  display: flex;
  align-items: center;
  margin: 6px 0;
  font-weight: 500;
  
  &::before {
    content: '';
    width: 16px;
    height: 16px;
    border-radius: 4px;
    margin-right: 10px;
    background: ${props => props.color};
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  }
`;

export const SeatMap: React.FC<SeatMapProps> = ({
  seats,
  desks,
  zones,
  onSeatSelect,
  recommendedSeats,
  selectedSeat,
  showZones
}) => {
  const [hoveredSeat, setHoveredSeat] = useState<Seat | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  // Helper to find desk for a seat
  const getDeskForSeat = (seat: Seat): Desk | undefined => {
    if (!desks) return undefined;
    return desks.find(d => d.legacySeatId === seat.id || d.desk_id === seat.id);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    setMousePosition({ x: e.clientX, y: e.clientY });
  };

  return (
    <MapContainer onMouseMove={handleMouseMove}>
      <MapContent>
      {/* Map Header */}
      <MapHeader>
        📍 Office Floor Plan - CRT Floor
      </MapHeader>
      
      {/* Meeting Rooms - positioned dynamically */}
      {meetingRooms.map((room: any, idx: number) => {
        // Position Meron meeting room below Engineering(SW)
        const isMeron = room.name === 'Meron';
        const meronPosition = isMeron ? { left: 100, top: 1600 } : null;
        
        // Position Yarkon meeting room below Engineering(S) aligned to left
        const isYarkon = room.name === 'Yarkon';
        const yarkonPosition = isYarkon ? { left: 340, top: 1700 } : null;
        
        // Position Negev meeting room above Engineering(S) aligned to left
        // With 60px gap from Engineering(S) border
        const isNegev = room.name === 'Negev';
        const negevPosition = isNegev ? { left: 370, top: 1298 } : null;
        
        // Position Timna meeting room above Negev with minimal space
        const isTimna = room.name === 'Timna';
        const timnaPosition = isTimna ? { left: 370, top: 1198 } : null;
        
        // Position Ramon meeting room - top aligns with Product(W) top Y position
        const isRamon = room.name === 'Ramon';
        const ramonPosition = isRamon ? { left: 370, top: 800 } : null;
        
        // Position Nursing room above Ramon with minimal space
        const isNursing = room.name === 'Nursing Room';
        const nursingPosition = isNursing ? { left: 370, top: 700 } : null;
        
        // Position Gilboa above Nursing Room with minimal space
        const isGilboa = room.name === 'Gilboa';
        const gilboaPosition = isGilboa ? { left: 370, top: 600 } : null;
        
        // Position Arbel to the right of Gilboa with minimal space
        const isArbel = room.name === 'Arbel';
        const arbelPosition = isArbel ? { left: 515, top: 600 } : null;
        
        // Position Tavor above Gilboa - aligned with row 3 Risk(NW) y axis
        const isTavor = room.name === 'Tavor';
        const tavorPosition = isTavor ? { left: 370, top: 460 } : null;
        
        // Position Hermon above Tavor with minimal space (vertical orientation, height 140px)
        const isHermon = room.name === 'Hermon';
        const hermonPosition = isHermon ? { left: 370, top: 310 } : null;
        
        // Position Dan above Reserved(S) with 60px gap from border (square shaped)
        const isDan = room.name === 'Dan';
        const danPosition = isDan ? { left: 880, top: 1298 } : null;
        
        // Position Carmel to the right of Reserved(S) - vertical orientation, minimal padding, aligned with top border
        const isCarmel = room.name === 'Carmel';
        const carmelPosition = isCarmel ? { left: 1140, top: 1448 } : null;
        
        // Position Golan to the left of DevOps(E) bottom 2 rows, above Carmel, right-aligned with Carmel
        const isGolan = room.name === 'Golan';
        const golanPosition = isGolan ? { left: 1090, top: 875 } : null;
        
        // Hermon and Carmel have vertical orientation, Dan is square, Carmel stretched to align with Reserved(S) bottom
        const roomWidth = isDan ? 90 : (isHermon || isCarmel) ? 90 : (room.capacity >= 10 ? 200 : (room.capacity >= 6 ? 170 : 140));
        const roomHeight = isDan ? 90 : isCarmel ? 300 : isHermon ? 140 : 90;
        
        return (
          <MeetingRoomBox
            key={room.id}
            style={{
              left: meronPosition?.left ?? yarkonPosition?.left ?? negevPosition?.left ?? timnaPosition?.left ?? ramonPosition?.left ?? nursingPosition?.left ?? gilboaPosition?.left ?? arbelPosition?.left ?? tavorPosition?.left ?? hermonPosition?.left ?? danPosition?.left ?? carmelPosition?.left ?? golanPosition?.left ?? (50 + (idx % 4) * 220),
              top: meronPosition?.top ?? yarkonPosition?.top ?? negevPosition?.top ?? timnaPosition?.top ?? ramonPosition?.top ?? nursingPosition?.top ?? gilboaPosition?.top ?? arbelPosition?.top ?? tavorPosition?.top ?? hermonPosition?.top ?? danPosition?.top ?? carmelPosition?.top ?? golanPosition?.top ?? 60,
              width: roomWidth,
              height: roomHeight
            }}
          >
            <Users size={20} style={{ marginBottom: 4 }} />
            <div>{room.name}</div>
            <div style={{ fontSize: '10px', opacity: 0.7 }}>Cap: {room.capacity}</div>
            <div style={{ fontSize: '9px', opacity: 0.6 }}>{room.zone}</div>
          </MeetingRoomBox>
        );
      })}

      {/* Facilities - positioned around the perimeter */}
      <FacilityBox
        facilityType="kitchenette"
        style={{
          left: 880,
          top: 300,
          width: 380,
          height: 390
        }}
      >
        <Utensils size={20} style={{ marginBottom: 4 }} />
        <div>Cafeteria</div>
      </FacilityBox>
      
      <FacilityBox
        facilityType="bathroom"
        style={{
          left: 550,
          top: 1198,
          width: 270,
          height: 90
        }}
      >
        <ToiletIcon size={20} style={{ marginBottom: 4 }} />
        <div>Men Bathroom</div>
      </FacilityBox>
      
      <FacilityBox
        facilityType="bathroom"
        style={{
          left: 520,
          top: 1298,
          width: 300,
          height: 90
        }}
      >
        <ToiletIcon size={20} style={{ marginBottom: 4 }} />
        <div>Women Bathroom</div>
      </FacilityBox>
      
      <FacilityBox
        facilityType="kitchenette"
        style={{
          left: 980,
          top: 1298,
          width: 110,
          height: 80
        }}
      >
        <Utensils size={20} style={{ marginBottom: 4 }} />
        <div>Kitchenette</div>
      </FacilityBox>
      
      {/* Team Zone Borders - with padding for spacing */}
      {desks && (() => {
        // Group desks by team-zone combination (e.g., "Risk-NW", "Engineering-S")
        const teamZoneGroups = desks.reduce((acc, desk) => {
          const key = `${desk.team}-${desk.zone}`;
          if (!acc[key]) acc[key] = { team: desk.team, zone: desk.zone, desks: [] };
          acc[key].desks.push(desk);
          return acc;
        }, {} as Record<string, { team: string; zone: string; desks: typeof desks }>);
        
        return Object.entries(teamZoneGroups).map(([key, group]) => {
          if (group.desks.length === 0) return null;
          
          const minX = Math.min(...group.desks.map(d => d.coordinates.x));
          const maxX = Math.max(...group.desks.map(d => d.coordinates.x));
          const minY = Math.min(...group.desks.map(d => d.coordinates.y));
          const maxY = Math.max(...group.desks.map(d => d.coordinates.y));
          
          // Border dimensions accounting for seat structure
          const padding = 15;
          const deskWidth = 50;
          const backrestOffset = 2; // Backrest starts 2px above the element (top: -2px)
          const seatBottom = 34; // Seat ends at top: 14px + height: 20px
          const yOffset = 200; // Match the offset applied to seats in App.tsx
          
          return (
            <TeamZoneBorder 
              key={key} 
              team={group.team}
              style={{ 
                left: minX - padding,
                top: minY + yOffset - padding - backrestOffset, // Account for backrest position and y-offset
                width: (maxX - minX) + deskWidth + (padding * 2),
                height: (maxY - minY) + seatBottom + (padding * 2) + backrestOffset
              }}
            />
          );
        });
      })()}
      
      {/* Zone/Team Labels - positioned at top-left of each team-zone border */}
      {desks && (() => {
        // Group desks by team-zone combination
        const teamZoneGroups = desks.reduce((acc, desk) => {
          const key = `${desk.team}-${desk.zone}`;
          if (!acc[key]) acc[key] = { team: desk.team, zone: desk.zone, desks: [] };
          acc[key].desks.push(desk);
          return acc;
        }, {} as Record<string, { team: string; zone: string; desks: typeof desks }>);
        
        return Object.entries(teamZoneGroups).map(([key, group]) => {
          if (group.desks.length === 0) return null;
          
          const minX = Math.min(...group.desks.map(d => d.coordinates.x));
          const minY = Math.min(...group.desks.map(d => d.coordinates.y));
          
          const padding = 15;
          const backrestOffset = 2;
          const yOffset = 200;
          const labelHeight = 20; // Approximate label height
          
          return (
            <ZoneLabel 
              key={key} 
              style={{ 
                left: minX - padding + 5, // 5px inside from left border
                top: minY + yOffset - padding - backrestOffset - labelHeight, // Position above border
                zIndex: 2
              }}
            >
              {group.team}
            </ZoneLabel>
          );
        });
      })()}

      {/* Lean Desks between rows */}
      {desks && (() => {
        const teamZoneGroups = desks.reduce((acc, desk) => {
          const key = `${desk.team}-${desk.zone}`;
          if (!acc[key]) acc[key] = { team: desk.team, zone: desk.zone, desks: [] };
          acc[key].desks.push(desk);
          return acc;
        }, {} as Record<string, { team: string; zone: string; desks: typeof desks }>);
        
        return Object.entries(teamZoneGroups).flatMap(([key, group]) => {
          if (group.desks.length === 0) return [];
          
          // Get unique Y coordinates (rows)
          const yCoords = Array.from(new Set(group.desks.map(d => d.coordinates.y))).sort((a, b) => a - b);
          
          if (yCoords.length < 2) return []; // Need at least 2 rows
          
          // Get X range for the desks
          const minX = Math.min(...group.desks.map(d => d.coordinates.x));
          const maxX = Math.max(...group.desks.map(d => d.coordinates.x));
          
          const yOffset = 200; // From App.tsx
          
          // Create lean desks between pairs of rows
          // Rows are paired: (0,1), (2,3), (4,5), etc.
          // Lean desks go between pairs: between (1,2), (3,4), (5,6), etc.
          const leanDesks = [];
          for (let i = 1; i < yCoords.length - 1; i += 2) {
            const y1 = yCoords[i];     // Last row of current pair
            const y2 = yCoords[i + 1]; // First row of next pair
            const midY = (y1 + y2) / 2;
            
            leanDesks.push(
              <LeanDesk
                key={`${key}-lean-${i}`}
                style={{
                  left: minX,
                  top: midY + yOffset,
                  width: maxX - minX + 50 // Span across the zone width (50px is desk width)
                }}
              />
            );
          }
          
          return leanDesks;
        });
      })()}

      {/* Seats/Desks */}
      {seats.map(seat => {
        const desk = getDeskForSeat(seat);
        const isReservedTeam = desk?.team === 'Reserved';
        const canSelect = seat.isAvailable && !isReservedTeam;
        return (
          <SeatElement
            key={seat.id}
            isAvailable={canSelect}
            isSelected={selectedSeat?.id === seat.id}
            isRecommended={recommendedSeats.includes(seat.id)}
            zone={seat.zone}
            team={desk?.team}
            style={{ left: seat.x, top: seat.y }}
            onMouseEnter={() => setHoveredSeat(seat)}
            onMouseLeave={() => setHoveredSeat(null)}
            onClick={() => canSelect && onSeatSelect(seat)}
            whileHover={{ scale: canSelect ? 1.05 : 1 }}
            whileTap={{ scale: canSelect ? 0.95 : 1 }}
          >
            {desk && (
              <div style={{ 
                fontSize: '7px', 
                fontWeight: 700, 
                lineHeight: 1, 
                textAlign: 'center',
                position: 'relative',
                zIndex: 2,
                textShadow: '0 1px 2px rgba(255,255,255,0.8)',
                marginTop: '32px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                maxWidth: '46px'
              }}>
                {desk.team}
              </div>
            )}
          </SeatElement>
        );
      })}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredSeat && (() => {
          const desk = getDeskForSeat(hoveredSeat);
          return (
            <SeatTooltip
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 10 }}
              style={{
                left: Math.min(mousePosition.x + 20, window.innerWidth - 360),
                top: Math.min(mousePosition.y + 20, window.innerHeight - 400),
              }}
            >
              <div style={{ marginBottom: '8px' }}>
                <strong>{desk ? `🪑 ${desk.desk_id}` : `Seat ${hoveredSeat.id}`}</strong>
              </div>
              
              {desk && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: '8px', marginBottom: '12px' }}>
                    <span style={{ opacity: 0.7 }}>Team:</span>
                    <span style={{ fontWeight: 600 }}>{desk.team}</span>
                    
                    <span style={{ opacity: 0.7 }}>Zone:</span>
                    <span>{desk.zone}</span>
                    
                    <span style={{ opacity: 0.7 }}>Floor:</span>
                    <span>{desk.floor}</span>
                    
                    <span style={{ opacity: 0.7 }}>Status:</span>
                    <span style={{ 
                      color: desk.status === 'available' ? '#10b981' : '#ef4444',
                      fontWeight: 600,
                      textTransform: 'capitalize'
                    }}>{desk.status}</span>
                  </div>
                  
                  {desk.reserved_for && (
                    <div style={{ marginBottom: '8px', padding: '6px 10px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '12px' }}>
                      Reserved: {desk.reserved_for}
                    </div>
                  )}
                  
                  {desk.equipment.length > 0 && (
                    <div style={{ marginBottom: '8px' }}>
                      <div style={{ opacity: 0.7, fontSize: '11px', marginBottom: '4px' }}>EQUIPMENT</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                        {desk.equipment.map((eq, i) => (
                          <span key={i} style={{ 
                            background: 'rgba(16, 185, 129, 0.2)', 
                            padding: '2px 8px', 
                            borderRadius: '4px', 
                            fontSize: '11px',
                            color: '#10b981'
                          }}>
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ opacity: 0.7, fontSize: '11px', marginBottom: '6px' }}>NEARBY AMENITIES</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px' }}>
                      {desk.nearby.meeting_rooms.length > 0 && (
                        <div>✓ Meeting rooms</div>
                      )}
                      {desk.nearby.window && <div>✓ Window view</div>}
                      {desk.nearby.bathroom && <div>✓ Bathroom</div>}
                      {desk.nearby.kitchenette && <div>✓ Kitchenette</div>}
                      {desk.nearby.shower && <div>✓ Shower</div>}
                      {desk.nearby.elevator && <div>✓ Elevator</div>}
                      {desk.nearby.cafeteria && <div>✓ Cafeteria</div>}
                    </div>
                  </div>
                  
                  {desk.notes && (
                    <div style={{ 
                      marginTop: '12px', 
                      padding: '8px', 
                      background: 'rgba(59, 130, 246, 0.2)', 
                      borderRadius: '6px', 
                      fontSize: '12px',
                      fontStyle: 'italic',
                      color: '#93c5fd'
                    }}>
                      💡 {desk.notes}
                    </div>
                  )}
                </>
              )}
              
              {!desk && (
                <>
                  <div>Zone: {hoveredSeat.zone}</div>
                  <div>Status: {hoveredSeat.isAvailable ? '✓ Available' : '✗ Occupied'}</div>
                  {hoveredSeat.currentUser && <div>User: {hoveredSeat.currentUser}</div>}
                  {hoveredSeat.features.length > 0 && (
                    <div>Features: {hoveredSeat.features.map(f => f.label).join(', ')}</div>
                  )}
                </>
              )}
            </SeatTooltip>
          );
        })()}
      </AnimatePresence>

      {/* Legend */}
      <Legend>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Desk Status</div>
        <LegendItem color="linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)">Available</LegendItem>
        <LegendItem color="linear-gradient(135deg, #34d399 0%, #10b981 100%)">Recommended</LegendItem>
        <LegendItem color="linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)">Selected</LegendItem>
        <LegendItem color="linear-gradient(135deg, #d1d5db 0%, #9ca3af 100%)">Occupied</LegendItem>
      </Legend>
      </MapContent>
    </MapContainer>
  );
};