import OpenAI from 'openai';
import { 
  Seat, 
  SeatRecommendation, 
  UserPreferences, 
  Schedule, 
  Zone
} from '../types';

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

class OpenAIProvider implements LLMProvider {
  private client: OpenAI;
  private model: string;

  constructor(apiKey?: string, model: string = 'gpt-3.5-turbo') {
    this.client = new OpenAI({
      apiKey: apiKey || process.env.REACT_APP_OPENAI_API_KEY || '',
      dangerouslyAllowBrowser: true // Only for demo - use backend in production
    });
    this.model = model;
  }

  async generateResponse(prompt: string, context: ConversationContext): Promise<string> {
    try {
      const systemPrompt = this.buildSystemPrompt(context);
      
      const response = await this.client.chat.completions.create({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        max_tokens: 300,
        temperature: 0.7,
        presence_penalty: 0.1,
        frequency_penalty: 0.1
      });

      return response.choices[0]?.message?.content || 'I apologize, but I encountered an issue processing your request. Please try again.';
    } catch (error) {
      console.error('OpenAI API Error:', error);
      throw error;
    }
  }

  private buildSystemPrompt(context: ConversationContext): string {
    const { availableSeats, zones, userPreferences, userSchedule, recommendations, currentTime } = context;
    
    const timeOfDay = this.getTimeOfDay(currentTime);
    const availableCount = availableSeats.length;
    
    const zoneInfo = zones.map(zone => 
      `${zone.name} (${zone.type}): ${zone.currentActivity}% activity, ${availableSeats.filter(s => s.zone === zone.type).length} available seats`
    ).join('\n');

    const scheduleInfo = userSchedule.length > 0 
      ? `Upcoming schedule: ${userSchedule.slice(0, 3).map(s => `${s.title} at ${s.startTime.toLocaleTimeString()}`).join(', ')}`
      : 'No upcoming scheduled events';

    const recommendationInfo = recommendations && recommendations.length > 0
      ? `Current recommendations: ${recommendations.slice(0, 3).map(r => 
          `Seat ${r.seat.id} (${Math.round(r.score)}% match) - ${r.reasons.slice(0, 2).join(', ')}`
        ).join(' | ')}`
      : 'No active recommendations';

    return `You are AI Desk Buddy 2.0, a friendly and intelligent office seating assistant. Your personality is helpful, conversational, and slightly enthusiastic about finding the perfect workspace.

CURRENT CONTEXT:
- Time: ${timeOfDay} (${currentTime.toLocaleTimeString()})
- Available seats: ${availableCount} seats available
- User work style: ${userPreferences.workStyle}
- Collaboration needs: ${userPreferences.collaborationNeeds}
- Preferred zones: ${userPreferences.preferredZones.join(', ')}
- ${scheduleInfo}

OFFICE ZONES:
${zoneInfo}

${recommendationInfo}

CONVERSATION GUIDELINES:
1. Be conversational and friendly, not robotic
2. Reference specific seat details, zones, and features when relevant
3. Consider the user's schedule and work style in responses  
4. Vary your language - don't repeat the same phrases
5. Ask follow-up questions to better understand needs
6. Use emojis sparingly (1-2 per message max)
7. Keep responses concise but informative (2-4 sentences)
8. Acknowledge the current time and context
9. If recommending seats, explain WHY they're good matches
10. Be proactive about potential conflicts or considerations

RESPONSE STYLE:
- Casual but professional
- Personalized to the user's preferences
- Context-aware of office dynamics
- Solution-focused

Remember: You're not just booking seats, you're optimizing the user's work experience!`;
  }

  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }
}

// Enhanced fallback provider for when API keys aren't available
class FallbackProvider implements LLMProvider {
  private responseHistory: string[] = [];
  private conversationCount = 0;

