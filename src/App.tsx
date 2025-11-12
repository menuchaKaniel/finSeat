import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import { ChatInterface } from './components/ChatInterface';
import { SeatMap } from './components/SeatMap';
import { SettingsModal } from './components/SettingsModal';
import { AIRecommendationEngine } from './utils/aiEngine';
import { 
  Seat, 
  Desk,
  Zone, 
  ZoneType, 
  ChatMessage, 
  SeatRecommendation, 
  UserPreferences, 
  Schedule 
} from './types';
import { seatHistories } from './data/officeLayout';
import { desks as layoutDesks, deskToSeat } from './data/desks';
import { seatService } from './services/seatService';
import { Settings, Eye, EyeOff, Download } from 'lucide-react';

const AppContainer = styled.div`
  min-height: 100vh;
  background: #0a0e27;
  background-image: 
    radial-gradient(at 20% 30%, rgba(0, 255, 255, 0.1) 0px, transparent 50%),
    radial-gradient(at 80% 70%, rgba(138, 43, 226, 0.15) 0px, transparent 50%),
    radial-gradient(at 50% 50%, rgba(0, 255, 157, 0.08) 0px, transparent 50%);
  padding: 30px 20px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  position: relative;
  
  &::before {
    content: '';
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: 
      linear-gradient(90deg, rgba(0, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(rgba(0, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 50px 50px;
    pointer-events: none;
    z-index: 0;
  }
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 30px;
  position: relative;
  z-index: 1;
`;

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 900;
  margin: 0 0 10px 0;
  background: linear-gradient(135deg, #00ffff 0%, #00ff9d 50%, #8a2be2 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  text-shadow: 0 0 40px rgba(0, 255, 255, 0.3);
  letter-spacing: -1px;
  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 100px;
    height: 2px;
    background: linear-gradient(90deg, transparent, #00ffff, transparent);
    box-shadow: 0 0 10px #00ffff;
  }
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  color: rgba(0, 255, 255, 0.7);
  margin: 20px 0 0 0;
  font-weight: 500;
  letter-spacing: 2px;
  text-transform: uppercase;
  font-size: 0.85rem;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 30px;
  max-width: 1600px;
  margin: 0 auto;
  position: relative;
  z-index: 1;
  
  @media (max-width: 1200px) {
    grid-template-columns: 1fr;
    gap: 20px;
  }
`;

const MapSection = styled.div`
  display: flex;
  flex-direction: column;
  gap: 15px;
`;

const MapControls = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(15, 23, 42, 0.95);
  backdrop-filter: blur(10px);
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: 
    0 4px 24px rgba(0, 0, 0, 0.4),
    0 0 0 1px rgba(0, 255, 255, 0.1),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(0, 255, 255, 0.2);
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 1px;
    background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.5), transparent);
  }
`;

const ControlGroup = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const ToggleButton = styled(motion.button)<{ active: boolean }>`
  display: flex;
  align-items: center;
  gap: 8px;
  background: ${props => props.active 
    ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.2) 0%, rgba(0, 255, 157, 0.2) 100%)' 
    : 'rgba(30, 41, 59, 0.6)'};
  color: ${props => props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.6)'};
  border: 1px solid ${props => props.active ? 'rgba(0, 255, 255, 0.5)' : 'rgba(100, 116, 139, 0.3)'};
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active 
    ? '0 0 20px rgba(0, 255, 255, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.1)' 
    : '0 2px 8px rgba(0, 0, 0, 0.2)'};
  position: relative;
  backdrop-filter: blur(5px);

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: 10px;
    padding: 1px;
    background: ${props => props.active 
      ? 'linear-gradient(135deg, rgba(0, 255, 255, 0.5), rgba(0, 255, 157, 0.5))' 
      : 'transparent'};
    -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    -webkit-mask-composite: xor;
    mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
    mask-composite: exclude;
    opacity: ${props => props.active ? 1 : 0};
    transition: opacity 0.3s ease;
  }

  &:hover {
    transform: translateY(-2px);
    border-color: ${props => props.active ? 'rgba(0, 255, 255, 0.8)' : 'rgba(100, 116, 139, 0.5)'};
    color: ${props => props.active ? '#00ffff' : 'rgba(255, 255, 255, 0.9)'};
    box-shadow: ${props => props.active 
      ? '0 0 30px rgba(0, 255, 255, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.15)' 
      : '0 4px 12px rgba(0, 0, 0, 0.3)'};
  }
`;

const StatsDisplay = styled.div`
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: rgba(255, 255, 255, 0.8);
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 12px;
  position: relative;
  
  &:not(:last-child)::after {
    content: '';
    position: absolute;
    right: -10px;
    top: 50%;
    transform: translateY(-50%);
    width: 1px;
    height: 30px;
    background: linear-gradient(to bottom, transparent, rgba(0, 255, 255, 0.3), transparent);
  }
  
  .number {
    font-weight: 800;
    font-size: 22px;
    background: linear-gradient(135deg, #00ffff 0%, #00ff9d 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    text-shadow: 0 0 20px rgba(0, 255, 255, 0.5);
    font-family: 'Orbitron', monospace;
  }
  
  .label {
    font-size: 10px;
    color: rgba(0, 255, 255, 0.6);
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-top: 4px;
  }
`;

// Derive zones dynamically from desks (by desk.zone string)
function deriveZonesFromDesks(desks: Desk[]): Zone[] {
  const zoneGroups: Record<string, Desk[]> = {};
  desks.forEach(desk => {
    zoneGroups[desk.zone] = zoneGroups[desk.zone] || [];
    zoneGroups[desk.zone].push(desk);
  });
  const zoneColors = ['#8b5cf6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
  return Object.entries(zoneGroups).map(([zoneName, zoneDesks], idx) => {
    // Compute activity from desk occupancy
    const occupiedCount = zoneDesks.filter(d => d.status === 'occupied' || d.status === 'reserved').length;
    const activityPercent = Math.round((occupiedCount / zoneDesks.length) * 100);
    return {
      id: `${zoneName.toLowerCase().replace(/\s+/g, '-')}-zone`,
      type: ZoneType.COLLABORATIVE, // fallback type
      name: zoneName,
      color: zoneColors[idx % zoneColors.length],
      seats: zoneDesks.map(d => d.desk_id),
      currentActivity: activityPercent,
      description: `${zoneName} area with ${zoneDesks.length} desks`
    } as Zone;
  });
}

const sampleUserPreferences: UserPreferences = {
  team: 'Engineering', // Default team when not specified
  workStyle: 'mixed',
  collaborationNeeds: 'medium',
  preferredZones: [ZoneType.COLLABORATIVE, ZoneType.FOCUS], // Engineering zones: SW (collaborative) prioritized
  timePreferences: {
    morningPerson: true,
    afternoonFocus: true
  },
  seatFeatures: ['monitor', 'window-view', 'standing-desk'],
  amenityPreferences: {
    avoidColdAreas: true, // Avoid cold areas by default
    preferAisle: false,
    nearMeetingRooms: true // Prefer proximity to actual meeting rooms (not wellness rooms)
  }
};

const sampleSchedule: Schedule[] = [
  {
    id: '1',
    title: 'Team Standup',
    startTime: new Date(Date.now() + 2 * 60 * 60 * 1000), // 2 hours from now
    endTime: new Date(Date.now() + 2.5 * 60 * 60 * 1000),
    type: 'meeting',
    attendees: ['Alice', 'Bob', 'Charlie']
  },
  {
    id: '2',
    title: 'Focus Work Block',
    startTime: new Date(Date.now() + 4 * 60 * 60 * 1000), // 4 hours from now
    endTime: new Date(Date.now() + 6 * 60 * 60 * 1000),
    type: 'focus-work'
  }
];

function App() {
  // Use desks as primary data, convert to seats for AI engine compatibility
  const [desks, setDesks] = useState<Desk[]>(() => {
    // Use the desk status from the data (already randomized in desks.ts)
    return layoutDesks;
  });
  
  const [seats, setSeats] = useState<Seat[]>(() => {
    // Try to load saved state from localStorage first
    seatService.loadFromStorage();
    
    // Convert desks to seats for map rendering - use actual coordinates from JSON
    // Also sync with seat service state
    const allDesks = seatService.getAllDesks();
    
    return layoutDesks.map(d => {
      // Find corresponding desk in seat service to get current status
      const serviceDesk = allDesks.find(sd => sd.desk_id === d.desk_id);
      const isAvailable = serviceDesk ? serviceDesk.status === 'available' : d.status === 'available';
      
      const seat = deskToSeat(d);
      return {
        ...seat,
        isAvailable: isAvailable,
        currentUser: serviceDesk?.reserved_for || undefined,
        x: seat.x, // Use actual coordinates from JSON
        y: seat.y + 200  // Offset for meeting rooms and header at top
      };
    });
  });
  
  const [zones] = useState<Zone[]>(() => deriveZonesFromDesks(desks));
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      content: "Hi there! I'm your AI Desk Buddy 2.0. I'm here to help you find the perfect seat based on your work style, schedule, and the current office vibe. What kind of workspace are you looking for today?",
      sender: 'ai',
      timestamp: new Date(),
      type: 'text'
    }
  ]);
  const [selectedSeat, setSelectedSeat] = useState<Seat | undefined>();
  const [recommendedSeats, setRecommendedSeats] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showZones, setShowZones] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  const [aiEngine] = useState(() => new AIRecommendationEngine(seats, zones));

  // Update AI engine and zones when seats change
  useEffect(() => {
    aiEngine.seats = seats;
    // Zones are derived from desks, not seats
  }, [seats, aiEngine]);

  const handleSendMessage = async (content: string) => {
    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    // Process message with AI engine
    try {
      const aiResponse = await aiEngine.processUserMessage(content, sampleUserPreferences, sampleSchedule);
      
      const aiMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: aiResponse.message,
        sender: 'ai',
        timestamp: new Date(),
        type: aiResponse.recommendations ? 'recommendation' : 'text',
        data: {
          recommendations: aiResponse.recommendations,
          action: 'recommend'
        }
      };

      setMessages(prev => [...prev, aiMessage]);
      
      if (aiResponse.recommendations) {
        setRecommendedSeats(aiResponse.recommendations.map(r => r.seat.id));
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error processing AI response:', error);
      
      // Fallback message on error
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "I'm having trouble processing your request right now. Please try again, or let me know if you'd like me to show you available seats!",
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };

      setMessages(prev => [...prev, errorMessage]);
      setIsLoading(false);
    }
  };

  const handleSeatSelect = (seat: Seat) => {
    setSelectedSeat(seat);
    
    // Add chat message about selection
    const selectionMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Great choice! You've selected Seat ${seat.id} in the ${seat.zone} zone. This seat ${seat.features.map(f => f.label).join(', ')}. Would you like to book it?`,
      sender: 'ai',
      timestamp: new Date(),
      type: 'confirmation',
      data: {
        selectedSeat: seat,
        action: 'confirm-booking'
      }
    };

    setMessages(prev => [...prev, selectionMessage]);
  };

  const handleSelectRecommendation = (recommendation: SeatRecommendation) => {
    handleSeatSelect(recommendation.seat);
  };

  const handleBookSeat = (seat: Seat) => {
    // Find corresponding desk
    const deskId = desks.find(d => d.legacySeatId === seat.id || d.desk_id === seat.id)?.desk_id;
    
    if (!deskId) {
      console.error('Could not find desk ID for seat:', seat.id);
      return;
    }

    // Reserve the seat using seat service with user's team info
    const success = seatService.reserveSeat(deskId, 'You', sampleUserPreferences.team || 'Engineering');
    
    if (!success) {
      // Seat could not be reserved (not available or error)
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        content: `Sorry, ${deskId} is no longer available. Please choose another seat.`,
        sender: 'ai',
        timestamp: new Date(),
        type: 'text'
      };
      setMessages(prev => [...prev, errorMessage]);
      return;
    }
    
    // Update desk availability in local state
    setDesks(prev => prev.map(d => 
      (d.legacySeatId === seat.id || d.desk_id === seat.id)
        ? { ...d, status: 'reserved' as any, reserved_for: 'You' }
        : d
    ));
    
    // Update seat availability in local state
    setSeats(prev => prev.map(s => 
      s.id === seat.id 
        ? { ...s, isAvailable: false, currentUser: 'You', scheduledUntil: new Date(Date.now() + 4 * 60 * 60 * 1000) }
        : s
    ));

    // Clear selections
    setSelectedSeat(undefined);
    setRecommendedSeats([]);

    // Add confirmation message
    const confirmationMessage: ChatMessage = {
      id: Date.now().toString(),
      content: `Perfect! I've booked ${deskId ? `Desk ${deskId}` : `Seat ${seat.id}`} for you until ${new Date(Date.now() + 4 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}. Enjoy your productive session! 🎉`,
      sender: 'ai',
      timestamp: new Date(),
      type: 'confirmation'
    };

    setMessages(prev => [...prev, confirmationMessage]);
    
    // Log statistics
    const stats = seatService.getStatistics();
    console.log('📊 Seat Statistics:', stats);
  };

  const handleBedrockConfigUpdate = (region?: string, modelId?: string) => {
    aiEngine.updateBedrockConfig(region, modelId);
  };

  const handleTestConnection = async (): Promise<boolean> => {
    return await aiEngine.testLLMConnection();
  };

  const availableSeats = seats.filter(s => s.isAvailable).length;
  const occupancyRate = Math.round(((seats.length - availableSeats) / seats.length) * 100);
  const avgUtilization = Math.round(
    seatHistories.reduce((acc, h) => acc + (h.utilizationRate || 0), 0) / seatHistories.length * 100
  );
  const topSeat = [...seatHistories].sort((a, b) => (b.utilizationRate ?? 0) - (a.utilizationRate ?? 0))[0]?.seatId;

  return (
    <AppContainer>
      <Header>
        <Title
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          AI Desk Buddy 2.0
        </Title>
        <Subtitle>Smart seating recommendations powered by AI</Subtitle>
      </Header>

      <MainContent>
        <MapSection>
          <MapControls>
            <ControlGroup>
              <ToggleButton
                active={showZones}
                onClick={() => setShowZones(!showZones)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {showZones ? <Eye size={16} /> : <EyeOff size={16} />}
                {showZones ? 'Hide Zones' : 'Show Zones'}
              </ToggleButton>
              
              <ToggleButton
                active={false}
                onClick={() => setShowSettings(true)}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Settings size={16} />
                Settings
              </ToggleButton>
              
              <ToggleButton
                active={false}
                onClick={() => seatService.exportBookingHistory()}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title="Download updated seat history JSON file"
              >
                <Download size={16} />
                Export History
              </ToggleButton>
            </ControlGroup>

            <StatsDisplay>
              <StatItem>
                <div className="number">{availableSeats}</div>
                <div className="label">Available</div>
              </StatItem>
              <StatItem>
                <div className="number">{occupancyRate}%</div>
                <div className="label">Occupied</div>
              </StatItem>
              <StatItem>
                <div className="number">{avgUtilization}%</div>
                <div className="label">Avg Util (Year)</div>
              </StatItem>
              {topSeat && (
                <StatItem>
                  <div className="number">{topSeat}</div>
                  <div className="label">Top Seat</div>
                </StatItem>
              )}
            </StatsDisplay>
          </MapControls>

          <SeatMap
            seats={seats}
            desks={desks}
            zones={zones}
            onSeatSelect={handleSeatSelect}
            recommendedSeats={recommendedSeats}
            selectedSeat={selectedSeat}
            showZones={showZones}
          />
        </MapSection>

        <ChatInterface
          messages={messages}
          onSendMessage={handleSendMessage}
          onSelectRecommendation={handleSelectRecommendation}
          onBookSeat={handleBookSeat}
          isLoading={isLoading}
        />
      </MainContent>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        onBedrockConfigUpdate={handleBedrockConfigUpdate}
        onTestConnection={handleTestConnection}
      />
    </AppContainer>
  );
}

export default App;