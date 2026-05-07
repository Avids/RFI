const fs = require('fs');
const path = require('path');
const publicDir = path.join(__dirname, '..', 'public');
for (const file of ['index.html', 'styles.css', 'app.js']) {
  const fullPath = path.join(publicDir, file);
  if (!fs.existsSync(fullPath)) throw new Error(`Missing required static asset: public/${file}`);
  const size = fs.statSync(fullPath).size;
  if (size === 0) throw new Error(`Static asset is empty: public/${file}`);
  console.log(`✓ public/${file} (${size} bytes)`);
}
console.log('Static Vercel build completed.');
