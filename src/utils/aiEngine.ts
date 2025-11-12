import { 
  Seat, 
  SeatRecommendation, 
  UserPreferences, 
  Schedule, 
  Zone, 
  ZoneType, 
  AIResponse 
} from '../types';
import { addHours, isAfter, isBefore, format } from 'date-fns';
import { LLMService, ConversationContext } from './llmService';
import { BookingHistoryService } from '../services/bookingHistoryService';

export class AIRecommendationEngine {
  public seats: Seat[];
  private zones: Zone[];
  private currentTime: Date;
  private llmService: LLMService;
  private conversationHistory: string[] = [];

  constructor(seats: Seat[], zones: Zone[], region?: string, modelId?: string) {
    this.seats = seats;
    this.zones = zones;
    this.currentTime = new Date();
    this.llmService = new LLMService(region, modelId);
  }

  // Main method to process user messages and return AI responses
  async processUserMessage(
    message: string,
    userPreferences: UserPreferences,
    userSchedule: Schedule[]
  ): Promise<AIResponse> {
    const lowercaseMessage = message.toLowerCase();
    
    // Add to conversation history
    this.conversationHistory.push(`User: ${message}`);
    
    // Extract preferences from the message to enhance recommendations
    const enhancedPreferences = this.extractPreferencesFromMessage(message, userPreferences);
    
    // Intent detection and recommendations
    let recommendations: SeatRecommendation[] = [];
    
    if (this.isSeatingRequest(lowercaseMessage)) {
      recommendations = this.generateRecommendations(enhancedPreferences, userSchedule);
      
      // If user specifically asked for window seats, filter to only window seats
      if (lowercaseMessage.includes('window')) {
        console.log('🪟 User requested window seat - original recommendations:', recommendations.length);
        console.log('🔍 Original recommendations:', recommendations.map(r => ({
          id: r.seat.id,
          features: r.seat.features,
          distanceToWindow: r.seat.distanceMetrics?.toNearestWindow,
          hasWindowFeature: r.seat.features?.some(f => f.type === 'window-view'),
          rawSeat: (r.seat as any).window
        })));
        
        const windowRecommendations = recommendations.filter(rec => {
          const hasWindowFeature = rec.seat.features?.some(f => f.type === 'window-view');
          const isCloseToWindow = rec.seat.distanceMetrics?.toNearestWindow && rec.seat.distanceMetrics.toNearestWindow < 5;
          const hasRawWindowProperty = (rec.seat as any).window === true;
          
          const isWindowSeat = hasWindowFeature || isCloseToWindow || hasRawWindowProperty;
          
          console.log(`🪟 Seat ${rec.seat.id}:`, {
            hasWindowFeature,
            isCloseToWindow,
            hasRawWindowProperty,
            isWindowSeat,
            features: rec.seat.features?.map(f => f.type)
          });
          
          return isWindowSeat;
        });
        
        console.log(`🪟 After filtering: ${windowRecommendations.length} window seats found`);
        
        if (windowRecommendations.length > 0) {
          recommendations = windowRecommendations;
          // Update reasons to emphasize window feature
          recommendations.forEach(rec => {
            if (!rec.reasons.some(r => r.toLowerCase().includes('window'))) {
              rec.reasons.unshift('Window view available');
            }
          });
        } else {
          console.log('🔍 No window recommendations found, searching all available seats...');
          // If no window seats found in recommendations, find available window seats manually
          const allWindowSeats = this.seats.filter(seat => {
            if (!seat.isAvailable) return false;
            
            const hasWindowFeature = seat.features?.some(f => f.type === 'window-view');
            const isCloseToWindow = seat.distanceMetrics?.toNearestWindow && seat.distanceMetrics.toNearestWindow < 5;
            const hasRawWindowProperty = (seat as any).window === true;
            
            return hasWindowFeature || isCloseToWindow || hasRawWindowProperty;
          });
          
          console.log(`🪟 Found ${allWindowSeats.length} available window seats:`, allWindowSeats.map(s => ({
            id: s.id,
            features: s.features?.map(f => f.type),
            distanceToWindow: s.distanceMetrics?.toNearestWindow
          })));
          
          if (allWindowSeats.length > 0) {
            // Create recommendations for window seats with proper scoring
            recommendations = allWindowSeats.slice(0, 3).map((seat, index) => ({
              seat,
              score: 95 - (index * 3), // 95%, 92%, 89% etc.
              reasons: ['Window view available', 'Natural light', 'Matches your window request'],
              matchedPreferences: ['window-view'],
              timeSlots: [{ start: new Date(), end: new Date(Date.now() + 4 * 60 * 60 * 1000), available: true }]
            }));
          } else {
            // No window seats available at all
            console.log('❌ No window seats available');
            return {
              message: "Sorry, no window seats are currently available. Would you like me to recommend other seats or check for window seat availability later?",
              recommendations: [],
              suggestedActions: ["Check availability later", "Find alternative seats", "Set window seat alert"],
              followUpQuestions: ["Would you prefer a quiet seat instead?", "Are you flexible on timing?", "Should I notify you when window seats become available?"]
            };
          }
        }
      }
    }
    
    // Build context for LLM
    const context: ConversationContext = {
      userMessage: message,
      availableSeats: this.seats.filter(s => s.isAvailable),
      zones: this.zones,
      userPreferences,
      userSchedule,
      recommendations,
      conversationHistory: this.conversationHistory.slice(-10), // Last 10 messages
      currentTime: this.currentTime
    };
    
    try {
      // Get dynamic response from LLM
      const aiMessage = await this.llmService.generateResponse(message, context);
      
      // Add AI response to history
      this.conversationHistory.push(`AI: ${aiMessage}`);
      
      // Extract seat IDs from LLM response and align recommendations
      const llmRecommendedSeats = this.extractSeatIDsFromLLMResponse(aiMessage);
      let finalRecommendations = recommendations;
      
      if (llmRecommendedSeats.length > 0) {
        // Align internal recommendations with LLM suggestions
        finalRecommendations = this.alignRecommendationsWithLLM(llmRecommendedSeats, recommendations);
      }
      
      // Determine suggested actions based on intent and context
      const suggestedActions = this.getSuggestedActions(lowercaseMessage, finalRecommendations);
      const followUpQuestions = this.getFollowUpQuestions(lowercaseMessage, finalRecommendations);
      
      return {
        message: aiMessage,
        recommendations: finalRecommendations.length > 0 ? finalRecommendations.slice(0, 3) : undefined,
        suggestedActions,
        followUpQuestions
      };
    } catch (error) {
      console.error('Error processing message with LLM:', error);
      
      // Fallback to original logic if LLM fails
      return this.handleFallbackResponse(message, userPreferences, userSchedule);
    }
  }

