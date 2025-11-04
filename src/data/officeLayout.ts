import { Seat, ZoneType, MeetingRoom, Facility, SeatOccupancyRecord, SeatOccupancyHistory } from '../types';
// @ts-ignore
import officeLayoutData from './office_layout.json';

const FLOOR = 1;

// Load meeting rooms from JSON
export const meetingRooms: MeetingRoom[] = officeLayoutData.meeting_rooms.map((room: any) => ({
  id: room.id,
  name: room.name,
  capacity: room.capacity,
  equipment: room.type === 'Meeting Room' || room.type === 'Conference Room' 
    ? ['whiteboard', 'screen', 'vc'] 
    : room.type === 'Wellness Room' 
      ? ['wellness'] 
      : ['reserved'],
  x: 0, // These will be positioned separately in the UI
  y: 0,
  floor: FLOOR,
  zone: room.zone,
  type: room.type,
  notes: room.notes
}));

// Define facilities based on office layout data
export const facilities: Facility[] = [
  { id: 'bath-nw', type: 'bathroom', name: 'NW Bathroom', x: 1, y: 2, floor: FLOOR },
  { id: 'bath-w', type: 'bathroom', name: 'W Bathroom', x: 0.5, y: 5, floor: FLOOR },
  { id: 'kitchen-nw', type: 'kitchen', name: 'Cafeteria', x: 3, y: 1, floor: FLOOR },
  { id: 'kitchen-se', type: 'kitchen', name: 'SE Kitchenette', x: 8, y: 8, floor: FLOOR },
  { id: 'printer-1', type: 'printer', name: 'Printer', x: 5, y: 5, floor: FLOOR },
  { id: 'exit-main', type: 'exit', name: 'Main Exit', x: 5, y: 10, floor: FLOOR }
];

// Helper to compute Euclidean distance
const distance = (x1: number, y1: number, x2: number, y2: number) => Math.sqrt((x1 - x2) ** 2 + (y1 - y2) ** 2);

// Map zone strings to ZoneType enum
function mapZoneToType(zone: string): ZoneType {
  if (zone.includes('NW') || zone.includes('NE')) return ZoneType.QUIET;
  if (zone.includes('SW') || zone.includes('SE')) return ZoneType.COLLABORATIVE;
  if (zone.includes('W')) return ZoneType.FOCUS;
  return ZoneType.SOCIAL;
}

// Load seats from JSON and convert to Seat interface
export const seats: Seat[] = officeLayoutData.desks.map((desk: any, index: number) => {
  const { desk_id, zone, coordinates, nearby, equipment, status } = desk;
  
  // Features based on equipment and nearby amenities
  const features: Seat['features'] = [];
  if (equipment.includes('monitor')) features.push({ type: 'monitor', label: 'Extra Monitor' });
  if (nearby.window) features.push({ type: 'window-view', label: 'Window View' });
  if (nearby.kitchenette || nearby.cafeteria) features.push({ type: 'near-kitchen', label: 'Near Kitchen' });
  if (mapZoneToType(zone) === ZoneType.QUIET) features.push({ type: 'quiet', label: 'Quiet Area' });
  if (mapZoneToType(zone) === ZoneType.COLLABORATIVE) features.push({ type: 'collaborative', label: 'Collaboration Space' });
  
  // Meeting rooms nearby
  const meetingRoomsNearby = nearby.meeting_rooms || [];
  const bathroomsNearby = nearby.bathroom ? ['bath-nw', 'bath-w'] : [];
  const kitchensNearby = nearby.kitchenette || nearby.cafeteria ? ['kitchen-nw', 'kitchen-se'] : [];
  
  const distToNearest = (type: Facility['type']) => {
    const facilityList = facilities.filter(f => f.type === type);
    const dists = facilityList.map(f => distance(coordinates.x, coordinates.y, f.x, f.y));
    return dists.length ? Math.min(...dists) : undefined;
  };

  return {
    id: desk_id,
    row: Math.floor(index / 10), // Approximate row from index
    column: index % 10, // Approximate column
    x: coordinates.x,
    y: coordinates.y,
    isAvailable: status === 'available',
    isSelected: false,
    zone: mapZoneToType(zone),
    features,
    orientation: zone.includes('N') ? 'north' : zone.includes('S') ? 'south' : zone.includes('E') ? 'east' : 'west',
    nearby: {
      meetingRooms: meetingRoomsNearby,
      bathrooms: bathroomsNearby,
      kitchens: kitchensNearby,
      windows: nearby.window ? 1 : 10,
      printers: ['printer-1'],
      exits: ['exit-main'],
    },
    distanceMetrics: {
      toNearestBathroom: nearby.bathroom ? 1 : 10,
      toNearestKitchen: nearby.kitchenette || nearby.cafeteria ? 1 : 10,
      toNearestExit: distToNearest('exit'),
      toNearestMeetingRoom: meetingRoomsNearby.length ? 1 : 10,
      toNearestPrinter: distToNearest('printer'),
      toNearestWindow: nearby.window ? 1 : 10,
    },
    adjacency: {
      left: undefined, // Can be computed based on coordinates if needed
      right: undefined,
      front: undefined,
      back: undefined,
    },
    ergonomic: {
      hasAdjustableChair: equipment.includes('chair'),
      hasStandingOption: false,
      monitorCount: equipment.includes('monitor') ? 2 : 1,
      lighting: nearby.window ? 'bright' : 'medium'
    }
  } as Seat;
});

