// Core types for the AI Desk Buddy application

export interface Seat {
  id: string;
  row: number;
  column: number;
  x: number;
  y: number;
  isAvailable: boolean;
  isSelected: boolean;
  zone: ZoneType;
  features: SeatFeature[];
  currentUser?: string;
  scheduledUntil?: Date;
  // Extended metadata
  aisle?: boolean; // Default: false. Seat is next to an aisle
  isColdArea?: boolean; // Default: false. Area tends to be cold (AC/ventilation)
  orientation?: 'north' | 'south' | 'east' | 'west';
  nearby?: {
    meetingRooms: string[]; // meeting room ids within proximity threshold
    bathrooms: string[]; // facility ids
    kitchens: string[];
    windows: number; // distance (in meters) to nearest window
    printers: string[];
    exits: string[];
  };
  distanceMetrics?: {
    toNearestBathroom?: number;
    toNearestKitchen?: number;
    toNearestExit?: number;
    toNearestMeetingRoom?: number;
    toNearestPrinter?: number;
    toNearestWindow?: number;
  };
  adjacency?: {
    left?: string; // adjacent seat id
    right?: string;
    front?: string;
    back?: string;
  };
  ergonomic?: {
    hasAdjustableChair?: boolean;
    hasStandingOption?: boolean;
    monitorCount?: number;
    lighting?: 'bright' | 'medium' | 'dim';
  };
}

export interface SeatFeature {
  type: 'monitor' | 'standing-desk' | 'window-view' | 'near-kitchen' | 'quiet' | 'collaborative';
  label: string;
}

export enum ZoneType {
  QUIET = 'quiet',
  SOCIAL = 'social',
  COLLABORATIVE = 'collaborative',
  FOCUS = 'focus',
  MEETING = 'meeting'
}

export interface Zone {
  id: string;
  type: ZoneType;
  name: string;
  color: string;
  seats: string[];
  currentActivity: number; // 0-100 scale
  description: string;
}

// Meeting room metadata
export interface MeetingRoom {
  id: string;
  name: string;
  capacity: number;
  equipment: string[]; // e.g., 'tv', 'whiteboard', 'vc'
  x: number;
  y: number;
  floor?: number;
  zone?: string;
  type?: string;
  notes?: string;
}

// Generic facility (bathroom, kitchen, printer bank, exit, etc.)
export interface Facility {
  id: string;
  type: 'bathroom' | 'kitchen' | 'printer' | 'exit' | 'window';
  name: string;
  x: number;
  y: number;
  floor?: number;
}

export interface UserPreferences {
  team: string; // User's team (e.g., 'Engineering', 'Product', 'Risk')
  workStyle: 'quiet' | 'social' | 'mixed';
  collaborationNeeds: 'high' | 'medium' | 'low';
  preferredZones: ZoneType[];
  timePreferences: {
    morningPerson: boolean;
    afternoonFocus: boolean;
  };
  seatFeatures: string[];
  amenityPreferences?: {
    avoidColdAreas?: boolean; // Avoid seats in cold areas (AC/ventilation)
    preferAisle?: boolean; // Prefer seats next to aisles
    nearMeetingRooms?: boolean; // Prefer proximity to actual meeting rooms (exclude non-meeting spaces)
  };
}

export interface Schedule {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date;
  type: 'meeting' | 'focus-work' | 'collaboration' | 'break';
  attendees?: string[];
  location?: string;
}

export interface ChatMessage {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  timestamp: Date;
  type: 'text' | 'recommendation' | 'confirmation';
  data?: {
    recommendations?: SeatRecommendation[];
    selectedSeat?: Seat;
    action?: string;
  };
}

export interface SeatRecommendation {
  seat: Seat;
  score: number;
  reasons: string[];
  matchedPreferences: string[];
  timeSlots: {
    start: Date;
    end: Date;
    available: boolean;
  }[];
}

// Historical occupancy record for a seat
export interface SeatOccupancyRecord {
  seatId: string;
  userId: string;
  startTime: Date;
  endTime: Date;
  purpose: 'focus' | 'collaboration' | 'meeting' | 'transient';
}

// Aggregated history per seat
export interface SeatOccupancyHistory {
  seatId: string;
  records: SeatOccupancyRecord[];
  utilizationRate?: number; // percentage of business hours occupied
}

// New desk-centric model for enriched layout
export type DeskStatus = 'available' | 'occupied' | 'reserved' | 'maintenance';

export interface DeskNearbyFeatures {
  meeting_rooms: string[]; // meeting room ids
  bathroom: boolean;
  shower: boolean;
  kitchenette: boolean;
  cafeteria: boolean;
  window: boolean;
  elevator: boolean;
  aisle: boolean; // Desk is next to an aisle
  cold_area: boolean; // Area tends to be cold (AC/ventilation)
}

export interface DeskCoordinate {
  x: number;
  y: number;
}

export interface Desk {
  desk_id: string;
  team: string; // e.g., Engineering, Sales
  zone: string; // e.g., South-West, Focus Ring
  coordinates: DeskCoordinate;
  floor: string; // e.g., 'CRT', '2F'
  nearby: DeskNearbyFeatures;
  status: DeskStatus;
  equipment: string[]; // monitor, dock, chair, phone, etc.
  reserved_for: string | null; // user id or null
  notes?: string;
  // Optional links to legacy seat model for AI bridging
  legacySeatId?: string;
}

export interface AIResponse {
  message: string;
  recommendations?: SeatRecommendation[];
  suggestedActions?: string[];
  followUpQuestions?: string[];
}