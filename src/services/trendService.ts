import seatHistoryData from '../seat_history.json';

export interface SeatHistoryRecord {
  employee_id: string;
  employee_name: string;
  team: string;
  desk_id: string;
  start_date: string;
  end_date: string;
  remote_ratio: number;
}

export interface DeskPopularityTrend {
  desk_id: string;
  total_bookings: number;
  unique_users: number;
  avg_booking_duration_days: number;
  teams_used: string[];
}

export interface TeamTrend {
  team: string;
  total_bookings: number;
  unique_employees: number;
  avg_remote_ratio: number;
  most_popular_desks: { desk_id: string; count: number }[];
  desk_hopping_rate: number; // Average desks per employee
}

export interface RemoteWorkTrend {
  period: string;
  avg_remote_ratio: number;
  total_bookings: number;
}

export interface EmployeeBehaviorTrend {
  employee_name: string;
  employee_id: string;
  team: string;
  total_bookings: number;
  unique_desks: number;
  avg_remote_ratio: number;
  preferred_desks: string[];
  loyalty_score: number; // 0-1, how often they return to same desk
}

class TrendService {
  private history: SeatHistoryRecord[];

  constructor() {
    this.history = seatHistoryData as SeatHistoryRecord[];
  }

  /**
   * Get all historical records
   */
  getHistory(): SeatHistoryRecord[] {
    return this.history;
  }

  /**
   * Get desk popularity trends
   */
  getDeskPopularityTrends(): DeskPopularityTrend[] {
    const deskMap = new Map<string, SeatHistoryRecord[]>();

    // Group by desk
    this.history.forEach(record => {
      if (!deskMap.has(record.desk_id)) {
        deskMap.set(record.desk_id, []);
      }
      deskMap.get(record.desk_id)!.push(record);
    });

    // Calculate trends
    const trends: DeskPopularityTrend[] = [];
    deskMap.forEach((records, desk_id) => {
      const uniqueUsers = new Set(records.map(r => r.employee_id)).size;
      const teamsUsed = Array.from(new Set(records.map(r => r.team)));

      // Calculate average booking duration
      const totalDuration = records.reduce((sum, r) => {
        const start = new Date(r.start_date);
        const end = new Date(r.end_date);
        const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        return sum + days;
      }, 0);

      trends.push({
        desk_id,
        total_bookings: records.length,
        unique_users: uniqueUsers,
        avg_booking_duration_days: Math.round(totalDuration / records.length),
        teams_used: teamsUsed
      });
    });

    return trends.sort((a, b) => b.total_bookings - a.total_bookings);
  }

  /**
   * Get most popular desks (top N)
   */
  getTopDesks(limit: number = 10): DeskPopularityTrend[] {
    return this.getDeskPopularityTrends().slice(0, limit);
  }

  /**
   * Get least popular desks (bottom N)
   */
  getLeastPopularDesks(limit: number = 10): DeskPopularityTrend[] {
    const trends = this.getDeskPopularityTrends();
    return trends.slice(-limit).reverse();
  }