// Synthetic occupancy history generation for last year
const BUSINESS_START_HOUR = 9;
const BUSINESS_END_HOUR = 18;
const DAYS_BACK = 365;

function generateHistory(): SeatOccupancyHistory[] {
  const histories: SeatOccupancyHistory[] = [];
  const now = new Date();
  for (const seat of seats) {
    const records: SeatOccupancyRecord[] = [];
    for (let d = 1; d <= DAYS_BACK; d++) {
      const day = new Date(now.getTime() - d * 24 * 60 * 60 * 1000);
      const weekday = day.getDay(); // 0 Sun .. 6 Sat
      if (weekday === 0 || weekday === 6) continue; // skip weekends
      // Probability seat used based on zone
      const baseProb = seat.zone === ZoneType.QUIET ? 0.55 : seat.zone === ZoneType.COLLABORATIVE ? 0.7 : seat.zone === ZoneType.SOCIAL ? 0.5 : 0.6;
      if (Math.random() < baseProb) {
        // Create 1-2 occupancy sessions
        const sessions = 1 + (Math.random() < 0.3 ? 1 : 0);
        for (let s = 0; s < sessions; s++) {
          const startHour = BUSINESS_START_HOUR + Math.floor(Math.random() * (BUSINESS_END_HOUR - BUSINESS_START_HOUR - 3));
          const durationHours = 2 + Math.floor(Math.random() * 3); // 2-4 hours
          const startTime = new Date(day.getFullYear(), day.getMonth(), day.getDate(), startHour, 0, 0);
          const endTime = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
          const purposeRand = Math.random();
          const purpose: SeatOccupancyRecord['purpose'] = purposeRand < 0.5 ? 'focus' : purposeRand < 0.75 ? 'collaboration' : purposeRand < 0.9 ? 'meeting' : 'transient';
          records.push({
            seatId: seat.id,
            userId: `user-${(Math.floor(Math.random() * 50) + 1).toString().padStart(2, '0')}`,
            startTime,
            endTime,
            purpose
          });
        }
      }
    }
    // Compute utilization
    const totalBusinessHours = 52 * 5 * (BUSINESS_END_HOUR - BUSINESS_START_HOUR); // approximate year
    const occupiedHours = records.reduce((acc, r) => acc + (r.endTime.getTime() - r.startTime.getTime()) / (60 * 60 * 1000), 0);
    const utilizationRate = +(occupiedHours / totalBusinessHours).toFixed(3);
    histories.push({ seatId: seat.id, records, utilizationRate });
  }
  return histories;
}

export const seatHistories: SeatOccupancyHistory[] = generateHistory();

// Query helpers
export function findSeatsByFeature(featureType: string): Seat[] {
  return seats.filter(s => s.features.some(f => f.type === featureType));
}

export function findSeatsNearFacility(facilityType: Facility['type'], maxDistance: number): Seat[] {
  return seats.filter(s => {
    switch (facilityType) {
      case 'bathroom': return (s.distanceMetrics?.toNearestBathroom ?? Infinity) <= maxDistance;
      case 'kitchen': return (s.distanceMetrics?.toNearestKitchen ?? Infinity) <= maxDistance;
      case 'exit': return (s.distanceMetrics?.toNearestExit ?? Infinity) <= maxDistance;
      case 'printer': return (s.distanceMetrics?.toNearestPrinter ?? Infinity) <= maxDistance;
      case 'window': return (s.distanceMetrics?.toNearestWindow ?? Infinity) <= maxDistance;
      default: return false;
    }
  });
}

export function getSeatHistory(seatId: string): SeatOccupancyHistory | undefined {
  return seatHistories.find(h => h.seatId === seatId);
}

export function topUtilizedSeats(limit = 10) {
  return [...seatHistories].sort((a, b) => (b.utilizationRate ?? 0) - (a.utilizationRate ?? 0)).slice(0, limit);
}

export function leastUtilizedSeats(limit = 10) {
  return [...seatHistories].sort((a, b) => (a.utilizationRate ?? 0) - (b.utilizationRate ?? 0)).slice(0, limit);
}