  // Check if user is asking for seat recommendations
  private isSeatingRequest(message: string): boolean {
    const seatingKeywords = [
      'recommend', 'suggest', 'find', 'seat', 'desk', 'where should i sit',
      'best place', 'good spot', 'need a seat', 'book', 'reserve', 'window'
    ];
    return seatingKeywords.some(keyword => message.includes(keyword));
  }

  // Extract preferences from user message
  private extractPreferencesFromMessage(message: string, basePreferences: UserPreferences): UserPreferences {
    const lowerMessage = message.toLowerCase();
    const updatedPreferences = { ...basePreferences };

    // Window seat detection
    if (lowerMessage.includes('window') || lowerMessage.includes('view')) {
      updatedPreferences.seatFeatures = [...(updatedPreferences.seatFeatures || [])];
      if (!updatedPreferences.seatFeatures.includes('window-view')) {
        updatedPreferences.seatFeatures.push('window-view');
      }
      // Add nearWindow preference for filtering
      (updatedPreferences as any).nearWindow = true;
    }

    // Quiet/focus work detection
    if (lowerMessage.includes('quiet') || lowerMessage.includes('focus') || lowerMessage.includes('concentrated')) {
      updatedPreferences.workStyle = 'quiet';
      updatedPreferences.collaborationNeeds = 'low';
    }

    // Collaborative work detection
    if (lowerMessage.includes('collaborate') || lowerMessage.includes('team') || lowerMessage.includes('brainstorm')) {
      updatedPreferences.workStyle = 'social';
      updatedPreferences.collaborationNeeds = 'high';
    }

    // Standing desk detection
    if (lowerMessage.includes('standing')) {
      updatedPreferences.seatFeatures = [...(updatedPreferences.seatFeatures || [])];
      if (!updatedPreferences.seatFeatures.includes('standing-desk')) {
        updatedPreferences.seatFeatures.push('standing-desk');
      }
    }

    // Monitor preference
    if (lowerMessage.includes('monitor') || lowerMessage.includes('screen')) {
      updatedPreferences.seatFeatures = [...(updatedPreferences.seatFeatures || [])];
      if (!updatedPreferences.seatFeatures.includes('monitor')) {
        updatedPreferences.seatFeatures.push('monitor');
      }
    }

    // Team preference extraction
    if (lowerMessage.includes('devops') || lowerMessage.includes('dev ops')) {
      updatedPreferences.team = 'DevOps';
    } else if (lowerMessage.includes('engineering') || lowerMessage.includes('eng')) {
      updatedPreferences.team = 'Engineering';
    } else if (lowerMessage.includes('product') || lowerMessage.includes('prod')) {
      updatedPreferences.team = 'Product';
    } else if (lowerMessage.includes('risk')) {
      updatedPreferences.team = 'Risk';
    } else if (lowerMessage.includes('it security') || lowerMessage.includes('security')) {
      updatedPreferences.team = 'IT Security';
    }

    console.log(`🔍 Extracted team preference: "${updatedPreferences.team}" from message: "${message}"`);

    return updatedPreferences;
  }

