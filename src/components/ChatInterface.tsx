import React, { useState, useRef, useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, MapPin, Clock } from 'lucide-react';
import { ChatMessage, SeatRecommendation, Seat } from '../types';

interface ChatInterfaceProps {
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onSelectRecommendation: (recommendation: SeatRecommendation) => void;
  onBookSeat: (seat: Seat) => void;
  isLoading: boolean;
}

const ChatContainer = styled.div`
  display: flex;
  flex-direction: column;
  height: 700px;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
  border-radius: 0;
  box-shadow: 0 8px 32px rgba(90, 139, 184, 0.15);
  overflow: hidden;
  border: 1px solid rgba(168, 213, 232, 0.5);
`;

const ChatHeader = styled.div`
  background: linear-gradient(135deg, #5a8bb8 0%, #7d9fbe 100%);
  color: white;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const MessagesContainer = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const MessageBubble = styled(motion.div)<{ isUser: boolean }>`
  max-width: 80%;
  align-self: ${props => props.isUser ? 'flex-end' : 'flex-start'};
  background: ${props => props.isUser
    ? 'linear-gradient(135deg, rgba(168, 213, 232, 0.8) 0%, rgba(168, 213, 232, 0.9) 100%)'
    : 'rgba(245, 248, 250, 0.8)'};
  color: ${props => props.isUser ? 'white' : '#2c3e50'};
  padding: 12px 16px;
  border-radius: 0;
  box-shadow: 0 2px 8px rgba(90, 139, 184, 0.15);
  position: relative;
`;

const MessageIcon = styled.div<{ isUser: boolean }>`
  position: absolute;
  ${props => props.isUser ? 'right: -40px' : 'left: -40px'};
  top: 0;
  width: 32px;
  height: 32px;
  border-radius: 0;
  background: ${props => props.isUser ? '#a8d5e8' : '#c5e8d4'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
`;

const RecommendationCard = styled(motion.div)`
  background: linear-gradient(135deg, rgba(197, 232, 212, 0.25) 0%, rgba(197, 232, 212, 0.15) 100%);
  border: 2px solid rgba(197, 232, 212, 0.6);
  border-radius: 0;
  padding: 16px;
  margin: 12px 0;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 12px rgba(107, 165, 133, 0.15);

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 8px 24px rgba(107, 165, 133, 0.25);
    border-color: rgba(197, 232, 212, 0.8);
  }
`;

const RecommendationHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: between;
  margin-bottom: 8px;
`;

const SeatBadge = styled.div`
  background: #c5e8d4;
  color: #2c3e50;
  padding: 4px 12px;
  border-radius: 0;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
`;

const ScoreBadge = styled.div`
  background: #f5c5b6;
  color: #2c3e50;
  padding: 4px 8px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 600;
  margin-left: auto;
`;

const RecommendationReasons = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
`;

const ReasonTag = styled.span`
  background: rgba(168, 213, 232, 0.3);
  color: #5a8bb8;
  padding: 2px 8px;
  border-radius: 0;
  font-size: 11px;
`;

const InputContainer = styled.div`
  padding: 20px;
  border-top: 1px solid rgba(168, 213, 232, 0.3);
  background: rgba(245, 248, 250, 0.5);
`;

const InputWrapper = styled.div`
  display: flex;
  gap: 12px;
  align-items: flex-end;
`;

const MessageInput = styled.textarea`
  flex: 1;
  padding: 12px 16px;
  border: 2px solid rgba(168, 213, 232, 0.4);
  border-radius: 0;
  resize: none;
  font-family: inherit;
  font-size: 14px;
  line-height: 1.5;
  min-height: 68px;
  max-height: 120px;
  background: white;

  &:focus {
    outline: none;
    border-color: rgba(168, 213, 232, 0.8);
  }

  &::placeholder {
    color: #7d9fbe;
  }
