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
  max-width: 100%;
  height: 740px;
  border: 2px solid rgba(168, 213, 232, 0.5);
  background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
  overflow: hidden;
  box-shadow:
    0 4px 24px rgba(90, 139, 184, 0.15),
    0 0 0 1px rgba(168, 213, 232, 0.3);
  border-radius: 0;
`;

const MapContent = styled.div`
  position: absolute;
  width: 1500px;
  height: 1900px;
  background-image:
    linear-gradient(rgba(168, 213, 232, 0.15) 1px, transparent 1px),
    linear-gradient(90deg, rgba(168, 213, 232, 0.15) 1px, transparent 1px);
  background-size: 50px 50px;
  transform: scale(0.42);
  transform-origin: center top;
  top: 0;
  left: 50%;
  margin-left: -750px;
  margin-top: 0;
`;

const MapHeader = styled.div`
  position: absolute;
  top: 20px;
  left: 20px;
  background: rgba(255, 255, 255, 0.95);
  border: 1px solid rgba(168, 213, 232, 0.5);
  border-radius: 0;
  padding: 8px 20px;
  font-size: 14px;
  font-weight: 700;
  color: #5a8bb8;
  text-align: left;
  z-index: 200;
  box-shadow:
    0 4px 16px rgba(90, 139, 184, 0.15),
    0 0 0 1px rgba(168, 213, 232, 0.3);
  backdrop-filter: blur(10px);
  text-transform: uppercase;
  letter-spacing: 2px;
`;

const MeetingRoomBox = styled.div`
  position: absolute;
  background: linear-gradient(135deg, rgba(168, 213, 232, 0.25) 0%, rgba(168, 213, 232, 0.15) 100%);
  border: 2px solid rgba(168, 213, 232, 0.6);
  border-radius: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: #5a8bb8;
  box-shadow:
    0 4px 12px rgba(90, 139, 184, 0.2),
    inset 0 0 20px rgba(168, 213, 232, 0.1);
  padding: 8px;
  text-align: center;
  backdrop-filter: blur(5px);
`;

const FacilityBox = styled.div<{ facilityType: string }>`
  position: absolute;
  background: ${props => {
    switch (props.facilityType) {
      case 'kitchenette': return 'linear-gradient(135deg, rgba(245, 197, 182, 0.25) 0%, rgba(245, 197, 182, 0.15) 100%)';
      case 'bathroom': return 'linear-gradient(135deg, rgba(212, 197, 232, 0.25) 0%, rgba(212, 197, 232, 0.15) 100%)';
      case 'printer': return 'linear-gradient(135deg, rgba(232, 197, 212, 0.25) 0%, rgba(232, 197, 212, 0.15) 100%)';
      case 'elevator': return 'linear-gradient(135deg, rgba(197, 232, 212, 0.25) 0%, rgba(197, 232, 212, 0.15) 100%)';
      default: return 'linear-gradient(135deg, rgba(168, 213, 232, 0.25) 0%, rgba(168, 213, 232, 0.15) 100%)';
    }
  }};
  border: 2px solid ${props => {
    switch (props.facilityType) {
      case 'kitchenette': return 'rgba(245, 197, 182, 0.6)';
      case 'bathroom': return 'rgba(212, 197, 232, 0.6)';
      case 'printer': return 'rgba(232, 197, 212, 0.6)';
      case 'elevator': return 'rgba(197, 232, 212, 0.6)';
      default: return 'rgba(168, 213, 232, 0.6)';
    }
  }};
  border-radius: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 600;
  color: ${props => {
    switch (props.facilityType) {
      case 'kitchenette': return '#c89a8b';
      case 'bathroom': return '#8b7ba8';
      case 'printer': return '#c898a8';
      case 'elevator': return '#6ba585';
      default: return '#5a8bb8';
    }
  }};
  box-shadow: 0 4px 12px rgba(90, 139, 184, 0.15);
  padding: 8px;
  text-align: center;
  backdrop-filter: blur(5px);
