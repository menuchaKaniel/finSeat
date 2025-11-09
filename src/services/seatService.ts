import officeLayoutData from '../data/office_layout.json';

interface DeskData {
  desk_id: string;
  team: string;
  zone: string;
  coordinates: { x: number; y: number };
  nearby: {
    meeting_rooms: string[];
    bathroom: boolean;
    window: boolean;
    kitchenette?: boolean;
    cafeteria?: boolean;
    aisle?: boolean;
    cold_area?: boolean;
  };
  equipment: string[];
  status: 'available' | 'occupied';
  reserved_for: string | null;
}

interface OfficeLayoutData {
  meeting_rooms: any[];
  desks: DeskData[];
  layout_coordinates?: any;
}

class SeatService {
  private data: OfficeLayoutData;

  constructor() {
    this.data = officeLayoutData as OfficeLayoutData;
  }

  /**
   * Get all desks
   */
  getAllDesks(): DeskData[] {
    return this.data.desks;
  }

  /**
   * Get a specific desk by ID
   */
  getDeskById(deskId: string): DeskData | undefined {
    return this.data.desks.find(desk => desk.desk_id === deskId);
  }

  /**
   * Get all available desks
   */
  getAvailableDesks(): DeskData[] {
    return this.data.desks.filter(desk => desk.status === 'available');
  }

  /**
   * Get desks by team
   */
  getDesksByTeam(team: string): DeskData[] {
    return this.data.desks.filter(desk => desk.team === team);
  }

  /**
   * Get desks by amenity preferences
   */
  getDesksByAmenities(preferences: {
    avoidColdAreas?: boolean;
    preferAisle?: boolean;
    nearWindow?: boolean;
    nearKitchen?: boolean;
    nearBathroom?: boolean;
  }): DeskData[] {
    return this.data.desks.filter(desk => {
      // Filter out cold areas if user wants to avoid them
      if (preferences.avoidColdAreas && desk.nearby.cold_area) {
        return false;
      }

      // If user prefers aisle, only show aisle seats
      if (preferences.preferAisle && !desk.nearby.aisle) {
        return false;
      }

      // If user wants window, only show window seats
      if (preferences.nearWindow && !desk.nearby.window) {
        return false;
      }

      // If user wants kitchen, only show seats near kitchen
      if (preferences.nearKitchen && !desk.nearby.kitchenette) {
        return false;
      }

      // If user wants bathroom, only show seats near bathroom
      if (preferences.nearBathroom && !desk.nearby.bathroom) {
        return false;
      }

      return true;
    });
  }

  /**
   * Get available desks with amenity filters
   */
  getAvailableDesksWithPreferences(preferences: {
    avoidColdAreas?: boolean;
    preferAisle?: boolean;
    nearWindow?: boolean;
    nearKitchen?: boolean;
    nearBathroom?: boolean;
    team?: string;
  }): DeskData[] {
    let desks = this.getAvailableDesks();

    // Apply team filter if specified
    if (preferences.team) {
      desks = desks.filter(desk => desk.team === preferences.team);
    }

    // Apply amenity filters
    return desks.filter(desk => {
      if (preferences.avoidColdAreas && desk.nearby.cold_area) {
        return false;
      }

      if (preferences.preferAisle && !desk.nearby.aisle) {
        return false;
      }

      if (preferences.nearWindow && !desk.nearby.window) {
        return false;
      }

      if (preferences.nearKitchen && !desk.nearby.kitchenette) {
        return false;
      }

      if (preferences.nearBathroom && !desk.nearby.bathroom) {
        return false;
      }

      return true;
    });
  }

  /**
   * Check if a seat is available
   */
  isSeatAvailable(deskId: string): boolean {
    const desk = this.getDeskById(deskId);
    return desk ? desk.status === 'available' && desk.team !== 'Reserved' : false;
  }

  /**
   * Reserve a seat for a user
   * This updates the local state - in a real app, you'd also update the server
   */
  reserveSeat(deskId: string, userName: string): boolean {
    const desk = this.getDeskById(deskId);
    
    if (!desk) {
      console.error(`Desk ${deskId} not found`);
      return false;
    }

    if (!this.isSeatAvailable(deskId)) {
      console.error(`Desk ${deskId} is not available`);
      return false;
    }

    // Update the desk status
    desk.status = 'occupied';
    desk.reserved_for = userName;

    // In a real application, you would persist this to a backend/database
    this.persistToStorage();

    console.log(`✅ Seat ${deskId} reserved for ${userName}`);
    return true;
  }

  /**
   * Release a seat reservation
   */
  releaseSeat(deskId: string): boolean {
    const desk = this.getDeskById(deskId);
    
    if (!desk) {
      console.error(`Desk ${deskId} not found`);
      return false;
    }

    // Don't allow releasing Reserved team seats
    if (desk.team === 'Reserved') {
      console.error(`Cannot release Reserved team seat ${deskId}`);
      return false;
    }

    // Update the desk status
    desk.status = 'available';
    desk.reserved_for = null;

    // In a real application, you would persist this to a backend/database
    this.persistToStorage();

    console.log(`✅ Seat ${deskId} released`);
    return true;
  }

  /**
   * Get statistics about seat usage
   */
  getStatistics() {
    const total = this.data.desks.length;
    const available = this.data.desks.filter(d => d.status === 'available').length;
    const occupied = this.data.desks.filter(d => d.status === 'occupied').length;
    const reserved = this.data.desks.filter(d => d.team === 'Reserved').length;
    const aisleSeats = this.data.desks.filter(d => d.nearby.aisle).length;
    const coldAreaSeats = this.data.desks.filter(d => d.nearby.cold_area).length;
    const availableAisleSeats = this.data.desks.filter(d => d.status === 'available' && d.nearby.aisle).length;
    const availableWarmSeats = this.data.desks.filter(d => d.status === 'available' && !d.nearby.cold_area).length;

    return {
      total,
      available,
      occupied,
      reserved,
      availablePercentage: Math.round((available / total) * 100),
      occupiedPercentage: Math.round((occupied / total) * 100),
      aisleSeats,
      coldAreaSeats,
      availableAisleSeats,
      availableWarmSeats
    };
  }

  /**
   * Persist current state to localStorage
   * In a production app, this would be an API call to save to a database
   */
  private persistToStorage() {
    try {
      localStorage.setItem('office_layout_state', JSON.stringify(this.data));
      console.log('💾 State persisted to localStorage');
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * Load state from localStorage
   * This allows the app to remember seat reservations across page refreshes
   */
  loadFromStorage() {
    try {
      const stored = localStorage.getItem('office_layout_state');
      if (stored) {
        this.data = JSON.parse(stored);
        console.log('📂 State loaded from localStorage');
        return true;
      }
    } catch (error) {
      console.error('Failed to load state from storage:', error);
    }
    return false;
  }

  /**
   * Reset all seats to initial state (all available except Reserved team)
   */
  resetToInitialState() {
    this.data.desks = this.data.desks.map(desk => {
      if (desk.team === 'Reserved') {
        return {
          ...desk,
          status: 'occupied' as const,
          reserved_for: 'Reserved Team'
        };
      }
      return {
        ...desk,
        status: 'available' as const,
        reserved_for: null
      };
    });

    this.persistToStorage();
    console.log('🔄 All seats reset to initial state');
  }

  /**
   * Export current state as JSON (for saving to file in Node.js environment)
   */
  exportState(): string {
    return JSON.stringify(this.data, null, 2);
  }
}

// Export a singleton instance
export const seatService = new SeatService();
export default seatService;
