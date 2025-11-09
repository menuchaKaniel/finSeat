// Script to reset all seats to initial state
// All seats available except Reserved team seats (which remain occupied)

const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../src/data/office_layout.json');

// Read the current data
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

// Reset all desks
data.desks = data.desks.map(desk => {
  // Keep Reserved team seats as occupied
  if (desk.team === 'Reserved') {
    return {
      ...desk,
      status: 'occupied',
      reserved_for: 'Reserved Team'
    };
  }
  
  // All other seats available
  return {
    ...desk,
    status: 'available',
    reserved_for: null
  };
});

// Write back to file
fs.writeFileSync(jsonPath, JSON.stringify(data, null, 2), 'utf8');

console.log('✅ Seats reset successfully!');
console.log(`   - Reserved team seats: ${data.desks.filter(d => d.team === 'Reserved').length} (occupied)`);
console.log(`   - Available seats: ${data.desks.filter(d => d.status === 'available').length}`);
console.log(`   - Total desks: ${data.desks.length}`);
