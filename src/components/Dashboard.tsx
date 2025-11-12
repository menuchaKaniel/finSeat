import React, { useState, useEffect } from 'react';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  MapPin,
  BarChart3,
  PieChart,
  Activity,
  X
} from 'lucide-react';
import { trendService } from '../services/trendService';

interface DashboardProps {
  onClose: () => void;
}

const DashboardOverlay = styled(motion.div)`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(245, 248, 250, 0.95);
  backdrop-filter: blur(10px);
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  overflow-y: auto;
`;

const DashboardContainer = styled(motion.div)`
  background: linear-gradient(135deg, #ffffff 0%, #f8fafb 100%);
  border-radius: 0;
  border: 2px solid rgba(168, 213, 232, 0.5);
  box-shadow:
    0 20px 60px rgba(90, 139, 184, 0.2),
    0 0 40px rgba(168, 213, 232, 0.3);
  max-width: 1400px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  padding: 30px;
  position: relative;

  &::-webkit-scrollbar {
    width: 12px;
  }

  &::-webkit-scrollbar-track {
    background: rgba(245, 248, 250, 0.5);
    border-radius: 0;
  }

  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, rgba(168, 213, 232, 0.6), rgba(197, 232, 212, 0.6));
    border-radius: 0;

    &:hover {
      background: linear-gradient(135deg, rgba(168, 213, 232, 0.8), rgba(197, 232, 212, 0.8));
    }
  }
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
  padding-bottom: 20px;
  border-bottom: 2px solid rgba(168, 213, 232, 0.4);
`;

const Title = styled.h1`
  font-size: 2.5rem;
  font-weight: 900;
  margin: 0;
  background: linear-gradient(135deg, #5a8bb8 0%, #7d9fbe 50%, #8fa8c8 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
`;

const CloseButton = styled.button`
  background: rgba(239, 68, 68, 0.2);
  border: 1px solid rgba(239, 68, 68, 0.5);
  color: #ef4444;
  width: 40px;
  height: 40px;
  border-radius: 0;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;

  &:hover {
    background: rgba(239, 68, 68, 0.3);
    border-color: rgba(239, 68, 68, 0.8);
    transform: scale(1.05);
  }
`;

const Grid = styled.div<{ columns?: number }>`
  display: grid;
  grid-template-columns: repeat(${props => props.columns || 4}, 1fr);
  gap: 20px;
  margin-bottom: 30px;

  @media (max-width: 1200px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
  }
`;

const StatCard = styled(motion.div)<{ color?: string }>`
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 251, 0.98) 100%);
  border: 1px solid ${props => props.color ? `${props.color}60` : 'rgba(168, 213, 232, 0.4)'};
  border-radius: 0;
  padding: 24px;
  box-shadow:
    0 4px 16px rgba(90, 139, 184, 0.12),
    0 0 0 1px ${props => props.color ? `${props.color}20` : 'rgba(168, 213, 232, 0.2)'};
  backdrop-filter: blur(10px);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow:
      0 8px 24px rgba(90, 139, 184, 0.18),
      0 0 0 1px ${props => props.color ? `${props.color}40` : 'rgba(168, 213, 232, 0.3)'};
  }
`;

const StatHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const StatLabel = styled.div`
  font-size: 0.9rem;
  color: #5a8bb8;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 1px;
`;

const StatIcon = styled.div<{ color?: string }>`
  width: 40px;
  height: 40px;
  border-radius: 0;
  background: ${props => props.color ? `${props.color}25` : 'rgba(168, 213, 232, 0.3)'};
  border: 1px solid ${props => props.color ? `${props.color}80` : 'rgba(168, 213, 232, 0.5)'};
  display: flex;
  align-items: center;
  justify-content: center;
  color: ${props => props.color || '#5a8bb8'};
`;

