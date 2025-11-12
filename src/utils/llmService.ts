import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from "@aws-sdk/client-bedrock-runtime";
import { 
  Seat, 
  SeatRecommendation, 
  UserPreferences, 
  Schedule, 
  Zone
} from '../types';

// Import office layout data
import officeLayoutData from '../data/office_layout.json';
import { BookingHistoryService } from '../services/bookingHistoryService';

export interface LLMProvider {
  generateResponse(prompt: string, context: ConversationContext): Promise<string>;
}

export interface ConversationContext {
  userMessage: string;
  availableSeats: Seat[];
  zones: Zone[];
  userPreferences: UserPreferences;
  userSchedule: Schedule[];
  recommendations?: SeatRecommendation[];
  conversationHistory: string[];
  currentTime: Date;
}

class BedrockProvider implements LLMProvider {
  private client: BedrockRuntimeClient;
  private modelId: string;

  constructor(region?: string, modelId?: string) {
    // Use environment variables with REACT_APP_ prefix (required for React)
    const awsRegion = region || process.env.REACT_APP_AWS_DEFAULT_REGION || 'us-east-1';
    this.modelId = modelId || process.env.REACT_APP_AWS_BEDROCK_MODEL_ID || 'anthropic.claude-3-sonnet-20240229-v1:0';
    
    // Debug: Check what environment variables are available
    console.log('🔍 Environment Variables Debug:', {
      'process.env.REACT_APP_AWS_ACCESS_KEY_ID': process.env.REACT_APP_AWS_ACCESS_KEY_ID ? 'SET' : 'NOT SET',
      'process.env.REACT_APP_AWS_SECRET_ACCESS_KEY': process.env.REACT_APP_AWS_SECRET_ACCESS_KEY ? 'SET' : 'NOT SET',
      'process.env.REACT_APP_AWS_SESSION_TOKEN': process.env.REACT_APP_AWS_SESSION_TOKEN ? 'SET' : 'NOT SET',
      'All env vars': Object.keys(process.env).filter(key => key.startsWith('REACT_APP_AWS'))
    });
    
    // Configure the Bedrock client with credentials from environment
    const credentials: any = {
      accessKeyId: process.env.REACT_APP_AWS_ACCESS_KEY_ID || '',
      secretAccessKey: process.env.REACT_APP_AWS_SECRET_ACCESS_KEY || ''
    };
    
    // Add session token if available (for temporary credentials)
    if (process.env.REACT_APP_AWS_SESSION_TOKEN) {
      credentials.sessionToken = process.env.REACT_APP_AWS_SESSION_TOKEN;
    }
    
    console.log('🔑 Bedrock Credentials Check:', {
      hasAccessKey: !!credentials.accessKeyId,
      hasSecretKey: !!credentials.secretAccessKey,
      hasSessionToken: !!credentials.sessionToken,
      accessKeyLength: credentials.accessKeyId?.length || 0,
      region: awsRegion,
      modelId: this.modelId
    });
    
    this.client = new BedrockRuntimeClient({ 
      region: awsRegion,
      credentials
    });
  }

  async generateResponse(prompt: string, context: ConversationContext): Promise<string> {
    try {
      // Build context information separately from user instructions
      const contextData = this.buildContextData(context);
      const systemInstructions = this.buildSystemInstructions();
      
      // Build the request body for Claude on Bedrock
      const body = JSON.stringify({
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 200, // Reduced for shorter responses
        temperature: 0.7,
        system: systemInstructions,
        messages: [
          { 
            role: "user", 
            content: `CONTEXT DATA:
${contextData}

USER REQUEST: ${prompt}

Please analyze the context data and respond to the user request with the top 3 seat recommendations.` 
          }
        ],
      });

      // Prepare the command
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        body,
      });

      // Invoke the model
      const response = await this.client.send(command);

      // Decode the streaming body
      const responseBody = JSON.parse(
        new TextDecoder().decode(response.body)
      );