  async generateResponse(prompt: string, context: ConversationContext): Promise<string> {
    this.conversationCount++;
    const lowerMessage = prompt.toLowerCase();

    // Generate contextual response based on rich context
    let response = this.generateContextualResponse(lowerMessage, context);
    
    // Ensure we don't repeat responses
    while (this.responseHistory.includes(response) && this.responseHistory.length > 0) {
      response = this.generateContextualResponse(lowerMessage, context, true);
    }
    
    // Keep history manageable
    this.responseHistory.push(response);
    if (this.responseHistory.length > 10) {
      this.responseHistory.shift();
    }

    return response;
  }

  private generateContextualResponse(message: string, context: ConversationContext, forceVariant = false): string {
    const { availableSeats, userPreferences, zones, userSchedule, currentTime, recommendations } = context;
    const timeOfDay = this.getTimeOfDay(currentTime);
    const busyZones = zones.filter(z => z.currentActivity > 60);
    const quietZones = zones.filter(z => z.currentActivity < 40);
    
    // Seating requests
    if (message.includes('recommend') || message.includes('find') || message.includes('seat') || message.includes('need')) {
      const responses = [
        `Looking at our ${availableSeats.length} available seats right now, I can see some great matches for your ${userPreferences.workStyle} work style. ${this.getZoneRecommendation(message, zones, userPreferences)} ${this.getTimeContext(timeOfDay)}`,
        
        `Perfect! I've analyzed the current office vibe and found several spots that should work well. ${recommendations && recommendations.length > 0 ? `My top recommendation is based on ${recommendations[0].reasons[0]}.` : `The ${this.getBestZoneForRequest(message, zones)} area looks promising right now.`}`,
        
        `${this.getGreeting(timeOfDay)} Based on your preferences for ${userPreferences.collaborationNeeds} collaboration and ${userPreferences.workStyle} work style, I have some targeted suggestions. ${this.getAvailabilityContext(availableSeats.length)}`,
        
        `Great timing! ${this.getActivityInsight(busyZones, quietZones)} With ${availableSeats.length} seats available, I can definitely find something that matches what you're looking for.`
      ];
      
      return responses[forceVariant ? Math.floor(Math.random() * responses.length) : this.conversationCount % responses.length];
    }

    // Availability queries
    if (message.includes('available') || message.includes('free') || message.includes('open') || message.includes('busy')) {
      const occupancyRate = Math.round(((100 - availableSeats.length) / 100) * 100);
      const responses = [
        `Current status: ${availableSeats.length} seats available across all zones. ${this.getZoneActivity(zones)} ${occupancyRate > 70 ? "It's pretty busy right now!" : "Good availability!"}`,
        
        `Right now we have ${availableSeats.length} open seats. ${quietZones.length > 0 ? `The ${quietZones[0].name} is particularly calm` : `Activity levels are moderate`} - perfect for ${timeOfDay} work. Want specific zone details?`,
        
        `${this.getGreeting(timeOfDay)} Availability looks ${availableSeats.length > 15 ? 'great' : 'limited'} with ${availableSeats.length} seats free. ${this.getZoneBreakdown(zones, availableSeats)}`,
        
        `Here's the current picture: ${availableSeats.length} available seats, with ${this.getMostActiveZone(zones)} being the most active and ${this.getLeastActiveZone(zones)} being the quietest.`
      ];
      
      return responses[forceVariant ? Math.floor(Math.random() * responses.length) : this.conversationCount % responses.length];
    }

    // Zone queries
    if (message.includes('zone') || message.includes('quiet') || message.includes('social') || message.includes('collaborative') || message.includes('vibe')) {
      const responses = [
        `Here's the current vibe: ${this.getDetailedZoneInfo(zones, availableSeats)} ${this.getZoneRecommendationByPreference(userPreferences, zones)}`,
        
        `Zone overview for ${timeOfDay}: ${zones.map(z => `${z.name} (${z.currentActivity}% active, ${availableSeats.filter(s => s.zone === z.type).length} seats)`).join(' • ')}`,
        
        `${this.getZonePersonality(message, zones)} ${this.getZoneMatchForUser(userPreferences, zones)}`,
        
        `The office energy right now: ${busyZones.length > 0 ? `${busyZones[0].name} is buzzing` : 'pretty calm overall'}. ${quietZones.length > 0 ? `${quietZones[0].name} is your best bet for focus work.` : 'All zones have moderate activity.'}`
      ];
      
      return responses[forceVariant ? Math.floor(Math.random() * responses.length) : this.conversationCount % responses.length];
    }

    // Schedule queries
    if (message.includes('schedule') || message.includes('meeting') || message.includes('calendar') || message.includes('time')) {
      const upcomingMeetings = userSchedule.filter(s => s.startTime > currentTime).slice(0, 2);
      const responses = [
        `${upcomingMeetings.length > 0 ? `I see you have ${upcomingMeetings[0].title} coming up at ${upcomingMeetings[0].startTime.toLocaleTimeString()}. ` : 'Your schedule looks clear ahead. '}${this.getScheduleBasedAdvice(upcomingMeetings, zones)}`,
        
        `Looking at your day: ${upcomingMeetings.length === 0 ? 'No meetings scheduled - perfect for deep work!' : `${upcomingMeetings.length} meetings coming up.`} ${this.getTimingAdvice(currentTime, upcomingMeetings)}`,
        
        `${this.getGreeting(timeOfDay)} ${upcomingMeetings.length > 0 ? `With ${upcomingMeetings[0].title} at ${upcomingMeetings[0].startTime.toLocaleTimeString()}, I'd suggest staying close to meeting areas.` : `No meetings scheduled - great time for focused work in the ${this.getBestQuietZone(zones)} area.`}`,
        
        `Schedule-wise: ${upcomingMeetings.length === 0 ? `You're free for the next few hours! ${this.getFreeTimeAdvice(timeOfDay, zones)}` : `${upcomingMeetings.map(m => m.title).join(' and ')} coming up. ${this.getMeetingPrepAdvice()}`}`
      ];
      
      return responses[forceVariant ? Math.floor(Math.random() * responses.length) : this.conversationCount % responses.length];
    }

    // General/greeting responses
    const responses = [
      `${this.getGreeting(timeOfDay)} I'm here to help you find the perfect workspace! With ${availableSeats.length} seats available, what kind of environment are you looking for today?`,
      
      `Hi there! Ready to optimize your workspace experience? I can consider your ${userPreferences.workStyle} work style, schedule, and the current office vibe to find you the ideal spot.`,
      
      `Welcome! ${this.getOfficeStatus(zones, availableSeats)} What can I help you with - finding a seat, checking availability, or getting the zone breakdown?`,
      
      `${this.getTimeGreeting(timeOfDay)} I'm your AI workspace assistant, and I'm excited to help! Tell me what you need and I'll factor in all the office dynamics to get you set up perfectly.`
    ];
    
    return responses[forceVariant ? Math.floor(Math.random() * responses.length) : this.conversationCount % responses.length];
  }

