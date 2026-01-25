// Generate social sharing thumbnail for anamnesis.fm
import sharp from 'sharp';
import { writeFileSync } from 'fs';

// Thumbnail dimensions optimized for social sharing (1200x630 is standard OG image)
const WIDTH = 1200;
const HEIGHT = 630;

// Radio UI colors
const COLORS = {
  bg: '#0a0a0a',
  cabinet: '#1a1a1a',
  display: '#0d1a12',
  displayText: '#3dff7f',
  displayGlow: 'rgba(61, 255, 127, 0.5)',
  textMuted: '#808080',
  border: '#2a2a2a',
  scanline: 'rgba(0, 0, 0, 0.15)',
};

// Create SVG for the thumbnail
const svg = `
<svg width="${WIDTH}" height="${HEIGHT}" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <!-- CRT scanlines pattern -->
    <pattern id="scanlines" patternUnits="userSpaceOnUse" width="4" height="4">
      <rect width="4" height="2" fill="${COLORS.scanline}"/>
    </pattern>

    <!-- Glow filter for text -->
    <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="8" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Subtle glow for display -->
    <filter id="displayGlow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="15" result="blur"/>
      <feMerge>
        <feMergeNode in="blur"/>
        <feMergeNode in="SourceGraphic"/>
      </feMerge>
    </filter>

    <!-- Radial gradient for background -->
    <radialGradient id="bgGradient" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#151515"/>
      <stop offset="100%" stop-color="${COLORS.bg}"/>
    </radialGradient>
  </defs>

  <!-- Background -->
  <rect width="100%" height="100%" fill="url(#bgGradient)"/>

  <!-- Cabinet body -->
  <rect x="100" y="120" width="1000" height="390" rx="8" fill="${COLORS.cabinet}"
        stroke="${COLORS.border}" stroke-width="2"/>

  <!-- Title bar -->
  <rect x="100" y="120" width="1000" height="50" rx="8" fill="#252525"/>
  <rect x="100" y="150" width="1000" height="20" fill="#252525"/>

  <!-- Display panel - larger and centered -->
  <rect x="150" y="190" width="900" height="280" rx="4" fill="${COLORS.display}"
        stroke="#1a1a1a" stroke-width="4"/>

  <!-- Display inner glow -->
  <rect x="155" y="195" width="890" height="270" rx="2" fill="none"
        stroke="rgba(61, 255, 127, 0.1)" stroke-width="2"/>

  <!-- Scanlines overlay on display -->
  <rect x="150" y="190" width="900" height="280" rx="4" fill="url(#scanlines)" opacity="0.5"/>

  <!-- Main title -->
  <text x="600" y="310" text-anchor="middle" font-family="monospace, 'Courier New'"
        font-size="80" font-weight="bold" fill="${COLORS.displayText}" filter="url(#glow)">
    anamnesis.fm
  </text>

  <!-- Tagline -->
  <text x="600" y="380" text-anchor="middle" font-family="monospace, 'Courier New'"
        font-size="32" fill="${COLORS.displayText}" opacity="0.7">
    a time traveling radio
  </text>
</svg>
`;

async function generateThumbnail() {
  try {
    const buffer = Buffer.from(svg);

    await sharp(buffer)
      .resize(WIDTH, HEIGHT)
      .png({ quality: 90, compressionLevel: 9 })
      .toFile('./public/thumb.png');

    console.log('Thumbnail generated successfully: public/thumb.png');
    console.log(`Dimensions: ${WIDTH}x${HEIGHT}`);
  } catch (error) {
    console.error('Failed to generate thumbnail:', error);
    process.exit(1);
  }
}

generateThumbnail();
