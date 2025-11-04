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

export class AIRecommendationEngine {
  public seats: Seat[];
  private zones: Zone[];
  private currentTime: Date;
  private llmService: LLMService;
  private conversationHistory: string[] = [];

  constructor(seats: Seat[], zones: Zone[], apiKey?: string) {
    this.seats = seats;
    this.zones = zones;
    this.currentTime = new Date();
    this.llmService = new LLMService(apiKey);
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
    
    // Intent detection and recommendations
    let recommendations: SeatRecommendation[] = [];
    
    if (this.isSeatingRequest(lowercaseMessage)) {
      recommendations = this.generateRecommendations(userPreferences, userSchedule);
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
      
      // Determine suggested actions based on intent and context
      const suggestedActions = this.getSuggestedActions(lowercaseMessage, recommendations);
      const followUpQuestions = this.getFollowUpQuestions(lowercaseMessage, recommendations);
      
      return {
        message: aiMessage,
        recommendations: recommendations.length > 0 ? recommendations.slice(0, 3) : undefined,
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
      'best place', 'good spot', 'need a seat', 'book', 'reserve'
    ];
    return seatingKeywords.some(keyword => message.includes(keyword));
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
    let score = 0;
    const maxScore = 100;

    // Zone preference matching (30% weight)
    if (preferences.preferredZones.includes(seat.zone)) {
      score += 30;
    } else {
      // Partial points for compatible zones
      score += this.getZoneCompatibilityScore(seat.zone, preferences) * 0.3;
    }

    // Work style matching (25% weight)
    score += this.getWorkStyleScore(seat, preferences.workStyle) * 0.25;

    // Feature matching (20% weight)
    const featureMatch = seat.features.filter(f => 
      preferences.seatFeatures.includes(f.type)
    ).length / Math.max(preferences.seatFeatures.length, 1);
    score += featureMatch * 20;

    // Time-based preferences (15% weight)
    score += this.getTimePreferenceScore(preferences.timePreferences) * 0.15;

    // Collaboration needs (10% weight)
    score += this.getCollaborationScore(seat, preferences.collaborationNeeds) * 0.1;

    // Proximity to scheduled meetings bonus
    const meetingBonus = this.getMeetingProximityBonus(seat, schedule);
    score += meetingBonus;

    // Activity level consideration
    const zone = this.zones.find(z => z.type === seat.zone);
    if (zone) {
      score += this.getActivityLevelScore(zone, preferences) * 0.1;
    }

    return Math.min(score, maxScore);
  }

  // Get zone compatibility score for non-preferred zones
  private getZoneCompatibilityScore(zoneType: ZoneType, preferences: UserPreferences): number {
    const workStyleZoneMap = {
      'quiet': [ZoneType.QUIET, ZoneType.FOCUS],
      'social': [ZoneType.SOCIAL, ZoneType.COLLABORATIVE],
      'mixed': [ZoneType.COLLABORATIVE, ZoneType.FOCUS]
    };

    const compatibleZones = workStyleZoneMap[preferences.workStyle] || [];
    return compatibleZones.includes(zoneType) ? 70 : 30;
  }

  // Calculate work style compatibility score
  private getWorkStyleScore(seat: Seat, workStyle: string): number {
    const zoneScores = {
      'quiet': {
        [ZoneType.QUIET]: 100,
        [ZoneType.FOCUS]: 90,
        [ZoneType.COLLABORATIVE]: 20,
        [ZoneType.SOCIAL]: 10,
        [ZoneType.MEETING]: 5
      },
      'social': {
        [ZoneType.SOCIAL]: 100,
        [ZoneType.COLLABORATIVE]: 80,
        [ZoneType.MEETING]: 70,
        [ZoneType.FOCUS]: 30,
        [ZoneType.QUIET]: 20
      },
      'mixed': {
        [ZoneType.COLLABORATIVE]: 100,
        [ZoneType.FOCUS]: 85,
        [ZoneType.SOCIAL]: 70,
        [ZoneType.QUIET]: 60,
        [ZoneType.MEETING]: 50
      }
    };

    return (zoneScores as any)[workStyle]?.[seat.zone] || 50;
  }

  // Calculate time preference score
  private getTimePreferenceScore(timePrefs: UserPreferences['timePreferences']): number {
    const currentHour = this.currentTime.getHours();
    let score = 50; // Base score

    if (timePrefs.morningPerson && currentHour < 12) {
      score += 30;
    } else if (!timePrefs.morningPerson && currentHour >= 12) {
      score += 30;
    }

    if (timePrefs.afternoonFocus && currentHour >= 13 && currentHour <= 17) {
      score += 20;
    }

    return Math.min(score, 100);
  }

  // Calculate collaboration score
  private getCollaborationScore(seat: Seat, collaborationNeeds: string): number {
    const collabZones = [ZoneType.COLLABORATIVE, ZoneType.SOCIAL, ZoneType.MEETING];
    const isCollabZone = collabZones.includes(seat.zone);

    switch (collaborationNeeds) {
      case 'high':
        return isCollabZone ? 100 : 30;
      case 'medium':
        return isCollabZone ? 80 : 60;
      case 'low':
        return isCollabZone ? 40 : 90;
      default:
        return 50;
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
      return 15;
    }

    return 0;
  }

  // Get activity level score
  private getActivityLevelScore(zone: Zone, preferences: UserPreferences): number {
    const activityLevel = zone.currentActivity;
    
    if (preferences.workStyle === 'quiet') {
      return Math.max(0, 100 - activityLevel);
    } else if (preferences.workStyle === 'social') {
      return activityLevel;
    } else {
      // Mixed preference - moderate activity is preferred
      return 100 - Math.abs(activityLevel - 50);
    }
  }

  // Generate reasons for recommendation
  private generateReasons(seat: Seat, preferences: UserPreferences, score: number): string[] {
    const reasons = [];

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

    // Availability reasons
    reasons.push('Available now');

    return reasons.slice(0, 4); // Limit to 4 reasons
  }

  // Get matched preferences
  private getMatchedPreferences(seat: Seat, preferences: UserPreferences): string[] {
    const matched = [];

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

  // Method to update API key
  updateApiKey(apiKey: string): void {
    this.llmService.updateApiKey(apiKey);
  }

  // Method to test LLM connection
  async testLLMConnection(): Promise<boolean> {
    return await this.llmService.testConnection();
  }
}