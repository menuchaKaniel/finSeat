import { Desk, Seat } from '../types';
import { seats as layoutSeats } from './officeLayout';
// @ts-ignore
import officeLayoutData from './office_layout.json';

// Load desks directly from JSON with proper typing
export const desks: Desk[] = officeLayoutData.desks.map((deskData: any): Desk => {
  return {
    desk_id: deskData.desk_id,
    team: deskData.team,
    zone: deskData.zone,
    coordinates: {
      x: deskData.coordinates.x,
      y: deskData.coordinates.y
    },
    floor: 'CRT', // Default floor from context
    nearby: {
      meeting_rooms: deskData.nearby.meeting_rooms || [],
      bathroom: deskData.nearby.bathroom || false,
      shower: deskData.nearby.shower || false,
      kitchenette: deskData.nearby.kitchenette || false,
      cafeteria: deskData.nearby.cafeteria || false,
      window: deskData.nearby.window || false,
      elevator: deskData.nearby.elevator || false,
    },
    status: deskData.status,
    equipment: deskData.equipment || [],
    reserved_for: deskData.reserved_for,
    notes: deskData.notes,
    legacySeatId: deskData.desk_id
  };
});

// Utility: map Desk to Seat approximation for AI engine compatibility
export function deskToSeat(desk: Desk): Seat {
  const seat = layoutSeats.find(s => s.id === desk.legacySeatId);
  if (seat) return seat;
  
  return {
    id: desk.desk_id,
    row: 0,
    column: 0,
    x: desk.coordinates.x,
    y: desk.coordinates.y,
    isAvailable: desk.status === 'available',
    isSelected: false,
    zone: 'focus' as any,
    features: desk.equipment.map(e => ({ type: e as any, label: e })),
  };
}