const StatValue = styled.div<{ color?: string }>`
  font-size: 2.5rem;
  font-weight: 900;
  background: ${props => props.color ? `linear-gradient(135deg, ${props.color} 0%, ${props.color}dd 100%)` : 'linear-gradient(135deg, #5a8bb8 0%, #7d9fbe 100%)'};
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin-bottom: 4px;
  font-family: 'Orbitron', monospace;
`;

const StatSubtext = styled.div`
  font-size: 0.85rem;
  color: #7d9fbe;
  font-weight: 500;
`;

const Section = styled.div`
  margin-bottom: 30px;
`;

const SectionTitle = styled.h2`
  font-size: 1.5rem;
  font-weight: 700;
  color: #5a8bb8;
  margin: 0 0 20px 0;
  display: flex;
  align-items: center;
  gap: 12px;

  svg {
    color: #7d9fbe;
  }
`;

const ListCard = styled(StatCard)`
  grid-column: span 2;

  @media (max-width: 768px) {
    grid-column: span 1;
  }
`;

const ListItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: rgba(168, 213, 232, 0.08);
  border: 1px solid rgba(168, 213, 232, 0.25);
  border-radius: 0;
  margin-bottom: 10px;
  transition: all 0.2s ease;

  &:hover {
    background: rgba(168, 213, 232, 0.15);
    border-color: rgba(168, 213, 232, 0.4);
    transform: translateX(4px);
  }

  &:last-child {
    margin-bottom: 0;
  }
`;

const ListItemLabel = styled.div`
  font-weight: 600;
  color: #2c3e50;
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ListItemValue = styled.div`
  font-weight: 700;
  color: #5a8bb8;
  font-family: 'Orbitron', monospace;
`;

const Badge = styled.span<{ color?: string }>`
  background: ${props => props.color ? `${props.color}25` : 'rgba(168, 213, 232, 0.3)'};
  border: 1px solid ${props => props.color ? `${props.color}80` : 'rgba(168, 213, 232, 0.5)'};
  color: ${props => props.color || '#5a8bb8'};
  padding: 4px 10px;
  border-radius: 0;
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
`;

const ProgressBar = styled.div`
  width: 100%;
  height: 8px;
  background: rgba(168, 213, 232, 0.2);
  border-radius: 0;
  overflow: hidden;
  margin-top: 12px;
`;

const ProgressFill = styled.div<{ width: number; color?: string }>`
  height: 100%;
  width: ${props => props.width}%;
  background: ${props => props.color ? `linear-gradient(90deg, ${props.color} 0%, ${props.color}dd 100%)` : 'linear-gradient(90deg, #5a8bb8 0%, #7d9fbe 100%)'};
  transition: width 1s ease;
`;

