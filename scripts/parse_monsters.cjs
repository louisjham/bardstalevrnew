const fs = require('fs');
const content = fs.readFileSync('src/data/MonsterDatabase.js', 'utf8');
const regex = /id:\s*(\d+),\s*slug:\s*"([^"]+)",\s*name:\s*"([^"]+)"/g;
let m;
const monsters = [];
while ((m = regex.exec(content)) !== null) {
  monsters.push({ id: parseInt(m[1]), slug: m[2], name: m[3] });
}
console.log('Total monsters parsed:', monsters.length);
console.log(JSON.stringify(monsters, null, 2));
