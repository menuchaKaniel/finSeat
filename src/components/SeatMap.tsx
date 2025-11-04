import React, { useState } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Seat, Desk, Zone, ZoneType } from '../types';
import { Monitor, Coffee, TreePine, Users, VolumeX, Building2, Utensils, DoorOpen } from 'lucide-react';
import { meetingRooms } from '../data/officeLayout';

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
  max-width: 1400px;
  height: 800px;
  max-height: 800px;
  border: 2px solid #333;
  background-color: white;
  overflow-y: scroll;
  overflow-x: auto;
`;

const MapContent = styled.div`
  position: relative;
  width: 1400px;
  height: 1800px;
  min-height: 1800px;
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

const SeatElement = styled(motion.div)<{ 
  isAvailable: boolean; 
  isSelected: boolean; 
  isRecommended: boolean;
  zone: ZoneType;
  team?: string;
}>`
  position: absolute;
  width: 70px;
  height: 60px;
  border-radius: 12px;
  cursor: ${props => props.isAvailable ? 'pointer' : 'not-allowed'};
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 6px 4px;
  font-size: 11px;
  font-weight: 600;
  transition: all 0.3s ease;
  
  background: ${props => {
    if (props.isSelected) return 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    if (!props.isAvailable) return 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)';
    if (props.isRecommended) return 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
    // Team-based colors for available seats
    if (props.team === 'Risk') return 'linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)'; // purple
    if (props.team === 'Product') return 'linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)'; // green
    if (props.team === 'Engineering') return 'linear-gradient(135deg, #fb923c 0%, #f97316 100%)'; // orange
    if (props.team === 'Data') return 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)'; // amber
    if (props.team === 'IT Security') return 'linear-gradient(135deg, #f9a8d4 0%, #ec4899 100%)'; // pink
    if (props.team === 'DevOps') return 'linear-gradient(135deg, #fde047 0%, #facc15 100%)'; // yellow
    if (props.team === 'Reserved') return 'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)'; // gray
    return 'linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%)';
  }};
  
  color: ${props => {
    if (props.isSelected || !props.isAvailable || props.isRecommended || props.team) return 'white';
    return '#374151';
  }};
  
  border: 2px solid ${props => {
    if (props.isSelected) return '#4f46e5';
    if (props.isRecommended) return '#059669';
    if (!props.isAvailable) return '#dc2626';
    if (props.team === 'Risk') return '#7c3aed';
    if (props.team === 'Product') return '#059669';
    if (props.team === 'Engineering') return '#ea580c'; // orange border
    if (props.team === 'Data') return '#d97706';
    if (props.team === 'IT Security') return '#db2777'; // pink border
    if (props.team === 'DevOps') return '#eab308'; // yellow border
    if (props.team === 'Reserved') return '#4b5563';
    return '#d1d5db';
  }};
  
  box-shadow: ${props => {
    if (props.isSelected) return '0 8px 24px rgba(79, 70, 229, 0.4)';
    if (props.isRecommended) return '0 8px 24px rgba(16, 185, 129, 0.3)';
    return '0 4px 12px rgba(0, 0, 0, 0.08)';
  }};

  &:hover {
    transform: ${props => props.isAvailable ? 'translateY(-4px) scale(1.05)' : 'none'};
    box-shadow: ${props => props.isAvailable ? '0 12px 28px rgba(0, 0, 0, 0.15)' : '0 4px 12px rgba(0, 0, 0, 0.08)'};
    z-index: 10;
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

const FeatureIcon = styled.div<{ feature: string }>`
  position: absolute;
  top: -6px;
  right: -6px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: #374151;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  border: 2px solid white;
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

  const getFeatureIcon = (featureType: string) => {
    switch (featureType) {
      case 'monitor': return <Monitor size={8} />;
      case 'window-view': return <TreePine size={8} />;
      case 'near-kitchen': return <Coffee size={8} />;
      case 'collaborative': return <Users size={8} />;
      case 'quiet': return <VolumeX size={8} />;
      default: return null;
    }
  };

  return (
    <MapContainer onMouseMove={handleMouseMove}>
      <MapContent>
      {/* Map Header */}
      <MapHeader>
        📍 Office Floor Plan - CRT Floor
      </MapHeader>
      
      {/* Meeting Rooms - positioned dynamically */}
      {meetingRooms.map((room: any, idx: number) => (
        <MeetingRoomBox
          key={room.id}
          style={{
            left: 50 + (idx % 4) * 220,
            top: 60,
            width: room.capacity >= 10 ? 200 : (room.capacity >= 6 ? 170 : 140),
            height: 90
          }}
        >
          <Building2 size={20} style={{ marginBottom: 4 }} />
          <div>{room.name}</div>
          <div style={{ fontSize: '10px', opacity: 0.7 }}>Cap: {room.capacity}</div>
          <div style={{ fontSize: '9px', opacity: 0.6 }}>{room.zone}</div>
        </MeetingRoomBox>
      ))}

      {/* Facilities - positioned around the perimeter */}
      <FacilityBox
        facilityType="kitchenette"
        style={{
          left: 50,
          top: 180,
          width: 110,
          height: 80
        }}
      >
        <Utensils size={20} style={{ marginBottom: 4 }} />
        <div>Cafeteria</div>
      </FacilityBox>
      
      <FacilityBox
        facilityType="bathroom"
        style={{
          right: 50,
          top: 180,
          width: 100,
          height: 70
        }}
      >
        <DoorOpen size={20} style={{ marginBottom: 4 }} />
        <div>Bathroom</div>
      </FacilityBox>
      
      <FacilityBox
        facilityType="kitchenette"
        style={{
          right: 50,
          bottom: 80,
          width: 110,
          height: 80
        }}
      >
        <Utensils size={20} style={{ marginBottom: 4 }} />
        <div>Kitchenette</div>
      </FacilityBox>
      
      {/* Zone/Team Labels - calculated from actual desk positions */}
      {desks && Array.from(new Set(desks.map(d => d.zone))).map(zoneName => {
        const zoneDesks = desks.filter(d => d.zone === zoneName);
        const avgX = zoneDesks.reduce((sum, d) => sum + d.coordinates.x, 0) / zoneDesks.length;
        const avgY = zoneDesks.reduce((sum, d) => sum + d.coordinates.y, 0) / zoneDesks.length;
        const team = zoneDesks[0]?.team;
        return (
          <ZoneLabel key={zoneName} style={{ 
            left: avgX - 60, 
            top: avgY - 20
          }}>
            {team} ({zoneName})
          </ZoneLabel>
        );
      })}

      {/* Seats/Desks */}
      {seats.map(seat => {
        const desk = getDeskForSeat(seat);
        const displayId = desk?.desk_id || seat.id;
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
            <div style={{ fontSize: '12px', fontWeight: 700, lineHeight: 1.2 }}>{displayId}</div>
            {desk && <div style={{ fontSize: '9px', opacity: 0.85, marginTop: '2px', lineHeight: 1 }}>{desk.team}</div>}
            
            {/* Feature Icons */}
            {seat.features.slice(0, 1).map((feature, index) => (
              <FeatureIcon key={index} feature={feature.type}>
                {getFeatureIcon(feature.type)}
              </FeatureIcon>
            ))}
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
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Teams</div>
        <LegendItem color="linear-gradient(135deg, #a78bfa 0%, #8b5cf6 100%)">Risk</LegendItem>
        <LegendItem color="linear-gradient(135deg, #6ee7b7 0%, #10b981 100%)">Product</LegendItem>
        <LegendItem color="linear-gradient(135deg, #7dd3fc 0%, #38bdf8 100%)">Engineering</LegendItem>
        <LegendItem color="linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)">Reserved</LegendItem>
        <LegendItem color="linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)">IT Security</LegendItem>
        <LegendItem color="linear-gradient(135deg, #f87171 0%, #ef4444 100%)">DevOps</LegendItem>
        
        <div style={{ fontWeight: 600, marginTop: 12, marginBottom: 8, paddingTop: 8, borderTop: '1px solid #e5e7eb' }}>Status</div>
        <LegendItem color="#10b981">Recommended</LegendItem>
        <LegendItem color="#4f46e5">Selected</LegendItem>
        <LegendItem color="#ef4444">Occupied</LegendItem>
      </Legend>
      </MapContent>
    </MapContainer>
  );
};