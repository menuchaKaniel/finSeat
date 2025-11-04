# AI Desk Buddy 2.0

A smart, AI-powered seat recommendation system with a chat-style interface for finding the perfect workspace based on your schedule, collaboration needs, and office vibe zones.

## Features

🤖 **AI-Powered Recommendations** - Intelligent seat suggestions based on your preferences, schedule, and work style

💬 **Chat Interface** - Natural conversation flow for requesting and booking seats

🗺️ **Interactive Seat Map** - Visual floor plan with clickable seats and real-time availability

🎯 **Smart Zone Detection** - Dynamic highlighting of quiet, social, collaborative, and focus areas

⏰ **Schedule Integration** - Considers your upcoming meetings and work blocks

📊 **Real-time Analytics** - Live occupancy rates and zone activity levels

✨ **Smooth Animations** - Polished UI with Framer Motion animations

## Getting Started

### Prerequisites

- Node.js 14+ 
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Start the development server:
```bash
npm start
```

3. Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

## How It Works

### 1. Chat with AI Desk Buddy
Start by telling the AI what kind of workspace you need:
- "I need a quiet seat for focused work"
- "Find me a collaborative space for team brainstorming"  
- "Book me a seat with a monitor near the kitchen"

### 2. Smart Recommendations
The AI analyzes multiple factors:
- **Your work style** (quiet, social, mixed)
- **Current schedule** and upcoming meetings
- **Zone preferences** and activity levels
- **Seat features** (monitors, standing desks, window views)
- **Time of day** and productivity patterns

### 3. Interactive Selection
- View recommendations on the interactive map
- See zone highlights and activity levels
- Click seats to select and book
- Get real-time availability updates

### 4. Seamless Booking
- One-click seat booking from chat or map
- Automatic calendar integration
- Smart duration suggestions based on your schedule

## Zone Types

- 🧘 **Quiet Zone** - For focused, distraction-free work
- 🎉 **Social Hub** - For networking and casual conversations  
- 🤝 **Collaboration Space** - For teamwork and brainstorming
- 🎯 **Focus Area** - For deep work with minimal interruptions
- 📅 **Meeting Zone** - Near conference rooms and collaboration tools

## Customization

The AI learns your preferences over time and can be customized for:
- **Work Style Preferences** 
- **Collaboration Needs**
- **Time-based Patterns**
- **Feature Requirements**
- **Zone Preferences**

## Tech Stack

- **React 18** with TypeScript
- **Styled Components** for styling
- **Framer Motion** for animations
- **Lucide React** for icons
- **Date-fns** for date handling
- **Custom AI Engine** for smart recommendations

## Architecture

```
src/
├── components/
│   ├── SeatMap.tsx          # Interactive floor plan
│   └── ChatInterface.tsx    # Chat UI and messaging
├── types/
│   └── index.ts            # TypeScript definitions
├── utils/
│   └── aiEngine.ts         # AI recommendation logic
├── App.tsx                 # Main application
└── index.tsx               # Entry point
```

## Future Enhancements

- 🔌 **Calendar Integration** (Google, Outlook)
- 📱 **Mobile App** with push notifications
- 🌡️ **Environmental Sensors** (temperature, noise, air quality)  
- 👥 **Team Coordination** and group booking
- 📈 **Analytics Dashboard** for facility managers
- 🔒 **Enterprise SSO** integration
- 🎨 **Custom Office Layouts** import tool

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

Made with ❤️ for better workplace experiences

## Data Model & Synthetic History (Hackathon Extension)

This hackathon extension introduces a richer spatial data layer and one year of synthetic occupancy history to power advanced AI queries.

### New Types
- `MeetingRoom` – location, capacity, equipment
- `Facility` – generic point for bathrooms, kitchens, printer banks, exits, windows
- Extended `Seat` metadata:
	- `orientation` (north/south/east/west)
	- `nearby` lists (IDs of meeting rooms, bathrooms, etc. within proximity) and window distance
	- `distanceMetrics` (numeric distances to key facilities)
	- `adjacency` (neighbor seat IDs: left/right/front/back)
	- `ergonomic` (standing option, monitor count, lighting)
- `SeatOccupancyRecord` & `SeatOccupancyHistory` – historical usage with purpose tagging & utilization rate
- `Desk` – Hackathon premium model with business-centric fields (team, zone label, floor code, boolean proximities)

### Generated Data
See `src/data/officeLayout.ts` which exports:
- `seats` – enriched array of all seat objects (8 x 12 grid)
- `meetingRooms`, `facilities` – spatial references
- `seatHistories` – last 365 business days synthetic records
- Query helpers: `findSeatsByFeature`, `findSeatsNearFacility`, `getSeatHistory`, `topUtilizedSeats`, `leastUtilizedSeats`

### Usage Examples
```ts
import { seats, findSeatsNearFacility, topUtilizedSeats, getSeatHistory } from './src/data/officeLayout';
import { desks, deskToSeat } from './src/data/desks';

// Seats with window view feature
const windowSeats = seats.filter(s => s.features.some(f => f.type === 'window-view'));

// Seats near a kitchen within distance 3
const snackFriendly = findSeatsNearFacility('kitchen', 3);

// Highly utilized seats (top 5)
const hotSeats = topUtilizedSeats(5);

// One seat's last year usage pattern
const history = getSeatHistory('S-3-4');
console.log(history?.utilizationRate, history?.records.length);

// Ideal for a collaboration session near meeting rooms & printer
const collabCandidates = seats.filter(s =>
	s.zone === 'collaborative' &&
	(s.distanceMetrics?.toNearestMeetingRoom ?? 99) < 3 &&
	(s.distanceMetrics?.toNearestPrinter ?? 99) < 4
);

// Desk model usage
const engineeringAvailable = desks.filter(d => d.team === 'Engineering' && d.status === 'available');
const windowDesks = desks.filter(d => d.nearby.window);
// Convert a desk to legacy seat for AI scoring
const aiSeat = deskToSeat(desks[0]);
```

### AI Prompt Enrichment
When crafting an LLM prompt you can include:
- Seat proximity summary (meeting rooms, bathrooms, exits)
- Historical utilization (avoid consistently crowded seats if seeking quiet)
- Ergonomic flags (standing option, monitor count)
- Collaboration potential (adjacency, zone type)

### Extending Further
- Add real sensor inputs (noise, light) to `ergonomic`
- Persist real occupancy vs. synthetic
- Multi-floor support (add `floor` indexing & z-axis distances)
- Normalize `Desk` <-> `Seat` union for a unified recommendation engine

This enriched model helps the AI generate nuanced explanations like: *“Seat S-5-8 is 2.1m from a meeting room, has dual monitors, moderate lighting, and historically under 45% utilization—ideal for a spontaneous team huddle.”*