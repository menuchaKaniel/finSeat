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
import { Settings, Eye, EyeOff } from 'lucide-react';

const AppContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 30px 20px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
`;

const Header = styled.div`
  text-align: center;
  color: white;
  margin-bottom: 30px;
`;

const Title = styled(motion.h1)`
  font-size: 3rem;
  font-weight: 800;
  margin: 0 0 10px 0;
  text-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  background: linear-gradient(135deg, #ffffff 0%, #f3f4f6 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const Subtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
`;

const MainContent = styled.div`
  display: grid;
  grid-template-columns: 1fr 400px;
  gap: 30px;
  max-width: 1600px;
  margin: 0 auto;
  
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
  background: rgba(255, 255, 255, 0.98);
  padding: 16px 20px;
  border-radius: 12px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  border: 1px solid rgba(0, 0, 0, 0.05);
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
  background: ${props => props.active ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)'};
  color: white;
  border: none;
  padding: 10px 16px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px ${props => props.active ? 'rgba(16, 185, 129, 0.3)' : 'rgba(0, 0, 0, 0.1)'};

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 16px ${props => props.active ? 'rgba(16, 185, 129, 0.4)' : 'rgba(0, 0, 0, 0.15)'};
  }
`;

const StatsDisplay = styled.div`
  display: flex;
  gap: 20px;
  font-size: 14px;
  color: #374151;
`;

const StatItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0 12px;
  
  .number {
    font-weight: 800;
    font-size: 22px;
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
  }
  
  .label {
    font-size: 11px;
    color: #6b7280;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-top: 2px;
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
  workStyle: 'mixed',
  collaborationNeeds: 'medium',
  preferredZones: [ZoneType.FOCUS, ZoneType.COLLABORATIVE],
  timePreferences: {
    morningPerson: true,
    afternoonFocus: true
  },
  seatFeatures: ['monitor', 'window-view', 'standing-desk']
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
    // Convert desks to seats for map rendering - use actual coordinates from JSON
    return layoutDesks.map(d => {
      const seat = deskToSeat(d);
      return {
        ...seat,
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
  const [aiEngine] = useState(() => new AIRecommendationEngine(seats, zones, localStorage.getItem('openai_api_key') || undefined));

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
    
    // Update desk availability
    setDesks(prev => prev.map(d => 
      (d.legacySeatId === seat.id || d.desk_id === seat.id)
        ? { ...d, status: 'reserved' as any, reserved_for: 'You' }
        : d
    ));
    
    // Update seat availability
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
  };

  const handleApiKeyUpdate = (apiKey: string) => {
    aiEngine.updateApiKey(apiKey);
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
        onApiKeyUpdate={handleApiKeyUpdate}
        onTestConnection={handleTestConnection}
      />
    </AppContainer>
  );
}

export default App;