  // Check if user is asking about availability
  private isAvailabilityQuery(message: string): boolean {
    const availabilityKeywords = [
      'available', 'free', 'empty', 'occupied', 'busy', 'taken', 'status'
    ];
    return availabilityKeywords.some(keyword => message.includes(keyword));
  }

  // Check if user is asking about zones
  private isZoneQuery(message: string): boolean {
    const zoneKeywords = [
      'zone', 'area', 'quiet', 'social', 'collaborative', 'focus', 'meeting',
      'noisy', 'busy area', 'calm', 'peaceful'
    ];
    return zoneKeywords.some(keyword => message.includes(keyword));
  }

  // Check if user is asking about schedule
  private isScheduleQuery(message: string): boolean {
    const scheduleKeywords = [
      'schedule', 'meeting', 'calendar', 'appointment', 'busy', 'free time',
      'when', 'time', 'today', 'tomorrow', 'next'
    ];
    return scheduleKeywords.some(keyword => message.includes(keyword));
  }

  // Handle seating requests with AI recommendations
  private handleSeatingRequest(
    message: string,
    userPreferences: UserPreferences,
    userSchedule: Schedule[]
  ): AIResponse {
    const recommendations = this.generateRecommendations(userPreferences, userSchedule);
    
    if (recommendations.length === 0) {
      return {
        message: "I'm sorry, but there are no available seats that match your preferences right now. Would you like me to check for availability later today or suggest some alternative options?",
        followUpQuestions: [
          "Check availability in 30 minutes",
          "Show me any available seat",
          "Set up a notification when preferred seats become available"
        ]
      };
    }

    const contextualMessage = this.generateContextualMessage(message, recommendations, userPreferences);
    
    return {
      message: contextualMessage,
      recommendations: recommendations.slice(0, 3), // Show top 3 recommendations
      suggestedActions: [
        "Book recommended seat",
        "See more options",
        "Set preferences",
        "Check my schedule"
      ],
      followUpQuestions: [
        "What are the features of this seat?",
        "How long can I book it for?",
        "What's the vibe like in this area?"
      ]
    };
  }

  // Generate contextual message based on user input and recommendations
  private generateContextualMessage(
    message: string,
    recommendations: SeatRecommendation[],
    preferences: UserPreferences
  ): string {
    const topRec = recommendations[0];
    const timeOfDay = this.getTimeOfDay();
    
    let contextMessage = `Great choice for ${timeOfDay}! `;
    
    // Analyze the user's specific request
    if (message.toLowerCase().includes('quiet')) {
      contextMessage += `I found some perfect quiet spots for you. `;
    } else if (message.toLowerCase().includes('collaboration') || message.toLowerCase().includes('team')) {
      contextMessage += `I've selected collaborative spaces that are great for teamwork. `;
    } else if (message.toLowerCase().includes('focus')) {
      contextMessage += `These focus-friendly seats should help you get in the zone. `;
    } else {
      contextMessage += `Based on your preferences for ${preferences.workStyle} work, `;
    }

    contextMessage += `Seat ${topRec.seat.id} in the ${topRec.seat.zone} zone is your best match with a ${Math.round(topRec.score)}% compatibility score. `;
    
    // Add specific reasons
    const primaryReason = topRec.reasons[0];
    contextMessage += primaryReason + ". ";
    
    // Add time-based context
    const availableUntil = topRec.timeSlots[0]?.end;
    if (availableUntil) {
      contextMessage += `It's available until ${format(availableUntil, 'h:mm a')}.`;
    }
    
    return contextMessage;
  }