`;

const ZoneLabel = styled.div`
  position: absolute;
  background: rgba(255, 255, 255, 0.95);
  border: 2px solid rgba(168, 213, 232, 0.6);
  border-radius: 0;
  padding: 6px 12px;
  font-size: 13px;
  font-weight: 700;
  color: #5a8bb8;
  box-shadow:
    0 4px 12px rgba(90, 139, 184, 0.2),
    0 0 20px rgba(168, 213, 232, 0.15);
  backdrop-filter: blur(10px);
  pointer-events: none;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const TeamZoneBorder = styled.div<{ team: string }>`
  position: absolute;
  border: 3px solid ${props => {
    // Different border colors for different teams - pastel versions
    switch (props.team) {
      case 'Risk': return '#e8a8a8';
      case 'Product': return '#f5c5b6';
      case 'Engineering': return '#a8d5e8';
      case 'Reserved': return '#d4c5e8';
      case 'IT Security': return '#a8d8e8';
      case 'DevOps': return '#c5e8d4';
      default: return '#c5d8e8';
    }
  }};
  border-radius: 0;
  background: ${props => {
    switch (props.team) {
      case 'Risk': return 'rgba(232, 168, 168, 0.08)';
      case 'Product': return 'rgba(245, 197, 182, 0.08)';
      case 'Engineering': return 'rgba(168, 213, 232, 0.08)';
      case 'Reserved': return 'rgba(212, 197, 232, 0.08)';
      case 'IT Security': return 'rgba(168, 216, 232, 0.08)';
      case 'DevOps': return 'rgba(197, 232, 212, 0.08)';
      default: return 'rgba(197, 216, 232, 0.08)';
    }
  }};
  pointer-events: none;
  z-index: 0;
  box-shadow: inset 0 0 0 1px ${props => {
    switch (props.team) {
      case 'Risk': return 'rgba(232, 168, 168, 0.15)';
      case 'Product': return 'rgba(245, 197, 182, 0.15)';
      case 'Engineering': return 'rgba(168, 213, 232, 0.15)';
      case 'Reserved': return 'rgba(212, 197, 232, 0.15)';
      case 'IT Security': return 'rgba(168, 216, 232, 0.15)';
      case 'DevOps': return 'rgba(197, 232, 212, 0.15)';
      default: return 'rgba(197, 216, 232, 0.15)';
    }
  }};
`;

const LeanDesk = styled.div`
  position: absolute;
  height: 12px;
  background: linear-gradient(180deg, rgba(168, 213, 232, 0.4) 0%, rgba(168, 213, 232, 0.6) 100%);
  border: 1px solid rgba(168, 213, 232, 0.5);
  border-radius: 0;
  box-shadow:
    0 2px 4px rgba(90, 139, 184, 0.15),
    inset 0 1px 2px rgba(168, 213, 232, 0.2);
  pointer-events: none;
  z-index: 1;
  transform: translateY(-6px);
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
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  z-index: 2;
  border-radius: 0;

  background: ${props => {
    if (props.isSelected) return 'linear-gradient(135deg, rgba(212, 197, 232, 0.8) 0%, rgba(212, 197, 232, 0.9) 100%)';
    if (props.isRecommended) return 'linear-gradient(135deg, rgba(197, 232, 212, 0.8) 0%, rgba(197, 232, 212, 0.9) 100%)';
    if (!props.isAvailable) return 'linear-gradient(135deg, rgba(200, 200, 200, 0.4) 0%, rgba(180, 180, 180, 0.5) 100%)';
    return 'linear-gradient(135deg, rgba(168, 213, 232, 0.7) 0%, rgba(168, 213, 232, 0.8) 100%)';
  }};

  border: 2px solid ${props => {
    if (props.isSelected) return 'rgba(212, 197, 232, 0.9)';
    if (props.isRecommended) return 'rgba(197, 232, 212, 0.9)';
    if (!props.isAvailable) return 'rgba(180, 180, 180, 0.5)';
    return 'rgba(168, 213, 232, 0.8)';
  }};

  box-shadow: ${props => {
    if (props.isSelected) return '0 4px 12px rgba(212, 197, 232, 0.6), 0 0 20px rgba(212, 197, 232, 0.3)';
    if (props.isRecommended) return '0 4px 12px rgba(197, 232, 212, 0.6), 0 0 20px rgba(197, 232, 212, 0.4)';
    return '0 3px 10px rgba(90, 139, 184, 0.2)';
  }};

  &:hover {
    transform: ${props => props.isAvailable ? 'translateY(-4px) scale(1.1)' : 'none'};
    z-index: 10;
    box-shadow: ${props => {
      if (props.isAvailable && props.isSelected) return '0 6px 18px rgba(212, 197, 232, 0.7), 0 0 30px rgba(212, 197, 232, 0.5)';
      if (props.isAvailable && props.isRecommended) return '0 6px 18px rgba(197, 232, 212, 0.7), 0 0 30px rgba(197, 232, 212, 0.5)';
      if (props.isAvailable) return '0 5px 16px rgba(168, 213, 232, 0.6), 0 0 25px rgba(168, 213, 232, 0.4)';
      return '0 3px 10px rgba(90, 139, 184, 0.2)';
    }};
  }
`;

