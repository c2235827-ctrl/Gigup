import fs from 'fs';
import https from 'https';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const imageUrl = 'https://cdn-icons-png.flaticon.com/512/15106/15106527.png';

// Directories to ensure exist
const publicDir = path.join(__dirname, 'public');
const iconsDir = path.join(publicDir, 'icons');

if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

const targets = [
  path.join(iconsDir, 'icon-192.png'),
  path.join(publicDir, 'favicon.ico'),
  path.join(publicDir, 'favicon.png'),
  path.join(publicDir, 'logo.png')
];

console.log('Downloading custom GigUp app icon (Hummingbird) from Flaticon...');

https.get(imageUrl, {
  headers: {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.36'
  }
}, (res) => {
  if (res.statusCode !== 200) {
    console.error(`Failed to download icon: Status ${res.statusCode}`);
    // fallback creation of small mock icon or crash
    process.exit(0);
  }

  const chunks = [];
  res.on('data', (chunk) => chunks.push(chunk));
  res.on('end', () => {
    const buffer = Buffer.concat(chunks);
    for (const target of targets) {
      fs.writeFileSync(target, buffer);
      console.log(`Saved logo asset to: ${target}`);
    }
    console.log('GigUp brand asset synchronisation completed successfully.');
  });
}).on('error', (err) => {
  console.error('Error downloading custom icon:', err);
});