  // Generate seat recommendations based on user preferences and schedule
  generateRecommendations(
    preferences: UserPreferences,
    schedule: Schedule[]
  ): SeatRecommendation[] {
    const availableSeats = this.seats.filter(seat => seat.isAvailable);
    
    if (availableSeats.length === 0) {
      return [];
    }

    const scoredSeats = availableSeats.map(seat => {
      const score = this.calculateSeatScore(seat, preferences, schedule);
      const reasons = this.generateReasons(seat, preferences, score);
      const timeSlots = this.calculateAvailableTimeSlots(seat, schedule);
      
      return {
        seat,
        score,
        reasons,
        matchedPreferences: this.getMatchedPreferences(seat, preferences),
        timeSlots
      };
    });

    // Sort by score and return top recommendations
    return scoredSeats
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);
  }

  // Calculate seat score based on multiple factors
  private calculateSeatScore(
    seat: Seat,
    preferences: UserPreferences,
    schedule: Schedule[]
  ): number {
    let score = 50; // Start with base score of 50
    const maxScore = 100;

    // Historical preference boost (NEW - 20 points max)
    const historyBonus = this.getHistoryBonus(seat, preferences);
    score += Math.min(historyBonus, 20);

    // Team zone matching (15 point bonus - reduced from 20)
    const teamBonus = this.getTeamZoneBonus(seat, preferences.team);
    score += Math.min(teamBonus, 15);

    // Zone preference matching (20 points max - reduced from 30)
    if (preferences.preferredZones.includes(seat.zone)) {
      score += 20;
    } else {
      // Partial points for compatible zones
      score += Math.min(this.getZoneCompatibilityScore(seat.zone, preferences), 10);
    }

    // Work style matching (15 points max - reduced)
    score += Math.min(this.getWorkStyleScore(seat, preferences.workStyle), 15);

    // Feature matching (10 points max - reduced from 20)
    const featureMatch = seat.features.filter(f => 
      preferences.seatFeatures.includes(f.type)
    ).length / Math.max(preferences.seatFeatures.length, 1);
    score += featureMatch * 10;

    // Window preference bonus (high priority for window requests)
    if ((preferences as any).nearWindow) {
      const hasWindowFeature = seat.features?.some(f => f.type === 'window-view');
      const isCloseToWindow = seat.distanceMetrics?.toNearestWindow && seat.distanceMetrics.toNearestWindow < 5;
      const hasRawWindowProperty = (seat as any).window === true;
      
      if (hasWindowFeature || isCloseToWindow || hasRawWindowProperty) {
        score += 25; // Reduced bonus for window seats when requested
      } else {
        score -= 25; // Penalty for non-window seats when window is requested
      }
    }

    // Time-based preferences (10 points max)
    score += Math.min(this.getTimePreferenceScore(preferences.timePreferences), 10);

    // Collaboration needs (10 points max)
    score += Math.min(this.getCollaborationScore(seat, preferences.collaborationNeeds), 10);

    // Proximity to scheduled meetings bonus (5 points max)
    const meetingBonus = this.getMeetingProximityBonus(seat, schedule);
    score += Math.min(meetingBonus, 5);

    // Activity level consideration (5 points max)
    const zone = this.zones.find(z => z.type === seat.zone);
    if (zone) {
      score += Math.min(this.getActivityLevelScore(zone, preferences), 5);
    }

    // Amenity preferences scoring (5 points max)
    if (preferences.amenityPreferences) {
      score += Math.min(this.getAmenityScore(seat, preferences.amenityPreferences), 5);
    }

    // Debug logging for score calculation
    console.log(`🔢 Score calculation for ${seat.id}: ${score} (raw), capped to ${Math.min(score, maxScore)}`);

    return Math.min(score, maxScore);
  }

  // NEW: Calculate bonus points based on seat booking history
  private getHistoryBonus(seat: Seat, preferences: UserPreferences): number {
    if (!preferences.team) {
      return 0; // No team context, no history bonus
    }

    const seatPopularity = BookingHistoryService.getSeatPopularityData();
    const seatData = seatPopularity.get(seat.id);
    
    if (!seatData) {
      return 0; // No history for this seat
    }

    let bonus = 0;

    // High bonus if this seat is popular with user's team
    if (seatData.teams.includes(preferences.team)) {
      bonus += 15; // Major bonus for team preference
      console.log(`📈 History bonus for ${seat.id}: Team ${preferences.team} has used this seat`);
    }

    // Smaller bonus for generally popular seats
    if (seatData.count >= 5) {
      bonus += Math.min(seatData.count, 5); // Up to 5 bonus points for popularity
      console.log(`📊 Popularity bonus for ${seat.id}: ${seatData.count} total bookings`);
    }

    return bonus;
  }

  // Get amenity preference score
  private getAmenityScore(seat: Seat, amenityPrefs: NonNullable<UserPreferences['amenityPreferences']>): number {
    let score = 0;

    // Penalize cold areas if user wants to avoid them
    if (amenityPrefs.avoidColdAreas && seat.isColdArea) {
      score -= 15; // Penalty for cold areas
    }

    // Bonus for aisle seats if preferred
    if (amenityPrefs.preferAisle && seat.aisle) {
      score += 10; // Bonus for aisle access
    }

    return score;
  }

  // Get team zone matching bonus
  private getTeamZoneBonus(seat: Seat, userTeam: string): number {
    // Extract team name from seat ID (e.g., "ENG-S-01" -> "Engineering")
    const seatId = seat.id;
    const teamPrefixes: { [key: string]: string } = {
      'ENG': 'Engineering',
      'PRO': 'Product',
      'RISK': 'Risk',
      'IT': 'IT Security',
      'DEV': 'DevOps',
      'RES': 'Reserved'
    };

    for (const [prefix, teamName] of Object.entries(teamPrefixes)) {
      if (seatId.startsWith(prefix) && teamName === userTeam) {
        return 15; // 15 point bonus for team zone match (reduced from 20)
      }
    }

    return 0;
  }

  // Get zone compatibility score for non-preferred zones
  private getZoneCompatibilityScore(zoneType: ZoneType, preferences: UserPreferences): number {
    const workStyleZoneMap = {
      'quiet': [ZoneType.QUIET, ZoneType.FOCUS],
      'social': [ZoneType.SOCIAL, ZoneType.COLLABORATIVE],
      'mixed': [ZoneType.COLLABORATIVE, ZoneType.FOCUS]
    };

    const compatibleZones = workStyleZoneMap[preferences.workStyle] || [];
    return compatibleZones.includes(zoneType) ? 15 : 5;
  }

  // Calculate work style compatibility score
  private getWorkStyleScore(seat: Seat, workStyle: string): number {
    const zoneScores = {
      'quiet': {
        [ZoneType.QUIET]: 15,
        [ZoneType.FOCUS]: 12,
        [ZoneType.COLLABORATIVE]: 3,
        [ZoneType.SOCIAL]: 1,
        [ZoneType.MEETING]: 0
      },
      'social': {
        [ZoneType.SOCIAL]: 15,
        [ZoneType.COLLABORATIVE]: 12,
        [ZoneType.MEETING]: 10,
        [ZoneType.FOCUS]: 5,
        [ZoneType.QUIET]: 3
      },
      'mixed': {
        [ZoneType.COLLABORATIVE]: 15,
        [ZoneType.FOCUS]: 13,
        [ZoneType.SOCIAL]: 10,
        [ZoneType.QUIET]: 9,
        [ZoneType.MEETING]: 7
      }
    };

    return (zoneScores as any)[workStyle]?.[seat.zone] || 8;
  }

  // Calculate time preference score
  private getTimePreferenceScore(timePrefs: UserPreferences['timePreferences']): number {
    const currentHour = this.currentTime.getHours();
    let score = 5; // Base score

    if (timePrefs.morningPerson && currentHour < 12) {
      score += 5;
    } else if (!timePrefs.morningPerson && currentHour >= 12) {
      score += 5;
    }

    if (timePrefs.afternoonFocus && currentHour >= 13 && currentHour <= 17) {
      score += 3;
    }

    return score;
  }

  // Calculate collaboration score
  private getCollaborationScore(seat: Seat, collaborationNeeds: string): number {
    const collabZones = [ZoneType.COLLABORATIVE, ZoneType.SOCIAL, ZoneType.MEETING];
    const isCollabZone = collabZones.includes(seat.zone);

    switch (collaborationNeeds) {
      case 'high':
        return isCollabZone ? 10 : 3;
      case 'medium':
        return isCollabZone ? 8 : 6;
      case 'low':
        return isCollabZone ? 4 : 9;
      default:
        return 5;
    }
  }

  // Get meeting proximity bonus
  private getMeetingProximityBonus(seat: Seat, schedule: Schedule[]): number {
    const upcomingMeetings = schedule.filter(event => 
      event.type === 'meeting' && 
      isAfter(event.startTime, this.currentTime) &&
      isBefore(event.startTime, addHours(this.currentTime, 4))
    );

    if (upcomingMeetings.length === 0) return 0;

    // If seat is in meeting zone and there are upcoming meetings
    if (seat.zone === ZoneType.MEETING || seat.zone === ZoneType.COLLABORATIVE) {
      return 5; // Reduced from 15
    }

    return 0;
  }

  // Get activity level score
  private getActivityLevelScore(zone: Zone, preferences: UserPreferences): number {
    const activityLevel = zone.currentActivity;
    
    if (preferences.workStyle === 'quiet') {
      return Math.max(0, 5 - (activityLevel / 20)); // Max 5 points, decreases with activity
    } else if (preferences.workStyle === 'social') {
      return Math.min(5, activityLevel / 20); // Max 5 points, increases with activity
    } else {
      // Mixed preference - moderate activity is preferred
      return 5 - Math.abs(activityLevel - 50) / 20; // Best at 50% activity
    }
  }

  // Generate reasons for recommendation
  private generateReasons(seat: Seat, preferences: UserPreferences, score: number): string[] {
    const reasons = [];

    // Team zone match reason (highest priority)
    const teamBonus = this.getTeamZoneBonus(seat, preferences.team);
    if (teamBonus > 0) {
      reasons.push(`In your team's area (${preferences.team})`);
    }

    // Zone-based reasons
    if (preferences.preferredZones.includes(seat.zone)) {
      reasons.push(`Perfect ${seat.zone} zone match`);
    }

    // Feature-based reasons
    const matchedFeatures = seat.features.filter(f => 
      preferences.seatFeatures.includes(f.type)
    );
    
    if (matchedFeatures.length > 0) {
      reasons.push(`Has ${matchedFeatures.map(f => f.label).join(', ')}`);
    }

    // Work style reasons
    if (preferences.workStyle === 'quiet' && 
        [ZoneType.QUIET, ZoneType.FOCUS].includes(seat.zone)) {
      reasons.push('Ideal for focused work');
    } else if (preferences.workStyle === 'social' && 
               [ZoneType.SOCIAL, ZoneType.COLLABORATIVE].includes(seat.zone)) {
      reasons.push('Great for collaboration');
    }

    // Time-based reasons
    const timeOfDay = this.getTimeOfDay();
    reasons.push(`Optimized for ${timeOfDay} productivity`);

    // Activity level reasons
    const zone = this.zones.find(z => z.type === seat.zone);
    if (zone) {
      const activity = zone.currentActivity;
      if (activity < 30) {
        reasons.push('Low activity - peaceful environment');
      } else if (activity > 70) {
        reasons.push('High energy - vibrant atmosphere');
      } else {
        reasons.push('Balanced activity level');
      }
    }

    // Amenity-based reasons
    if (preferences.amenityPreferences) {
      if (preferences.amenityPreferences.preferAisle && seat.aisle) {
        reasons.push('Easy aisle access');
      }
      if (preferences.amenityPreferences.avoidColdAreas && !seat.isColdArea) {
        reasons.push('Comfortable temperature zone');
      } else if (!preferences.amenityPreferences.avoidColdAreas && seat.isColdArea) {
        // Only mention if it's a cold area and user doesn't mind
      }
    }

    // Availability reasons
    reasons.push('Available now');

    return reasons.slice(0, 4); // Limit to 4 reasons
  }

  // Get matched preferences
  private getMatchedPreferences(seat: Seat, preferences: UserPreferences): string[] {
    const matched = [];

    // Team zone match
    const teamBonus = this.getTeamZoneBonus(seat, preferences.team);
    if (teamBonus > 0) {
      matched.push(`${preferences.team} team area`);
    }

    if (preferences.preferredZones.includes(seat.zone)) {
      matched.push(`${seat.zone} zone`);
    }

    seat.features.forEach(feature => {
      if (preferences.seatFeatures.includes(feature.type)) {
        matched.push(feature.label);
      }
    });

    return matched;
  }

  // Calculate available time slots
  private calculateAvailableTimeSlots(seat: Seat, schedule: Schedule[]): Array<{start: Date, end: Date, available: boolean}> {
    // Simplified - assume seat is available for next 4 hours if currently available
    if (!seat.isAvailable) {
      return [];
    }

    const slots = [];
    const startTime = new Date(this.currentTime);
    const endTime = seat.scheduledUntil || addHours(startTime, 8); // Until end of workday

    slots.push({
      start: startTime,
      end: endTime,
      available: true
    });

    return slots;
  }

  // Handle availability queries
  private handleAvailabilityQuery(message: string): AIResponse {
    const availableCount = this.seats.filter(s => s.isAvailable).length;
    const totalSeats = this.seats.length;
    const occupancyRate = Math.round(((totalSeats - availableCount) / totalSeats) * 100);

    return {
      message: `Right now, there are ${availableCount} available seats out of ${totalSeats} total seats. The office is ${occupancyRate}% occupied. ${availableCount > 5 ? 'Plenty of options available!' : 'Limited availability - book soon!'}`,
      suggestedActions: [
        "Show available seats",
        "Get recommendations",
        "Set availability alert"
      ]
    };
  }

  // Handle zone queries
  private handleZoneQuery(message: string): AIResponse {
    const zoneActivity = this.zones.map(zone => ({
      name: zone.name,
      type: zone.type,
      activity: zone.currentActivity,
      availableSeats: this.seats.filter(s => s.zone === zone.type && s.isAvailable).length
    }));

    let responseMessage = "Here's the current vibe in each zone:\n\n";
    
    zoneActivity.forEach(zone => {
      const vibeLevel = zone.activity > 70 ? 'High energy 🔥' : 
                      zone.activity > 40 ? 'Moderate buzz ⚡' : 'Calm & quiet 🧘';
      responseMessage += `**${zone.name}**: ${vibeLevel} - ${zone.availableSeats} seats available\n`;
    });

    return {
      message: responseMessage,
      suggestedActions: [
        "Book in quiet zone",
        "Find collaborative space",
        "Show zone details"
      ]
    };
  }

  // Handle schedule queries
  private handleScheduleQuery(message: string, schedule: Schedule[]): AIResponse {
    const upcomingEvents = schedule
      .filter(event => isAfter(event.startTime, this.currentTime))
      .slice(0, 3);

    if (upcomingEvents.length === 0) {
      return {
        message: "You have no upcoming scheduled events today. Perfect time to focus! Would you like me to recommend a seat for deep work?",
        suggestedActions: [
          "Find focus seat",
          "Book for 2 hours",
          "Set up notifications"
        ]
      };
    }

    let scheduleMessage = "Here's what's coming up:\n\n";
    upcomingEvents.forEach(event => {
      scheduleMessage += `• ${event.title} at ${format(event.startTime, 'h:mm a')}\n`;
    });

    scheduleMessage += "\nI can recommend seats that work well with your schedule!";

    return {
      message: scheduleMessage,
      suggestedActions: [
        "Get schedule-based recommendations",
        "Book seat until next meeting",
        "Set meeting reminders"
      ]
    };
  }

  // Handle general queries
  private handleGeneralQuery(message: string): AIResponse {
    return {
      message: "I'm your AI Desk Buddy! I can help you find the perfect seat based on your preferences, schedule, and the current office vibe. Just tell me what you're looking for!",
      suggestedActions: [
        "Find me a seat",
        "Check availability",
        "Show office zones",
        "View my schedule"
      ],
      followUpQuestions: [
        "What type of work environment do you prefer?",
        "Do you have any meetings coming up?",
        "Are you looking for a quiet or collaborative space?"
      ]
    };
  }

  // Helper method to get time of day
  private getTimeOfDay(): string {
    const hour = this.currentTime.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  // Update current time (useful for testing)
  updateCurrentTime(time: Date): void {
    this.currentTime = time;
  }

  // Update seat availability
  updateSeatAvailability(seatId: string, isAvailable: boolean, currentUser?: string): void {
    const seat = this.seats.find(s => s.id === seatId);
    if (seat) {
      seat.isAvailable = isAvailable;
      seat.currentUser = currentUser;
    }
  }

  // Update zone activity
  updateZoneActivity(zoneType: ZoneType, activity: number): void {
    const zone = this.zones.find(z => z.type === zoneType);
    if (zone) {
      zone.currentActivity = Math.max(0, Math.min(100, activity));
    }
  }

  // Get suggested actions based on context
  private getSuggestedActions(message: string, recommendations: SeatRecommendation[]): string[] {
    const actions = [];
    
    if (recommendations.length > 0) {
      actions.push("Book recommended seat", "See more options");
    }
    
    if (message.includes('available') || message.includes('free')) {
      actions.push("Show available seats", "Check zone activity");
    }
    
    if (message.includes('schedule') || message.includes('meeting')) {
      actions.push("View my schedule", "Set meeting reminders");
    }
    
    actions.push("Update preferences", "Get zone overview");
    
    return actions.slice(0, 4);
  }

  // Get follow-up questions
  private getFollowUpQuestions(message: string, recommendations: SeatRecommendation[]): string[] {
    const questions = [];
    
    if (recommendations.length > 0) {
      questions.push("What features does this seat have?", "How long can I book it for?");
    }
    
    if (message.includes('quiet') || message.includes('focus')) {
      questions.push("What's the noise level like right now?");
    }
    
    if (message.includes('team') || message.includes('collaboration')) {
      questions.push("Are my teammates nearby?");
    }
    
    questions.push("What's the vibe in different zones?", "Any seats with good natural light?");
    
    return questions.slice(0, 3);
  }

  // Fallback response when LLM fails
  private handleFallbackResponse(
    message: string,
    userPreferences: UserPreferences,
    userSchedule: Schedule[]
  ): AIResponse {
    const lowercaseMessage = message.toLowerCase();
    
    // Use original logic as fallback
    if (this.isSeatingRequest(lowercaseMessage)) {
      return this.handleSeatingRequest(message, userPreferences, userSchedule);
    } else if (this.isAvailabilityQuery(lowercaseMessage)) {
      return this.handleAvailabilityQuery(message);
    } else if (this.isZoneQuery(lowercaseMessage)) {
      return this.handleZoneQuery(message);
    } else if (this.isScheduleQuery(lowercaseMessage)) {
      return this.handleScheduleQuery(message, userSchedule);
    } else {
      return this.handleGeneralQuery(message);
    }
  }

  // Extract seat IDs and percentages from LLM response
  private extractSeatIDsFromLLMResponse(llmResponse: string): { seatId: string; percentage: number }[] {
    // Match patterns like "Seat ENG-SW-37 (95% match)" or "ENG-SW-37 (92% match)"
    const seatPattern = /(?:Seat\s+)?([A-Z]{2,4}-[A-Z]{1,2}-\d{1,3})\s*\((\d{1,3})%[^)]*\)/g;
    const matches = [];
    let match;
    
    while ((match = seatPattern.exec(llmResponse)) !== null) {
      const seatId = match[1];
      const percentage = parseInt(match[2], 10);
      matches.push({ seatId, percentage });
    }
    
    console.log('🔍 Extracted seats and percentages from LLM response:', matches);
    return matches.slice(0, 3); // Return max 3 seats
  }

  // Align internal recommendations with LLM suggested seats and percentages
  private alignRecommendationsWithLLM(
    llmSeats: { seatId: string; percentage: number }[], 
    originalRecommendations: SeatRecommendation[]
  ): SeatRecommendation[] {
    const alignedRecommendations: SeatRecommendation[] = [];
    
    // For each LLM suggested seat, find or create a recommendation with LLM percentage
    for (const llmSeat of llmSeats) {
      // First try to find it in existing recommendations
      let recommendation = originalRecommendations.find(rec => rec.seat.id === llmSeat.seatId);
      
      if (recommendation) {
        // Update existing recommendation with LLM percentage
        recommendation = {
          ...recommendation,
          score: llmSeat.percentage, // Use LLM percentage instead of algorithm score
          reasons: [`${llmSeat.percentage}% match from AI analysis`, ...recommendation.reasons.slice(0, 2)]
        };
      } else {
        // If not found in recommendations, find the seat and create a new recommendation
        const seat = this.seats.find(s => s.id === llmSeat.seatId && s.isAvailable);
        if (seat) {
          // Create a new recommendation using LLM percentage
          recommendation = {
            seat,
            score: llmSeat.percentage, // Use LLM percentage
            reasons: [`${llmSeat.percentage}% match from AI analysis`, 'Recommended by AI assistant', 'Good match for your preferences'],
            matchedPreferences: [],
            timeSlots: [{
              start: this.currentTime,
              end: addHours(this.currentTime, 8),
              available: true
            }]
          };
        }
      }
      
      if (recommendation) {
        alignedRecommendations.push(recommendation);
      }
    }
    
    // If we don't have 3 aligned recommendations, fill with original ones (but update their scores to be lower)
    while (alignedRecommendations.length < 3 && alignedRecommendations.length < originalRecommendations.length) {
      const nextOriginal = originalRecommendations.find(rec => 
        !alignedRecommendations.some(aligned => aligned.seat.id === rec.seat.id)
      );
      if (nextOriginal) {
        // Lower the score since LLM didn't specifically recommend it
        const fallbackRecommendation = {
          ...nextOriginal,
          score: Math.min(nextOriginal.score - 10, 80), // Cap fallback scores at 80%
          reasons: ['Alternative option', ...nextOriginal.reasons.slice(0, 2)]
        };
        alignedRecommendations.push(fallbackRecommendation);
      } else {
        break;
      }
    }
    
    console.log('🎯 Aligned recommendations with LLM percentages:', 
      alignedRecommendations.map(r => `${r.seat.id}: ${r.score}%`));
    return alignedRecommendations;
  }

  // Method to update Bedrock configuration
  updateBedrockConfig(region?: string, modelId?: string): void {
    this.llmService.updateBedrockConfig(region, modelId);
  }

  // Method to test LLM connection
  async testLLMConnection(): Promise<boolean> {
    return await this.llmService.testConnection();
  }
}