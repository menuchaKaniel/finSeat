# Seat Database System

## Overview

The `office_layout.json` file serves as the **database** for the project, storing the initial and current state of all seats in the office.

## Initial State

- **All seats are AVAILABLE** except for seats in the **Reserved team**
- Reserved team seats are **OCCUPIED** by default and cannot be booked
- Total desks: **112**
  - Available: **92** seats
  - Reserved (occupied): **20** seats

## Data Structure

```json
{
  "meeting_rooms": [...],
  "desks": [
    {
      "desk_id": "RIS-NW-01",
      "team": "Risk",
      "zone": "NW",
      "coordinates": { "x": 100, "y": 100 },
      "nearby": {
        "meeting_rooms": ["Hermon", "Tavor"],
        "bathroom": true,
        "window": false,
        "kitchenette": true
      },
      "equipment": ["dock", "chair", "keyboard"],
      "status": "available",      // "available" or "occupied"
      "reserved_for": null        // Username when occupied
    }
  ]
}
```

## State Management

### In-Memory State
The application uses a `SeatService` class that:
1. Loads the initial state from `office_layout.json`
2. Maintains the current state in memory
3. Persists changes to `localStorage` for session persistence

### Booking a Seat
When a user books a seat:
1. `seatService.reserveSeat(deskId, userName)` is called
2. The desk status changes to `"occupied"`
3. The `reserved_for` field is set to the username
4. State is saved to `localStorage`

### Releasing a Seat
To release a seat:
```typescript
seatService.releaseSeat(deskId);
```
- Status changes back to `"available"`
- `reserved_for` is set to `null`
- Reserved team seats **cannot** be released

## Reset to Initial State

### Via Script (Node.js)
Reset all seats to initial state (all available except Reserved team):

```bash
npm run reset-seats
```

This script:
- Sets all non-Reserved seats to `"available"`
- Sets all Reserved team seats to `"occupied"`
- Updates the `office_layout.json` file directly

### Via Application (Browser)
Reset state in the browser:

```typescript
import { seatService } from './services/seatService';

// Reset to initial state
seatService.resetToInitialState();
```

## Usage Examples

### Check Seat Availability
```typescript
const isAvailable = seatService.isSeatAvailable('RIS-NW-01');
```

### Get Available Seats
```typescript
const availableSeats = seatService.getAvailableDesks();
console.log(`${availableSeats.length} seats available`);
```

### Get Statistics
```typescript
const stats = seatService.getStatistics();
// {
//   total: 112,
//   available: 92,
//   occupied: 20,
//   reserved: 20,
//   availablePercentage: 82,
//   occupiedPercentage: 18
// }
```

### Get Desks by Team
```typescript
const engineeringDesks = seatService.getDesksByTeam('Engineering');
const reservedDesks = seatService.getDesksByTeam('Reserved');
```

## Teams in Office

1. **Risk** - NW Zone
2. **Product** - NE Zone  
3. **DevOps** - E Zone
4. **IT Security** - SE Zone
5. **Engineering** - SW & S Zones
6. **Reserved** - S Zone (permanently occupied)

## LocalStorage Persistence

The current state is automatically saved to `localStorage` with the key:
```
office_layout_state
```

This allows the app to remember seat reservations across page refreshes. To clear:
```javascript
localStorage.removeItem('office_layout_state');
```

## Production Considerations

For a production environment, you should:

1. **Replace localStorage with a backend API**
   - Store state in a database (PostgreSQL, MongoDB, etc.)
   - Implement proper authentication
   - Add real-time updates (WebSockets/SSE)

2. **Add Validation**
   - Validate desk_id exists
   - Check user permissions
   - Prevent double-booking

3. **Add Audit Trail**
   - Log all booking/release actions
   - Track who booked what and when
   - Generate usage reports

4. **Implement Booking Duration**
   - Add `scheduled_until` field
   - Auto-release seats after time expires
   - Send reminders before expiration

## File Structure

```
finSeat/
├── src/
│   ├── data/
│   │   └── office_layout.json       # Database of all seats
│   └── services/
│       └── seatService.ts            # Service to manage seat state
├── scripts/
│   └── resetSeats.js                 # Script to reset seats to initial state
└── SEAT_DATABASE.md                  # This file
```

## API Reference

See `src/services/seatService.ts` for full API documentation.

Key methods:
- `getAllDesks()` - Get all desks
- `getDeskById(id)` - Get specific desk
- `getAvailableDesks()` - Get all available desks
- `isSeatAvailable(id)` - Check if seat is available
- `reserveSeat(id, user)` - Reserve a seat
- `releaseSeat(id)` - Release a seat
- `getStatistics()` - Get usage statistics
- `resetToInitialState()` - Reset all seats