`;

const SendButton = styled(motion.button)`
  background: linear-gradient(135deg, #5a8bb8 0%, #7d9fbe 100%);
  color: white;
  border: none;
  border-radius: 0;
  width: 44px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(90, 139, 184, 0.3);

  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

const TypingIndicator = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 8px;
  color: #7d9fbe;
  font-style: italic;
  align-self: flex-start;
`;

const TypingDots = styled.div`
  display: flex;
  gap: 4px;

  span {
    width: 6px;
    height: 6px;
    border-radius: 0;
    background: #7d9fbe;
    animation: typing 1.4s infinite ease-in-out;

    &:nth-child(1) { animation-delay: -0.32s; }
    &:nth-child(2) { animation-delay: -0.16s; }
  }

  @keyframes typing {
    0%, 80%, 100% {
      transform: scale(0);
    }
    40% {
      transform: scale(1);
    }
  }
`;

const BookButton = styled(motion.button)`
  background: #c5e8d4;
  color: #2c3e50;
  border: none;
  padding: 8px 16px;
  border-radius: 0;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  margin-top: 8px;
  display: flex;
  align-items: center;
  gap: 4px;

  &:hover {
    background: #b0d9c2;
  }
`;

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  messages,
  onSendMessage,
  onSelectRecommendation,
  onBookSeat,
  isLoading
}) => {
  const [inputValue, setInputValue] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputValue.trim() && !isLoading) {
      onSendMessage(inputValue.trim());
      setInputValue('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <ChatContainer>
      <ChatHeader>
        <Bot size={24} />
        <div>
          <h3 style={{ margin: 0, fontSize: '18px' }}>FinSeat Assistant</h3>
          <p style={{ margin: 0, fontSize: '12px', opacity: 0.8 }}>
            Your smart seating assistant
          </p>
        </div>
        <Sparkles size={20} style={{ marginLeft: 'auto' }} />
      </ChatHeader>

      <MessagesContainer>
        <AnimatePresence>
          {messages.map((message) => (
            <MessageBubble
              key={message.id}
              isUser={message.sender === 'user'}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <MessageIcon isUser={message.sender === 'user'}>
                {message.sender === 'user' ? <User size={16} /> : <Bot size={16} />}
              </MessageIcon>
              
              <div>{message.content}</div>
              
              {message.data?.recommendations && (
                <div>
                  {message.data.recommendations.map((rec, index) => (
                    <RecommendationCard
                      key={index}
                      onClick={() => onSelectRecommendation(rec)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <RecommendationHeader>
                        <SeatBadge>
                          <MapPin size={12} />
                          Seat {rec.seat.id}
                        </SeatBadge>
                        <ScoreBadge>{Math.round(rec.score)}% match</ScoreBadge>
                      </RecommendationHeader>
                      
                      <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                        Zone: {rec.seat.zone} • Available until{' '}
                        {rec.timeSlots[0] ? formatTime(rec.timeSlots[0].end) : 'end of day'}
                      </div>
                      
                      <RecommendationReasons>
                        {rec.reasons.slice(0, 3).map((reason, i) => (
                          <ReasonTag key={i}>{reason}</ReasonTag>
                        ))}
                      </RecommendationReasons>
                      
                      <BookButton
                        onClick={(e) => {
                          e.stopPropagation();
                          onBookSeat(rec.seat);
                        }}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                      >
                        <Clock size={10} />
                        Book Now
                      </BookButton>
                    </RecommendationCard>
                  ))}
                </div>
              )}
              
              <div style={{ fontSize: '10px', opacity: 0.6, marginTop: '4px' }}>
                {formatTime(message.timestamp)}
              </div>
            </MessageBubble>
          ))}
        </AnimatePresence>

        {isLoading && (
          <TypingIndicator
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Bot size={16} />
            FinSeat is thinking...
            <TypingDots>
              <span></span>
              <span></span>
              <span></span>
            </TypingDots>
          </TypingIndicator>
        )}
        
        <div ref={messagesEndRef} />
      </MessagesContainer>

      <InputContainer>
        <form onSubmit={handleSubmit}>
          <InputWrapper>
            <MessageInput
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me about seating recommendations, book a seat, or check availability..."
              rows={1}
              disabled={isLoading}
            />
            <SendButton
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <Send size={18} />
            </SendButton>
          </InputWrapper>
        </form>
      </InputContainer>
    </ChatContainer>
  );
};