export const Dashboard: React.FC<DashboardProps> = ({ onClose }) => {
  const [summary, setSummary] = useState<any>(null);
  const [topDesks, setTopDesks] = useState<any[]>([]);
  const [teamTrends, setTeamTrends] = useState<any[]>([]);
  const [remoteWorkTrends, setRemoteWorkTrends] = useState<any[]>([]);
  const [durationStats, setDurationStats] = useState<any>(null);
  const [utilization, setUtilization] = useState<any>(null);

  useEffect(() => {
    // Load all trend data
    setSummary(trendService.getInsightsSummary());
    setTopDesks(trendService.getTopDesks(10));
    setTeamTrends(trendService.getTeamTrends());
    setRemoteWorkTrends(trendService.getRemoteWorkTrends());
    setDurationStats(trendService.getBookingDurationStats());
    setUtilization(trendService.getDeskUtilizationInsights());
  }, []);

  if (!summary) return null;

  return (
    <DashboardOverlay
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <DashboardContainer
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
      >
        <Header>
          <Title>📊 Analytics Dashboard</Title>
          <CloseButton onClick={onClose}>
            <X size={20} />
          </CloseButton>
        </Header>

        {/* Key Metrics */}
        <Section>
          <SectionTitle>
            <Activity size={24} />
            Key Metrics
          </SectionTitle>
          <Grid columns={4}>
            <StatCard color="#A8D5E8">
              <StatHeader>
                <StatLabel>Total Bookings</StatLabel>
                <StatIcon color="#A8D5E8">
                  <Calendar size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#5a8bb8">{summary.total_bookings}</StatValue>
              <StatSubtext>All time</StatSubtext>
            </StatCard>

            <StatCard color="#C5E8D4">
              <StatHeader>
                <StatLabel>Unique Employees</StatLabel>
                <StatIcon color="#C5E8D4">
                  <Users size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#6ba585">{summary.total_unique_employees}</StatValue>
              <StatSubtext>Active users</StatSubtext>
            </StatCard>

            <StatCard color="#D4C5E8">
              <StatHeader>
                <StatLabel>Desks Used</StatLabel>
                <StatIcon color="#D4C5E8">
                  <MapPin size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#8b7ba8">{summary.total_unique_desks}</StatValue>
              <StatSubtext>Different desks</StatSubtext>
            </StatCard>

            <StatCard color="#F5C5B6">
              <StatHeader>
                <StatLabel>Avg Duration</StatLabel>
                <StatIcon color="#F5C5B6">
                  <TrendingUp size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#c89a8b">{summary.avg_booking_duration_days}d</StatValue>
              <StatSubtext>Per booking</StatSubtext>
            </StatCard>
          </Grid>
        </Section>

        {/* Additional Metrics */}
        <Section>
          <Grid columns={3}>
            <StatCard color="#A8D5E8">
              <StatHeader>
                <StatLabel>Desk Utilization</StatLabel>
                <StatIcon color="#A8D5E8">
                  <BarChart3 size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#5a8bb8">{summary.desk_utilization_rate.toFixed(1)}%</StatValue>
              <ProgressBar>
                <ProgressFill width={summary.desk_utilization_rate} color="#5a8bb8" />
              </ProgressBar>
            </StatCard>

            <StatCard color="#E8C5D4">
              <StatHeader>
                <StatLabel>Remote Work Avg</StatLabel>
                <StatIcon color="#E8C5D4">
                  <PieChart size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#c898a8">{(summary.avg_remote_work_ratio * 100).toFixed(0)}%</StatValue>
              <ProgressBar>
                <ProgressFill width={summary.avg_remote_work_ratio * 100} color="#c898a8" />
              </ProgressBar>
            </StatCard>

            <StatCard color="#C5E8D4">
              <StatHeader>
                <StatLabel>Most Active</StatLabel>
                <StatIcon color="#C5E8D4">
                  <TrendingUp size={20} />
                </StatIcon>
              </StatHeader>
              <StatValue color="#6ba585" style={{ fontSize: '1.5rem' }}>{summary.most_active_team}</StatValue>
              <StatSubtext>Team</StatSubtext>
            </StatCard>
          </Grid>
        </Section>

        {/* Top Desks */}
        <Section>
          <SectionTitle>
            <TrendingUp size={24} />
            Top 10 Most Popular Desks
          </SectionTitle>
          <Grid columns={2}>
            <ListCard color="#A8D5E8">
              {topDesks.slice(0, 5).map((desk, index) => (
                <ListItem key={desk.desk_id}>
                  <ListItemLabel>
                    <Badge color="#5a8bb8">#{index + 1}</Badge>
                    {desk.desk_id}
                  </ListItemLabel>
                  <ListItemValue>{desk.total_bookings} bookings</ListItemValue>
                </ListItem>
              ))}
            </ListCard>

            <ListCard color="#C5E8D4">
              {topDesks.slice(5, 10).map((desk, index) => (
                <ListItem key={desk.desk_id}>
                  <ListItemLabel>
                    <Badge color="#6ba585">#{index + 6}</Badge>
                    {desk.desk_id}
                  </ListItemLabel>
                  <ListItemValue>{desk.total_bookings} bookings</ListItemValue>
                </ListItem>
              ))}
            </ListCard>
          </Grid>
        </Section>

        {/* Team Trends */}
        <Section>
          <SectionTitle>
            <Users size={24} />
            Team Analytics
          </SectionTitle>
          <Grid columns={1}>
            <ListCard color="#D4C5E8">
              {teamTrends.map((team) => (
                <ListItem key={team.team}>
                  <ListItemLabel>
                    <Badge color="#8b7ba8">{team.team}</Badge>
                    <span style={{ fontSize: '0.85rem', color: '#7d9fbe' }}>
                      {team.unique_employees} employees • {team.desk_hopping_rate.toFixed(1)} desks/person
                    </span>
                  </ListItemLabel>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#5a8bb8' }}>
                      {(team.avg_remote_ratio * 100).toFixed(0)}% remote
                    </span>
                    <ListItemValue>{team.total_bookings} bookings</ListItemValue>
                  </div>
                </ListItem>
              ))}
            </ListCard>
          </Grid>
        </Section>

        {/* Duration Stats */}
        {durationStats && (
          <Section>
            <SectionTitle>
              <Calendar size={24} />
              Booking Duration Statistics
            </SectionTitle>
            <Grid columns={4}>
              <StatCard color="#A8D5E8">
                <StatLabel>Average</StatLabel>
                <StatValue color="#5a8bb8">{durationStats.average_days}d</StatValue>
              </StatCard>
              <StatCard color="#D4C5E8">
                <StatLabel>Median</StatLabel>
                <StatValue color="#8b7ba8">{durationStats.median_days}d</StatValue>
              </StatCard>
              <StatCard color="#F5C5B6">
                <StatLabel>Minimum</StatLabel>
                <StatValue color="#c89a8b">{durationStats.min_days}d</StatValue>
              </StatCard>
              <StatCard color="#E8C5D4">
                <StatLabel>Maximum</StatLabel>
                <StatValue color="#c898a8">{durationStats.max_days}d</StatValue>
              </StatCard>
            </Grid>
          </Section>
        )}

        {/* Utilization Insights */}
        {utilization && (
          <Section>
            <SectionTitle>
              <BarChart3 size={24} />
              Desk Utilization Insights
            </SectionTitle>
            <Grid columns={2}>
              <StatCard color="#C5E8D4">
                <StatHeader>
                  <StatLabel>Hotspot Desks</StatLabel>
                  <StatIcon color="#C5E8D4">
                    <TrendingUp size={20} />
                  </StatIcon>
                </StatHeader>
                <StatValue color="#6ba585">{utilization.hotspots.length}</StatValue>
                <StatSubtext>Top 20% most used desks</StatSubtext>
              </StatCard>

              <StatCard color="#E8C5D4">
                <StatHeader>
                  <StatLabel>Underutilized</StatLabel>
                  <StatIcon color="#E8C5D4">
                    <TrendingDown size={20} />
                  </StatIcon>
                </StatHeader>
                <StatValue color="#c898a8">{utilization.underutilized.length}</StatValue>
                <StatSubtext>Bottom 20% least used desks</StatSubtext>
              </StatCard>
            </Grid>
          </Section>
        )}

        {/* Monthly Trends */}
        <Section>
          <SectionTitle>
            <TrendingUp size={24} />
            Monthly Booking Trends
          </SectionTitle>
          <Grid columns={1}>
            <ListCard color="#A8D5E8">
              {remoteWorkTrends.slice(-6).map((trend) => (
                <ListItem key={trend.period}>
                  <ListItemLabel>
                    <Badge color="#5a8bb8">{trend.period}</Badge>
                  </ListItemLabel>
                  <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.85rem', color: '#7d9fbe' }}>
                      {(trend.avg_remote_ratio * 100).toFixed(0)}% remote
                    </span>
                    <ListItemValue>{trend.total_bookings} bookings</ListItemValue>
                  </div>
                </ListItem>
              ))}
            </ListCard>
          </Grid>
        </Section>
      </DashboardContainer>
    </DashboardOverlay>
  );
};
