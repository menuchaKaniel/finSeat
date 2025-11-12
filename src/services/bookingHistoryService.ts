import seatHistoryData from '../data/seat_history.json';

export interface SeatHistoryEntry {
  employee_id: string;
  employee_name: string;
  team: string;
  desk_id: string;
  start_date: string; // YYYY-MM-DD format
  end_date: string;   // YYYY-MM-DD format
  remote_ratio: number; // 0.0 to 1.0
}

export interface BookingHistoryEntry {
  employee_id: string;
  employee_name: string;
  team: string;
  desk_id: string;
  start_date: string;
  end_date: string;
  booking_timestamp: string; // ISO timestamp when booking was made
}

export class BookingHistoryService {
  private static historyData: SeatHistoryEntry[] = [...seatHistoryData];

  /**
   * Add a new booking to the seat history
   */
  static addBookingToHistory(booking: {
    employeeId: string;
    employeeName: string;
    team: string;
    deskId: string;
    startDate: Date;
    endDate: Date;
  }): void {
    const newEntry: SeatHistoryEntry = {
      employee_id: booking.employeeId,
      employee_name: booking.employeeName,
      team: booking.team,
      desk_id: booking.deskId,
      start_date: this.formatDate(booking.startDate),
      end_date: this.formatDate(booking.endDate),
      remote_ratio: 0.5 // Default remote ratio, could be configurable
    };

    // Add the new booking to the history
    this.historyData.push(newEntry);

    // Update localStorage for persistence
    this.saveToLocalStorage();

    console.log(`📝 Added booking to history: ${booking.employeeName} -> ${booking.deskId} (${newEntry.start_date} to ${newEntry.end_date})`);
  }

  /**
   * Remove a booking from history when seat is released
   */
  static removeBookingFromHistory(deskId: string, employeeId: string): void {
    const initialLength = this.historyData.length;
    
    this.historyData = this.historyData.filter(entry => 
      !(entry.desk_id === deskId && entry.employee_id === employeeId)
    );

    if (this.historyData.length < initialLength) {
      this.saveToLocalStorage();
      console.log(`🗑️ Removed booking from history: ${employeeId} -> ${deskId}`);
    }
  }

  /**
   * Get all booking history
   */
  static getHistory(): SeatHistoryEntry[] {
    return [...this.historyData];
  }

  /**
   * Get booking history for a specific desk
   */
  static getHistoryForDesk(deskId: string): SeatHistoryEntry[] {
    return this.historyData.filter(entry => entry.desk_id === deskId);
  }

  /**
   * Get booking history for a specific employee
   */
  static getHistoryForEmployee(employeeId: string): SeatHistoryEntry[] {
    return this.historyData.filter(entry => entry.employee_id === employeeId);
  }

  /**
   * Get booking history for a specific team
   */
  static getHistoryForTeam(team: string): SeatHistoryEntry[] {
    return this.historyData.filter(entry => entry.team.toLowerCase() === team.toLowerCase());
  }

  /**
   * Get seat popularity data (how often each seat is booked)
   */
  static getSeatPopularityData(): Map<string, { count: number, teams: string[] }> {
    const popularity = new Map<string, { count: number, teams: string[] }>();
    
    this.historyData.forEach(entry => {
      const existing = popularity.get(entry.desk_id) || { count: 0, teams: [] };
      existing.count++;
      if (!existing.teams.includes(entry.team)) {
        existing.teams.push(entry.team);
      }
      popularity.set(entry.desk_id, existing);
    });
    
    return popularity;
  }

  /**
   * Check if a desk is currently booked based on history
   */
  static isDeskCurrentlyBooked(deskId: string): boolean {
    const today = new Date();
    const todayStr = this.formatDate(today);

    return this.historyData.some(entry => 
      entry.desk_id === deskId && 
      entry.start_date <= todayStr && 
      entry.end_date >= todayStr
    );
  }

  /**
   * Get current booking for a desk
   */
  static getCurrentBookingForDesk(deskId: string): SeatHistoryEntry | null {
    const today = new Date();
    const todayStr = this.formatDate(today);

    return this.historyData.find(entry => 
      entry.desk_id === deskId && 
      entry.start_date <= todayStr && 
      entry.end_date >= todayStr
    ) || null;
  }

  /**
   * Export updated history as downloadable JSON file
   */
  static exportHistoryAsJson(): void {
    try {
      const historyJson = JSON.stringify(this.historyData, null, 2);
      const blob = new Blob([historyJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `seat_history_updated_${this.formatDate(new Date())}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      URL.revokeObjectURL(url);
      
      console.log('💾 Seat history exported as JSON file');
    } catch (error) {
      console.error('Failed to export seat history:', error);
    }
  }

  /**
   * Initialize from localStorage if available
   */
  static initializeFromStorage(): void {
    try {
      const stored = localStorage.getItem('seat_history_data');
      if (stored) {
        this.historyData = JSON.parse(stored);
        console.log('📂 Loaded seat history from localStorage');
      }
    } catch (error) {
      console.error('Failed to load seat history from localStorage:', error);
    }
  }

  /**
   * Save current history to localStorage
   */
  private static saveToLocalStorage(): void {
    try {
      localStorage.setItem('seat_history_data', JSON.stringify(this.historyData));
      console.log('💾 Seat history saved to localStorage');
    } catch (error) {
      console.error('Failed to save seat history to localStorage:', error);
    }
  }

  /**
   * Format date as YYYY-MM-DD
   */
  private static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Get statistics about bookings
   */
  static getBookingStatistics() {
    const today = new Date();
    const todayStr = this.formatDate(today);
    
    const currentBookings = this.historyData.filter(entry => 
      entry.start_date <= todayStr && entry.end_date >= todayStr
    );

    const teamStats = currentBookings.reduce((acc, entry) => {
      acc[entry.team] = (acc[entry.team] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      totalHistoryEntries: this.historyData.length,
      currentBookings: currentBookings.length,
      teamBreakdown: teamStats,
      avgRemoteRatio: this.historyData.reduce((sum, entry) => sum + entry.remote_ratio, 0) / this.historyData.length
    };
  }
}

// Initialize from localStorage on module load
BookingHistoryService.initializeFromStorage();