  /**
   * Get team trends
   */
  getTeamTrends(): TeamTrend[] {
    const teamMap = new Map<string, SeatHistoryRecord[]>();

    // Group by team
    this.history.forEach(record => {
      if (!teamMap.has(record.team)) {
        teamMap.set(record.team, []);
      }
      teamMap.get(record.team)!.push(record);
    });

    const trends: TeamTrend[] = [];
    teamMap.forEach((records, team) => {
      const uniqueEmployees = new Set(records.map(r => r.employee_id)).size;
      const avgRemoteRatio = records.reduce((sum, r) => sum + r.remote_ratio, 0) / records.length;

      // Most popular desks for this team
      const deskCount = new Map<string, number>();
      records.forEach(r => {
        deskCount.set(r.desk_id, (deskCount.get(r.desk_id) || 0) + 1);
      });

      const mostPopularDesks = Array.from(deskCount.entries())
        .map(([desk_id, count]) => ({ desk_id, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      // Desk hopping rate (avg desks per employee)
      const employeeDesks = new Map<string, Set<string>>();
      records.forEach(r => {
        if (!employeeDesks.has(r.employee_id)) {
          employeeDesks.set(r.employee_id, new Set());
        }
        employeeDesks.get(r.employee_id)!.add(r.desk_id);
      });

      const totalDesksPerEmployee = Array.from(employeeDesks.values())
        .reduce((sum, desks) => sum + desks.size, 0);
      const deskHoppingRate = totalDesksPerEmployee / uniqueEmployees;

      trends.push({
        team,
        total_bookings: records.length,
        unique_employees: uniqueEmployees,
        avg_remote_ratio: avgRemoteRatio,
        most_popular_desks: mostPopularDesks,
        desk_hopping_rate: deskHoppingRate
      });
    });

    return trends.sort((a, b) => b.total_bookings - a.total_bookings);
  }

  /**
   * Get remote work trends over time
   */
  getRemoteWorkTrends(): RemoteWorkTrend[] {
    // Group by month
    const monthMap = new Map<string, SeatHistoryRecord[]>();

    this.history.forEach(record => {
      const date = new Date(record.start_date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

      if (!monthMap.has(monthKey)) {
        monthMap.set(monthKey, []);
      }
      monthMap.get(monthKey)!.push(record);
    });

    const trends: RemoteWorkTrend[] = [];
    monthMap.forEach((records, period) => {
      const avgRemoteRatio = records.reduce((sum, r) => sum + r.remote_ratio, 0) / records.length;

      trends.push({
        period,
        avg_remote_ratio: avgRemoteRatio,
        total_bookings: records.length
      });
    });

    return trends.sort((a, b) => a.period.localeCompare(b.period));
  }

  /**
   * Get employee behavior trends
   */
  getEmployeeBehaviorTrends(): EmployeeBehaviorTrend[] {
    const employeeMap = new Map<string, SeatHistoryRecord[]>();

    // Group by employee
    this.history.forEach(record => {
      if (!employeeMap.has(record.employee_id)) {
        employeeMap.set(record.employee_id, []);
      }
      employeeMap.get(record.employee_id)!.push(record);
    });

    const trends: EmployeeBehaviorTrend[] = [];
    employeeMap.forEach((records, employee_id) => {
      const uniqueDesks = new Set(records.map(r => r.desk_id));
      const avgRemoteRatio = records.reduce((sum, r) => sum + r.remote_ratio, 0) / records.length;

      // Find preferred desks (most frequently used)
      const deskCount = new Map<string, number>();
      records.forEach(r => {
        deskCount.set(r.desk_id, (deskCount.get(r.desk_id) || 0) + 1);
      });

      const preferredDesks = Array.from(deskCount.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([desk_id]) => desk_id);

      // Calculate loyalty score (how often they return to most used desk)
      const maxDeskCount = Math.max(...Array.from(deskCount.values()));
      const loyaltyScore = maxDeskCount / records.length;

      trends.push({
        employee_name: records[0].employee_name,
        employee_id,
        team: records[0].team,
        total_bookings: records.length,
        unique_desks: uniqueDesks.size,
        avg_remote_ratio: avgRemoteRatio,
        preferred_desks: preferredDesks,
        loyalty_score: loyaltyScore
      });
    });

    return trends.sort((a, b) => b.total_bookings - a.total_bookings);
  }

  /**
   * Get desk utilization insights
   */
  getDeskUtilizationInsights() {
    const allDesks = this.getDeskPopularityTrends();
    const totalDesks = allDesks.length;
    const bookedDesks = allDesks.filter(d => d.total_bookings > 0).length;

    const avgBookingsPerDesk = allDesks.reduce((sum, d) => sum + d.total_bookings, 0) / totalDesks;
    const avgUniqueUsersPerDesk = allDesks.reduce((sum, d) => sum + d.unique_users, 0) / totalDesks;

    // Find hotspot desks (top 20%)
    const hotspotThreshold = Math.ceil(totalDesks * 0.2);
    const hotspots = allDesks.slice(0, hotspotThreshold);

    // Find underutilized desks (bottom 20%)
    const underutilized = allDesks.slice(-hotspotThreshold);

    return {
      total_desks: totalDesks,
      booked_desks: bookedDesks,
      utilization_rate: (bookedDesks / totalDesks) * 100,
      avg_bookings_per_desk: avgBookingsPerDesk,
      avg_unique_users_per_desk: avgUniqueUsersPerDesk,
      hotspots: hotspots.map(d => d.desk_id),
      underutilized: underutilized.map(d => d.desk_id)
    };
  }

  /**
   * Get cross-team desk usage (desks used by multiple teams)
   */
  getCrossTeamUsage(): Array<{ desk_id: string; teams: string[]; count: number }> {
    const deskTrends = this.getDeskPopularityTrends();

    return deskTrends
      .filter(d => d.teams_used.length > 1)
      .map(d => ({
        desk_id: d.desk_id,
        teams: d.teams_used,
        count: d.teams_used.length
      }))
      .sort((a, b) => b.count - a.count);
  }

  /**
   * Get booking duration statistics
   */
  getBookingDurationStats() {
    const durations = this.history.map(record => {
      const start = new Date(record.start_date);
      const end = new Date(record.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });

    durations.sort((a, b) => a - b);

    const avg = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const median = durations[Math.floor(durations.length / 2)];
    const min = Math.min(...durations);
    const max = Math.max(...durations);

    return {
      average_days: Math.round(avg),
      median_days: median,
      min_days: min,
      max_days: max,
      total_bookings: durations.length
    };
  }

  /**
   * Get peak usage periods
   */
  getPeakUsagePeriods(): Array<{ month: string; bookings: number; avg_remote: number }> {
    const monthlyData = this.getRemoteWorkTrends();

    return monthlyData
      .map(trend => ({
        month: trend.period,
        bookings: trend.total_bookings,
        avg_remote: trend.avg_remote_ratio
      }))
      .sort((a, b) => b.bookings - a.bookings);
  }

  /**
   * Get desk recommendations based on historical data
   */
  getDeskRecommendationsFromHistory(team: string, limit: number = 5): string[] {
    const teamTrends = this.getTeamTrends();
    const teamTrend = teamTrends.find(t => t.team === team);

    if (!teamTrend) {
      return [];
    }

    return teamTrend.most_popular_desks
      .slice(0, limit)
      .map(d => d.desk_id);
  }

  /**
   * Get insights summary for dashboard
   */
  getInsightsSummary() {
    const teamTrends = this.getTeamTrends();
    const deskTrends = this.getDeskPopularityTrends();
    const utilization = this.getDeskUtilizationInsights();
    const durationStats = this.getBookingDurationStats();
    const remoteWorkTrends = this.getRemoteWorkTrends();

    const avgRemoteRatio = remoteWorkTrends.reduce((sum, t) => sum + t.avg_remote_ratio, 0) / remoteWorkTrends.length;

    const mostActiveTeam = teamTrends[0];
    const mostPopularDesk = deskTrends[0];

    return {
      total_bookings: this.history.length,
      total_unique_employees: new Set(this.history.map(r => r.employee_id)).size,
      total_unique_desks: deskTrends.length,
      avg_remote_work_ratio: avgRemoteRatio,
      avg_booking_duration_days: durationStats.average_days,
      desk_utilization_rate: utilization.utilization_rate,
      most_active_team: mostActiveTeam?.team || 'N/A',
      most_popular_desk: mostPopularDesk?.desk_id || 'N/A',
      hotspot_count: utilization.hotspots.length,
      underutilized_count: utilization.underutilized.length
    };
  }
}

// Export singleton instance
export const trendService = new TrendService();
export default trendService;
