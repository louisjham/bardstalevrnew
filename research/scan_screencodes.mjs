import fs from 'fs';
import path from 'path';

function screenCodeToAscii(b) {
  const code = b & 0x7F;
  if (code >= 1 && code <= 26) return String.fromCharCode(64 + code);
  if (code === 0) return '@';
  if (code >= 48 && code <= 57) return String.fromCharCode(code);
  if (code === 32) return ' ';
  if (code === 33) return '!';
  if (code === 44) return ',';
  if (code === 46) return '.';
  if (code === 58) return ':';
  if (code === 63) return '?';
  if (code === 45) return '-';
  return null;
}

function scanDirScreenCodes(dir) {
  if (!fs.existsSync(dir)) return;
  const files = fs.readdirSync(dir);
  for (const f of files) {
    const full = path.join(dir, f);
    if (!fs.statSync(full).isFile()) continue;
    const buf = fs.readFileSync(full);
    let cur = '';
    for (let i = 0; i < buf.length; i++) {
      const ch = screenCodeToAscii(buf[i]);
      if (ch) {
        cur += ch;
      } else {
        if (cur.length >= 5 && /SWING|HIT|MISS|DAMAGE|SLAIN|CAST|ATTACK|POINTS|KILLED/i.test(cur)) {
          console.log(f, cur);
        }
        cur = '';
      }
    }
  }
}

console.log('Scanning tmp_boot:');
scanDirScreenCodes('./research/tmp_boot');
console.log('Scanning tmp_char:');
scanDirScreenCodes('./research/tmp_char');
console.log('Scanning tmp_dung:');
scanDirScreenCodes('./research/tmp_dung');
