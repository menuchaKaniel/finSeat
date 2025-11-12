import officeLayoutData from '../data/office_layout.json';
import { BookingHistoryService } from './bookingHistoryService';

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
   * This updates the local state and adds to booking history
   */
  reserveSeat(deskId: string, userName: string, userTeam: string = 'Engineering', startDate?: Date, endDate?: Date): boolean {
    const desk = this.getDeskById(deskId);
    
    if (!desk) {
      console.error(`Desk ${deskId} not found`);
      return false;
    }

    if (!this.isSeatAvailable(deskId)) {
      console.error(`Desk ${deskId} is not available`);
      return false;
    }

    // Default booking period: today until end of week
    const bookingStartDate = startDate || new Date();
    const bookingEndDate = endDate || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    // Update the desk status
    desk.status = 'occupied';
    desk.reserved_for = userName;

    // Add to booking history
    BookingHistoryService.addBookingToHistory({
      employeeId: this.generateEmployeeId(userName),
      employeeName: userName,
      team: userTeam,
      deskId: deskId,
      startDate: bookingStartDate,
      endDate: bookingEndDate
    });

    // Persist changes
    this.persistToStorage();

    console.log(`✅ Seat ${deskId} reserved for ${userName} (${userTeam}) from ${bookingStartDate.toDateString()} to ${bookingEndDate.toDateString()}`);
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

    // Remove from booking history if it exists
    const employeeId = this.generateEmployeeId(desk.reserved_for || '');
    BookingHistoryService.removeBookingFromHistory(deskId, employeeId);

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
   * Note: We only use localStorage since React can't write to JSON files directly
   */
  private persistToStorage() {
    try {
      // Save to localStorage for immediate UI updates
      localStorage.setItem('office_layout_state', JSON.stringify(this.data));
      console.log('💾 State persisted to localStorage');
      
      // Also update the in-memory office layout data so LLM gets correct data
      this.updateInMemoryData();
    } catch (error) {
      console.error('Failed to persist state:', error);
    }
  }

  /**
   * Update the in-memory office layout data to match current state
   * This ensures the LLM always has up-to-date availability data
   */
  private updateInMemoryData() {
    try {
      // Update the imported office layout data directly
      (officeLayoutData as any).desks = this.data.desks;
      console.log('� In-memory office layout data updated');
    } catch (error) {
      console.error('Failed to update in-memory data:', error);
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

  /**
   * Generate a simple employee ID from user name
   * In a real system, this would be provided by the user management system
   */
  private generateEmployeeId(userName: string): string {
    // Simple ID generation: E + first letter + last 3 digits of hash
    const hash = this.simpleHash(userName);
    const firstLetter = userName.charAt(0).toUpperCase();
    return `E${firstLetter}${hash % 1000}`.padEnd(4, '0');
  }

  /**
   * Simple hash function for generating consistent IDs
   */
  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  /**
   * Export booking history as downloadable JSON file
   */
  exportBookingHistory(): void {
    BookingHistoryService.exportHistoryAsJson();
  }

  /**
   * Get booking statistics including history data
   */
  getBookingStatistics() {
    return {
      ...this.getStatistics(),
      ...BookingHistoryService.getBookingStatistics()
    };
  }
}

// Export a singleton instance
export const seatService = new SeatService();
export default seatService;