const SeatTooltip = styled(motion.div)`
  position: absolute;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
  color: #2c3e50;
  padding: 30px;
  border-radius: 0;
  font-size: 26px;
  pointer-events: none;
  z-index: 10000;
  width: auto;
  min-width: 600px;
  max-width: 850px;
  box-shadow: 0 20px 50px rgba(90, 139, 184, 0.4);
  border: 3px solid rgba(168, 213, 232, 0.6);
  line-height: 1.5;

  > div {
    margin: 0;
  }

  strong {
    color: #5a8bb8;
    font-size: 36px;
    font-weight: 800;
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
        const meronPosition = isMeron ? { left: 155, top: 1486 } : null; // Moved 120px higher

        // Position Yarkon meeting room below Engineering(S) aligned to left
        const isYarkon = room.name === 'Yarkon';
        const yarkonPosition = isYarkon ? { left: 340, top: 1580 } : null; // Moved 120px higher
        
        // Position Negev meeting room above Engineering(S) aligned to left
        // With 60px gap from Engineering(S) border
        const isNegev = room.name === 'Negev';
        const negevPosition = isNegev ? { left: 370, top: 1098 } : null; // Moved 200px higher

        // Position Timna meeting room above Negev with minimal space
        const isTimna = room.name === 'Timna';
        const timnaPosition = isTimna ? { left: 370, top: 998 } : null; // Moved 200px higher
        
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
        const danPosition = isDan ? { left: 880, top: 1098 } : null; // Moved 200px higher
        
        // Position Carmel to the right of Reserved(S) - vertical orientation, aligned with IT Security line
        const isCarmel = room.name === 'Carmel';
        const carmelPosition = isCarmel ? { left: 1140, top: 1260 } : null;
        
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
          </MeetingRoomBox>
        );
      })}

      {/* Facilities - positioned around the perimeter */}
      <FacilityBox
        facilityType="kitchenette"
        style={{
          left: 850,
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
          top: 998,
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
          top: 1098,
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
          top: 1098,
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
          const seatWidth = 50; // Seat width in px
          const seatHeight = 50; // Seat height in px
          const yOffset = 50; // Match the offset applied to seats in App.tsx
          
          // Zones with 0px seat offsets - no extra space needed in borders
          const teamZone = key;
          const hasVerticalOffset = teamZone === 'Engineering-S'; // Only Engineering-S has vertical desk
          const hasHorizontalOffset = teamZone !== 'Reserved-S' && teamZone !== 'Engineering-S'; // Exclude only Reserved-S and Engineering-S
          
          // Calculate width accounting for seat offsets
          let borderWidth = (maxX - minX) + seatWidth + (padding * 2);
          if (hasVerticalOffset) {
            borderWidth += 0; // No extra space - seats touch desk
          }
          
          // Calculate height accounting for seat offsets
          let borderHeight = (maxY - minY) + seatHeight + (padding * 2);
          if (hasHorizontalOffset) {
            borderHeight += 0; // No extra space - seats touch desk
          }
          
          return (
            <TeamZoneBorder 
              key={key} 
              team={group.team}
              style={{ 
                left: minX - padding,
                top: minY + yOffset - padding,
                width: borderWidth,
                height: borderHeight
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
          const yOffset = 50;
          const labelHeight = 20; // Approximate label height
          
          return (
            <ZoneLabel 
              key={key} 
              style={{ 
                left: minX - padding + 5, // 5px inside from left border
                top: minY + yOffset - padding - labelHeight, // Position above border
                zIndex: 2
              }}
            >
              {group.team}
            </ZoneLabel>
          );
        });
      })()}

      {/* Lean Desks between rows/columns */}
      {desks && (() => {
        const teamZoneGroups = desks.reduce((acc, desk) => {
          const key = `${desk.team}-${desk.zone}`;
          if (!acc[key]) acc[key] = { team: desk.team, zone: desk.zone, desks: [] };
          acc[key].desks.push(desk);
          return acc;
        }, {} as Record<string, { team: string; zone: string; desks: typeof desks }>);
        
        return Object.entries(teamZoneGroups).flatMap(([key, group]) => {
          if (group.desks.length === 0) return [];

          const yOffset = 50; // From App.tsx
          
          // Special handling for Reserved(S) - custom grouping
          if (key === 'Reserved-S') {
            // Group A (64, 65, 68, 69): X=880-940, Y=1260-1340
            // Group B (73, 74, 76, 77): X=880-940, Y=1420-1500
            // Group C (66, 67, 70): X=1000-1060, Y=1260-1340
            // Group D (75, 72, 78, 79): X=1000-1060, Y=1420-1500
            return [
              // Lean desk for Group A (X=880-940, Y=1260-1340)
              <LeanDesk
                key={`${key}-lean-a`}
                style={{
                  left: 910 + 25, // Midpoint + centering
                  top: 1260 + yOffset + 2, // 2px top padding
                  width: 2, // Thin desk width
                  height: 126, // Reduced by 4px (2px top + 2px bottom)
                  transform: 'translateX(-1px)' // Center the 2px width
                }}
              />,
              // Lean desk for Group B (X=880-940, Y=1420-1500)
              <LeanDesk
                key={`${key}-lean-b`}
                style={{
                  left: 910 + 25, // Midpoint + centering
                  top: 1420 + yOffset + 2, // 2px top padding
                  width: 2, // Thin desk width
                  height: 126, // Reduced by 4px (2px top + 2px bottom)
                  transform: 'translateX(-1px)' // Center the 2px width
                }}
              />,
              // Lean desk for Group C (X=1000-1060, Y=1260-1340)
              <LeanDesk
                key={`${key}-lean-c`}
                style={{
                  left: 1030 + 25, // Midpoint + centering
                  top: 1260 + yOffset + 2, // 2px top padding
                  width: 2, // Thin desk width
                  height: 126, // Reduced by 4px (2px top + 2px bottom)
                  transform: 'translateX(-1px)' // Center the 2px width
                }}
              />,
              // Lean desk for Group D (X=1000-1060, Y=1420-1500)
              <LeanDesk
                key={`${key}-lean-d`}
                style={{
                  left: 1030 + 25, // Midpoint + centering
                  top: 1420 + yOffset + 2, // 2px top padding
                  width: 2, // Thin desk width
                  height: 126, // Reduced by 4px (2px top + 2px bottom)
                  transform: 'translateX(-1px)' // Center the 2px width
                }}
              />
            ];
          }
          
          // Get unique X and Y coordinates
          const xCoords = Array.from(new Set(group.desks.map(d => d.coordinates.x))).sort((a, b) => a - b);
          const yCoords = Array.from(new Set(group.desks.map(d => d.coordinates.y))).sort((a, b) => a - b);
          
          // Determine orientation based on specific team-zone combinations
          // Engineering(S) and Reserved(S) have 6 columns in 3 pairs - vertical
          // Reserved(E) has 2 horizontal rows - horizontal
          const verticalZones = ['Engineering-S', 'Reserved-S'];
          const isVertical = verticalZones.includes(key) || (xCoords.length > yCoords.length && !['Reserved-E'].includes(key));
          
          if (isVertical) {
            // Vertical orientation (Engineering-S, Reserved-S, Reserved-E): lean desks between X columns
            if (xCoords.length < 2) return [];
            
            const minY = Math.min(...group.desks.map(d => d.coordinates.y));
            const maxY = Math.max(...group.desks.map(d => d.coordinates.y));
            
            console.log(`VERTICAL ${key}: xCoords=${xCoords.length}, yCoords=${yCoords.length}, minY=${minY}, maxY=${maxY}, height will be=${maxY - minY + 50}`);
            
            const leanDesks = [];
            for (let i = 0; i < xCoords.length - 1; i += 2) {
              const x1 = xCoords[i];
              const x2 = xCoords[i + 1];
              const midX = (x1 + x2) / 2;
              
              leanDesks.push(
                <LeanDesk
                  key={`${key}-lean-${i}`}
                  style={{
                    left: midX + 25, // Center on desk (50px desk width / 2)
                    top: minY + yOffset, // No additional offset needed
                    width: 2, // Thin vertical desk
                    height: maxY - minY + 50, // Full span: gap between rows + seat height
                    transform: 'translateX(-1px)' // Center the 2px width
                  }}
                />
              );
            }
            return leanDesks;
          } else {
            // Horizontal orientation: lean desks between Y rows
            if (yCoords.length < 2) return [];
            
            const minX = Math.min(...group.desks.map(d => d.coordinates.x));
            const maxX = Math.max(...group.desks.map(d => d.coordinates.x));
            
            console.log(`HORIZONTAL ${key}: xCoords=${xCoords.length}, yCoords=${yCoords.length}, minX=${minX}, maxX=${maxX}, width will be=${maxX - minX + 50}`);
            
            const leanDesks = [];
            for (let i = 0; i < yCoords.length - 1; i += 2) {
              const y1 = yCoords[i];
              const y2 = yCoords[i + 1];
              const midY = (y1 + y2) / 2;
              
              leanDesks.push(
                <LeanDesk
                  key={`${key}-lean-${i}`}
                  style={{
                    left: minX, // No additional offset needed
                    top: midY + yOffset + 25, // Center on desk (50px desk height / 2)
                    width: maxX - minX + 50, // Full span: gap between columns + seat width
                    height: 2, // Thin horizontal desk
                    transform: 'translateY(-1px)' // Center the 2px height
                  }}
                />
              );
            }
            return leanDesks;
          }
        });
      })()}

      {/* Seats/Desks */}
      {seats.map(seat => {
        const desk = getDeskForSeat(seat);
        const isReservedTeam = desk?.team === 'Reserved';
        const canSelect = seat.isAvailable && !isReservedTeam;
   
        // Calculate offset based on seat position relative to desk
        // For vertical desks (Engineering-S): seats are left/right of desk
        // For horizontal desks (other zones): seats are above/below desk
        // Reserved-S keeps original 2px spacing (no offset)
        let xOffset = 0;
        let yOffset = 0;
        
        // Special adjustment for specific Reserved-S seats - Group C needs proper spacing
        // Gap: 60px, move toward center leaving 2px on each side of desk
        // Left seat: move (60-50-2-4)/2 = 2px right, Right seat: move 2px left
        if (desk && desk.desk_id && ['RES-S-66', 'RES-S-70', 'RES-S-75', 'RES-S-78'].includes(desk.desk_id)) {
          xOffset = 2; // Move right (from 1000 to 1002)
        } else if (desk && desk.desk_id && ['RES-S-67', 'RES-S-72', 'RES-S-79'].includes(desk.desk_id)) {
          xOffset = -2; // Move left (from 1060 to 1058)
        }
        
        if (desk) {
          const teamZone = `${desk.team}-${desk.zone}`;
          const verticalZones = ['Engineering-S']; // Removed Reserved-S
          
          if (verticalZones.includes(teamZone)) {
            // Vertical desk zones: total 5px spacing (1.5px each side of 2px desk)
            const seatX = seat.x;
            const zoneSeats = seats.filter(s => {
              const d = getDeskForSeat(s);
              return d && d.team === desk.team && d.zone === desk.zone;
            });
            const xCoords = Array.from(new Set(zoneSeats.map(s => s.x))).sort((a, b) => a - b);
            
            // Find which pair this seat belongs to and move toward desk
            for (let i = 0; i < xCoords.length; i += 2) {
              const x1 = xCoords[i];
              const x2 = xCoords[i + 1];
              const gap = x2 - x1;
              const moveDistance = (gap - 50 - 2 - 3) / 2; // (gap - seat_width - desk_width - 1.5px*2) / 2
              
              if (x1 === seatX) {
                xOffset = moveDistance; // Left seat - move right toward desk
                break;
              } else if (x2 === seatX) {
                xOffset = -moveDistance; // Right seat - move left toward desk
                break;
              }
            }
          } else if (teamZone !== 'Reserved-S') {
            // Horizontal desk zones: total 5px spacing between rows (1.5px each side of 2px desk)
            const seatY = seat.y;
            const zoneSeats = seats.filter(s => {
              const d = getDeskForSeat(s);
              return d && d.team === desk.team && d.zone === desk.zone;
            });
            const yCoords = Array.from(new Set(zoneSeats.map(s => s.y))).sort((a, b) => a - b);
            
            // Find which pair this seat belongs to and move toward desk
            for (let i = 0; i < yCoords.length; i += 2) {
              const y1 = yCoords[i];
              const y2 = yCoords[i + 1];
              const gap = y2 - y1;
              const moveDistance = (gap - 50 - 2 - 3) / 2; // (gap - seat_height - desk_height - 1.5px*2) / 2 = 5px total
              
              if (y1 === seatY) {
                yOffset = moveDistance; // Top seat - move down toward desk
                break;
              } else if (y2 === seatY) {
                yOffset = -moveDistance; // Bottom seat - move up toward desk
                break;
              }
            }
          }
        }
        
        return (
          <SeatElement
            key={seat.id}
            isAvailable={canSelect}
            isSelected={selectedSeat?.id === seat.id}
            isRecommended={recommendedSeats.includes(seat.id)}
            zone={seat.zone}
            team={desk?.team}
            style={{ left: seat.x + xOffset, top: seat.y + yOffset }}
            onMouseEnter={() => setHoveredSeat(seat)}
            onMouseLeave={() => setHoveredSeat(null)}
            onClick={() => canSelect && onSeatSelect(seat)}
            whileHover={{ scale: canSelect ? 1.05 : 1 }}
            whileTap={{ scale: canSelect ? 0.95 : 1 }}
          >
          </SeatElement>
        );
      })}

      {/* Tooltip */}
      <AnimatePresence>
        {hoveredSeat && (() => {
          const desk = getDeskForSeat(hoveredSeat);
          const tooltipLeft = hoveredSeat.x + 70;
          const tooltipTop = hoveredSeat.y;

          return (
            <SeatTooltip
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              style={{
                left: tooltipLeft,
                top: tooltipTop,
              }}
            >
              <div style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '3px solid rgba(168, 213, 232, 0.3)' }}>
                <strong>{desk ? `🪑 ${desk.desk_id}` : `Seat ${hoveredSeat.id}`}</strong>
              </div>

              {desk && (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px', marginBottom: '12px', fontSize: '26px' }}>
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
                    <div style={{ marginBottom: '12px', padding: '10px 16px', background: 'rgba(239, 68, 68, 0.2)', borderRadius: '6px', fontSize: '24px' }}>
                      Reserved: {desk.reserved_for}
                    </div>
                  )}

                  {desk.equipment.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ opacity: 0.7, fontSize: '22px', marginBottom: '8px', fontWeight: 600 }}>EQUIPMENT</div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                        {desk.equipment.map((eq, i) => (
                          <span key={i} style={{
                            background: 'rgba(16, 185, 129, 0.2)',
                            padding: '6px 14px',
                            borderRadius: '4px',
                            fontSize: '22px',
                            color: '#10b981'
                          }}>
                            {eq}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '3px solid rgba(168, 213, 232, 0.2)' }}>
                    <div style={{ opacity: 0.7, fontSize: '22px', marginBottom: '8px', fontWeight: 600 }}>NEARBY AMENITIES</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '24px' }}>
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
                      padding: '10px 16px',
                      background: 'rgba(59, 130, 246, 0.2)',
                      borderRadius: '6px',
                      fontSize: '24px',
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
                  <div style={{ fontSize: '26px', marginBottom: '8px' }}>Zone: {hoveredSeat.zone}</div>
                  <div style={{ fontSize: '26px', marginBottom: '8px' }}>Status: {hoveredSeat.isAvailable ? '✓ Available' : '✗ Occupied'}</div>
                  {hoveredSeat.currentUser && <div style={{ fontSize: '26px', marginBottom: '8px' }}>User: {hoveredSeat.currentUser}</div>}
                  {hoveredSeat.features.length > 0 && (
                    <div style={{ fontSize: '26px' }}>Features: {hoveredSeat.features.map(f => f.label).join(', ')}</div>
                  )}
                </>
              )}
            </SeatTooltip>
          );
        })()}
      </AnimatePresence>
      </MapContent>
    </MapContainer>
  );
};