// This script will regenerate seat_history.json with only the specified names for Risk, Product, DevOps, and Engineering, and valid JSON.
// It will also remove any invalid JSON comments or trailing commas.

const fs = require('fs');

// Allowed names for each team
const allowed = {
  Risk: [
    'Shimon Stroll', 'Gary Jaye', 'Nathaniel Selevan', 'Orya Jasper', 'Dovid Kesselman', 'Eli K.'
  ],
  Product: [
    'Devra Ariel', 'Rachel D.', 'Eli K.', 'Sara N.', 'Ari Pollack', 'Reuven Normile', 'Temima Greenberg', 'Ilan Axelrod'
  ],
  DevOps: [
    'Adina Cohen', 'Elyashiv Hofman', 'Haim Arie', 'Mendi Levin', 'Rachel Aslizada', 'Yossi Sabo', 'Nadav Peretz', 'Pnina Sofer'
  ],
  Engineering: [
    'Sasha Soudarikov', 'Efrat Wizel', 'Miriam Blau', 'Miriam Neumann', 'Menucha Kaniel', 'Gil Griva', 'Yochi Bloy', 'Yehudit Ainhoren', 'Miriam Bisker', 'Netanel Kremer', 'Danil Brenner', 'Tzippy Freedman', 'Maor Opedisano', 'Naor Levi', 'Uri Keselman', 'Esther Rivka Kaye', 'Meni Goldstein', 'Basya Rosemann', 'Rena Markiewitz', 'Osnat Openhaim', 'Zvi Kuper', 'Dvir Tahar', 'Leah Lerner', 'Shaindy Dubin', 'Rut Bagad', 'Benjamin Malev', 'Esther Leiman'
  ]
};

const inputPath = './seat_history.json';
const outputPath = './seat_history.json';

let data = fs.readFileSync(inputPath, 'utf-8');
// Remove comments and fix trailing commas
let cleanData = data.replace(/\/\/.*$/gm, '').replace(/,\s*([\]}])/g, '$1');
let records = JSON.parse(cleanData);

const filtered = records.filter(r => {
  if (!r.team || !r.employee_name) return false;
  if (!allowed[r.team]) return false;
  return allowed[r.team].includes(r.employee_name);
});

fs.writeFileSync(outputPath, JSON.stringify(filtered, null, 2));
console.log(`Filtered history written to ${outputPath}. ${filtered.length} records remain.`);