  // Helper methods for more dynamic responses
  private getTimeOfDay(date: Date): string {
    const hour = date.getHours();
    if (hour < 12) return 'morning';
    if (hour < 17) return 'afternoon';
    return 'evening';
  }

  private getGreeting(timeOfDay: string): string {
    const greetings = {
      morning: ['Good morning!', 'Morning!', 'Great morning for productivity!'],
      afternoon: ['Good afternoon!', 'Afternoon!', 'Hope your day is going well!'],
      evening: ['Good evening!', 'Evening!', 'Wrapping up the day?']
    };
    const options = greetings[timeOfDay as keyof typeof greetings];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getTimeGreeting(timeOfDay: string): string {
    const timeGreetings = {
      morning: 'Starting your day right with the perfect workspace?',
      afternoon: 'Looking for an afternoon productivity boost?',
      evening: 'Evening work session coming up?'
    };
    return timeGreetings[timeOfDay as keyof typeof timeGreetings];
  }

  private getZoneRecommendation(message: string, zones: Zone[], preferences: UserPreferences): string {
    if (message.includes('quiet') || message.includes('focus')) {
      const quietZone = zones.find(z => z.currentActivity < 40);
      return quietZone ? `The ${quietZone.name} is particularly peaceful right now.` : 'Most zones are moderately active today.';
    }
    if (message.includes('social') || message.includes('collaborative')) {
      const socialZone = zones.find(z => z.currentActivity > 60);
      return socialZone ? `The ${socialZone.name} has great energy for collaboration.` : 'The collaborative areas have good activity levels.';
    }
    return `Based on your ${preferences.workStyle} preference, I have some great options.`;
  }

  private getTimeContext(timeOfDay: string): string {
    const contexts = {
      morning: 'Perfect timing for morning focus!',
      afternoon: 'Great for afternoon productivity.',
      evening: 'Good for evening wrap-up work.'
    };
    return contexts[timeOfDay as keyof typeof contexts];
  }

  private getBestZoneForRequest(message: string, zones: Zone[]): string {
    if (message.includes('quiet')) return zones.find(z => z.currentActivity < 40)?.name || 'focus';
    if (message.includes('social')) return zones.find(z => z.currentActivity > 60)?.name || 'collaborative';
    return zones[Math.floor(Math.random() * zones.length)].name;
  }

  private getAvailabilityContext(count: number): string {
    if (count > 20) return 'Plenty of great options available!';
    if (count > 10) return 'Good selection of seats to choose from.';
    return 'Limited but quality options available.';
  }

  private getActivityInsight(busyZones: Zone[], quietZones: Zone[]): string {
    if (busyZones.length > quietZones.length) return 'The office has good energy today with lots of collaboration happening.';
    if (quietZones.length > busyZones.length) return 'It\'s a calm day - perfect for focused work.';
    return 'Nice balanced atmosphere across all zones.';
  }

  private getZoneActivity(zones: Zone[]): string {
    const avgActivity = zones.reduce((sum, z) => sum + z.currentActivity, 0) / zones.length;
    if (avgActivity > 60) return 'High energy across most zones.';
    if (avgActivity < 40) return 'Calm atmosphere throughout the office.';
    return 'Balanced activity levels across zones.';
  }

  private getZoneBreakdown(zones: Zone[], availableSeats: Seat[]): string {
    const zoneWithMostSeats = zones.reduce((best, zone) => {
      const seatCount = availableSeats.filter(s => s.zone === zone.type).length;
      const bestCount = availableSeats.filter(s => s.zone === best.type).length;
      return seatCount > bestCount ? zone : best;
    });
    return `Most availability in the ${zoneWithMostSeats.name}.`;
  }

  private getMostActiveZone(zones: Zone[]): string {
    return zones.reduce((most, zone) => zone.currentActivity > most.currentActivity ? zone : most).name;
  }

  private getLeastActiveZone(zones: Zone[]): string {
    return zones.reduce((least, zone) => zone.currentActivity < least.currentActivity ? zone : least).name;
  }

  private getDetailedZoneInfo(zones: Zone[], availableSeats: Seat[]): string {
    return zones.map(z => 
      `${z.name}: ${z.currentActivity}% active, ${availableSeats.filter(s => s.zone === z.type).length} seats`
    ).join(' | ');
  }

  private getZoneRecommendationByPreference(preferences: UserPreferences, zones: Zone[]): string {
    if (preferences.workStyle === 'quiet') {
      const quietZone = zones.find(z => z.currentActivity < 40);
      return quietZone ? `Perfect match for quiet work: ${quietZone.name}.` : '';
    }
    return '';
  }

  private getZonePersonality(message: string, zones: Zone[]): string {
    if (message.includes('quiet')) {
      const quietZone = zones.find(z => z.currentActivity < 30);
      return quietZone ? `${quietZone.name} is your zen zone today - super peaceful.` : 'All zones have some activity, but focus areas are your best bet.';
    }
    return 'Each zone has its own personality today.';
  }

  private getZoneMatchForUser(preferences: UserPreferences, zones: Zone[]): string {
    const match = zones.find(z => preferences.preferredZones.includes(z.type));
    return match ? `Your preferred ${match.name} is looking good!` : '';
  }

  private getScheduleBasedAdvice(meetings: Schedule[], zones: Zone[]): string {
    if (meetings.length === 0) return 'Great time for deep work in the focus areas!';
    if (meetings[0].type === 'meeting') return 'I\'d suggest staying near collaborative zones for easy meeting access.';
    return 'Plan your seat choice around your upcoming schedule.';
  }

  private getTimingAdvice(currentTime: Date, meetings: Schedule[]): string {
    if (meetings.length === 0) return 'No time constraints - choose based on your work style!';
    const nextMeeting = meetings[0];
    const timeUntil = (nextMeeting.startTime.getTime() - currentTime.getTime()) / (1000 * 60);
    if (timeUntil < 60) return 'With a meeting soon, stay close to meeting areas.';
    return 'You have time for focused work before your next commitment.';
  }

  private getBestQuietZone(zones: Zone[]): string {
    return zones.find(z => z.currentActivity < 40)?.name || 'focus';
  }

  private getFreeTimeAdvice(timeOfDay: string, zones: Zone[]): string {
    const quietZone = zones.find(z => z.currentActivity < 40);
    return quietZone ? `${timeOfDay} is perfect for deep work in ${quietZone.name}.` : `Great ${timeOfDay} for getting things done!`;
  }

  private getMeetingPrepAdvice(): string {
    const advice = [
      'Stay accessible for easy meeting transitions.',
      'Choose a spot near collaborative areas.',
      'Pick somewhere you can easily step away from.'
    ];
    return advice[Math.floor(Math.random() * advice.length)];
  }

  private getOfficeStatus(zones: Zone[], availableSeats: Seat[]): string {
    const avgActivity = zones.reduce((sum, z) => sum + z.currentActivity, 0) / zones.length;
    if (avgActivity > 60) return `The office is buzzing today with ${availableSeats.length} seats available.`;
    if (avgActivity < 40) return `It's a calm day with ${availableSeats.length} peaceful spots available.`;
    return `Balanced energy today with ${availableSeats.length} seats ready.`;
  }
}

export class LLMService {
  private provider: LLMProvider;
  private fallbackProvider: LLMProvider;

