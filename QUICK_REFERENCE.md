# Quick Reference - Seat Database System

## 🎯 Quick Commands

```bash
# Reset all seats to initial state
npm run reset-seats

# Start the app
npm start
```

## 💻 Common Code Snippets

### Import the Service
```typescript
import { seatService } from './services/seatService';
```

### Check Availability
```typescript
const isAvailable = seatService.isSeatAvailable('RIS-NW-01');
```

### Book a Seat
```typescript
const success = seatService.reserveSeat('RIS-NW-01', 'John Doe');
if (success) {
  console.log('Seat booked!');
}
```

### Release a Seat
```typescript
seatService.releaseSeat('RIS-NW-01');
```

### Get Statistics
```typescript
const stats = seatService.getStatistics();
console.log(`Available: ${stats.available}/${stats.total}`);
```

### Get All Available Seats
```typescript
const available = seatService.getAvailableDesks();
console.log(`${available.length} seats free`);
```

### Get Seats by Team
```typescript
const engineeringSeats = seatService.getDesksByTeam('Engineering');
```

### Reset Everything
```typescript
seatService.resetToInitialState();
```

## 📊 Initial State

- **Total**: 112 desks
- **Available**: 92 (all teams except Reserved)
- **Occupied**: 20 (Reserved team only)

## 🏢 Teams

1. Risk (NW)
2. Product (NE)
3. DevOps (E)
4. IT Security (SE)
5. Engineering (SW, S)
6. **Reserved (S)** ← Always occupied

## 📁 Key Files

```
src/
  data/office_layout.json          # Database
  services/seatService.ts          # Service API
  App.tsx                          # Integration

scripts/
  resetSeats.js                    # Reset script
```

## 🔑 localStorage Key

```javascript
// View current state
JSON.parse(localStorage.getItem('office_layout_state'))

// Clear state (will reload from JSON)
localStorage.removeItem('office_layout_state')
```

## 🚨 Important Rules

1. ✅ Reserved team seats **cannot** be booked or released
2. ✅ Bookings persist in localStorage across refreshes
3. ✅ Reset script updates the JSON file directly
4. ✅ Always use seatService methods (don't modify JSON manually in app)

## 🎨 Workflow

```
1. User selects seat on map
   ↓
2. App calls seatService.reserveSeat()
   ↓
3. Service updates state & localStorage
   ↓
4. UI reflects new state
   ↓
5. User refreshes → state loads from localStorage
```

## 🐛 Troubleshooting

**Seats not updating?**
- Check console for errors
- Clear localStorage: `localStorage.removeItem('office_layout_state')`
- Refresh page

**Need to start fresh?**
```bash
npm run reset-seats
# Then refresh browser
```

**Lost all bookings?**
- They're in localStorage
- Check: `localStorage.getItem('office_layout_state')`
- If null, run reset script to restore initial state

## 📚 Full Documentation

- Complete API: `SEAT_DATABASE.md`
- Implementation details: `SEAT_SYSTEM_SUMMARY.md`