      return responseBody.content[0]?.text || 'I apologize, but I encountered an issue processing your request. Please try again.';
    } catch (error) {
      console.error('Bedrock API Error:', error);
      throw error;
    }
  }

  private buildSystemInstructions(): string {
    return `You are AI Desk Buddy 2.0, a smart office seating assistant. 

CRITICAL RULES:
1. ONLY recommend seats that appear in the "AVAILABLE SEAT IDS" list in the context
2. NEVER suggest seats that are not in the available list - they are already booked
3. If a seat doesn't appear in available seats, it means someone has already booked it
4. PRIORITIZE seats from the "SEAT HISTORY DATA" that match the user's team or previous preferences
5. Give HIGHER SCORES (90-95%) to seats with good historical usage by the same team

INSTRUCTIONS:
1. Analyze the office layout data (which only shows currently available seats)
2. Check the seat history data to see which seats are popular with the user's team
3. Respond to the user's request with exactly 3 seat recommendations
4. Format each recommendation as: "Seat [ID] ([percentage]% match) - [brief reason]"
5. Order seats by highest match percentage
6. Keep response concise (2-3 sentences max)
7. If user mentions specific team (devops, engineering, product, etc.), prioritize those team's seats from history
8. If user mentions preferences (window, quiet, etc.), factor those into recommendations

SCORING GUIDELINES:
- Seats with team history: 85-95% match
- Seats matching preferences: 75-85% match  
- Good location seats: 65-75% match
- Basic available seats: 50-65% match

RESPONSE FORMAT:
Seat [ID] ([percentage]% match) - [reason]
Seat [ID] ([percentage]% match) - [reason]  
Seat [ID] ([percentage]% match) - [reason]

Brief explanation of why these are the best matches.

REMEMBER: Only suggest seats from the available list - never recommend booked seats!`;
  }

  private buildContextData(context: ConversationContext): string {
    const { availableSeats, zones, userPreferences, userSchedule, recommendations, currentTime } = context;
    
    // Filter office layout data to only include available seats
    const availableDesks = officeLayoutData.desks.filter(desk => 
      desk.status === 'available' && !desk.reserved_for
    );
    
    const filteredOfficeData = {
      ...officeLayoutData,
      desks: availableDesks
    };
    
    const officeData = JSON.stringify(filteredOfficeData, null, 2);
    
    // Get seat history data
    const teamHistory = userPreferences.team ? 
      BookingHistoryService.getHistoryForTeam(userPreferences.team) : [];
    
    const seatPopularity = BookingHistoryService.getSeatPopularityData();
    
    // Build seat history context for available seats only
    const availableSeatIds = availableSeats.map(seat => seat.id);
    const relevantHistory = Array.from(seatPopularity.entries())
      .filter(([seatId]) => availableSeatIds.includes(seatId))
      .map(([seatId, data]) => ({
        seatId,
        bookingCount: data.count,
        teams: data.teams,
        isTeamPreferred: userPreferences.team ? data.teams.includes(userPreferences.team) : false
      }))
      .sort((a, b) => {
        // Sort by team preference first, then by booking count
        if (a.isTeamPreferred && !b.isTeamPreferred) return -1;
        if (!a.isTeamPreferred && b.isTeamPreferred) return 1;
        return b.bookingCount - a.bookingCount;
      });
    
    // Current system state
    const currentState = `
CURRENT OFFICE STATE:
Time: ${currentTime.toLocaleTimeString()}
Available seats: ${availableSeats.length} seats

SEAT HISTORY DATA (HIGHER SCORES FOR TEAM MATCHES):
${relevantHistory.length > 0 ? 
  relevantHistory.slice(0, 10).map(h => 
    `Seat ${h.seatId}: ${h.bookingCount} bookings, Teams: ${h.teams.join('/')}, ${h.isTeamPreferred ? '⭐ TEAM PREFERRED' : 'Other teams'}`
  ).join('\n') 
  : 'No historical data available for current available seats'}

${userPreferences.team ? `
TEAM ${userPreferences.team.toUpperCase()} HISTORICAL PREFERENCES:
${teamHistory.length > 0 ? 
  teamHistory.slice(-10).map(h => 
    `${h.employee_name} used ${h.desk_id} (${h.start_date} to ${h.end_date})`
  ).join('\n')
  : `No historical data for ${userPreferences.team} team`}` : ''}

ZONES ACTIVITY:
${zones.map(zone => `${zone.name}: ${zone.currentActivity}% activity, ${availableSeats.filter(s => s.zone === zone.type).length} available seats`).join('\n')}

AVAILABLE SEAT IDS (ONLY RECOMMEND FROM THESE):
${availableSeats.map(seat => seat.id).sort().join(', ')}

CURRENT TOP RECOMMENDATIONS:
${recommendations && recommendations.length > 0 
  ? recommendations.slice(0, 5).map(r => 
      `Seat ${r.seat.id} (${Math.round(r.score)}% match) - ${r.reasons.slice(0, 2).join(', ')}`
    ).join('\n')
  : 'No current recommendations available'}

USER PREFERENCES:
${userPreferences.team ? `Team: ${userPreferences.team}` : 'No team specified'}
Work Style: ${userPreferences.workStyle}
Collaboration Needs: ${userPreferences.collaborationNeeds}
Preferred Zones: ${userPreferences.preferredZones.join(', ')}
Seat Features: ${userPreferences.seatFeatures.join(', ')}

OFFICE LAYOUT DATA (AVAILABLE SEATS ONLY):
${officeData}`;

    return currentState;
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}

export class LLMService {
  private provider: LLMProvider;

  constructor(region?: string, modelId?: string) {
    this.provider = new BedrockProvider(region, modelId);
  }

  async generateResponse(userMessage: string, context: ConversationContext): Promise<string> {
    console.log('Attempting Bedrock API call...');
    const response = await this.provider.generateResponse(userMessage, context);
    console.log('Bedrock API call successful');
    return response;
  }

  // Method to update Bedrock configuration dynamically
  updateBedrockConfig(region?: string, modelId?: string): void {
    try {
      this.provider = new BedrockProvider(region, modelId);
    } catch (error) {
      console.error('Failed to update Bedrock configuration:', error);
    }
  }

  // Method to test if the service is working
  async testConnection(): Promise<boolean> {
    try {
      // Test context with all required UserPreferences fields
      const testContext: ConversationContext = {
        userMessage: 'test',
        availableSeats: [],
        zones: [],
        userPreferences: {
          team: 'Engineering', // Default team
          workStyle: 'mixed',
          collaborationNeeds: 'medium',
          preferredZones: [],
          timePreferences: { morningPerson: true, afternoonFocus: true },
          seatFeatures: [],
          amenityPreferences: {
            avoidColdAreas: false,
            preferAisle: false,
            nearMeetingRooms: true
          }
        },
        userSchedule: [],
        conversationHistory: [],
        currentTime: new Date()
      };

      await this.provider.generateResponse('test', testContext);
      return true;
    } catch (error) {
      return false;
    }
  }
}