  constructor(apiKey?: string) {
    this.fallbackProvider = new FallbackProvider();
    
    try {
      this.provider = new OpenAIProvider(apiKey);
    } catch (error) {
      console.warn('Failed to initialize OpenAI provider, using fallback:', error);
      this.provider = this.fallbackProvider;
    }
  }

  async generateResponse(userMessage: string, context: ConversationContext): Promise<string> {
    // Check if we have a valid API key first
    const hasApiKey = localStorage.getItem('openai_api_key') && localStorage.getItem('openai_api_key')!.startsWith('sk-');
    
    if (!hasApiKey) {
      console.log('No valid OpenAI API key found, using enhanced fallback');
      return await this.fallbackProvider.generateResponse(userMessage, context);
    }

    try {
      console.log('Attempting OpenAI API call...');
      const response = await this.provider.generateResponse(userMessage, context);
      console.log('OpenAI API call successful');
      return response;
    } catch (error) {
      console.warn('OpenAI API failed, using fallback:', error);
      
      // Fall back to the enhanced provider
      try {
        return await this.fallbackProvider.generateResponse(userMessage, context);
      } catch (fallbackError) {
        console.error('Both providers failed:', fallbackError);
        return "I'm having trouble processing your request right now. Could you please try again or rephrase your question?";
      }
    }
  }

  // Method to update API key dynamically
  updateApiKey(apiKey: string): void {
    try {
      this.provider = new OpenAIProvider(apiKey);
    } catch (error) {
      console.error('Failed to update API key:', error);
    }
  }

  // Method to test if the service is working
  async testConnection(): Promise<boolean> {
    try {
      const testContext: ConversationContext = {
        userMessage: 'test',
        availableSeats: [],
        zones: [],
        userPreferences: {
          workStyle: 'mixed',
          collaborationNeeds: 'medium',
          preferredZones: [],
          timePreferences: { morningPerson: true, afternoonFocus: true },
          seatFeatures: []
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