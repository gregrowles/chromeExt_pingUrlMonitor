// Simple script to generate icon files using Node.js
// Run with: node generate-icons.js

const fs = require('fs');
const path = require('path');

// Create a simple SVG icon that can be converted to PNG
// For now, we'll create a simple data URL approach
// Note: This requires a browser or image processing library
// For a quick solution, users can use the generate-icons.html file

console.log('Icon generation script');
console.log('Please use generate-icons.html in a browser to generate the icon files.');
console.log('Or install a package like "canvas" and run this script with proper image generation.');

// Alternative: Create a simple script that uses canvas if available
try {
  const { createCanvas } = require('canvas');
  const iconsDir = path.join(__dirname, 'icons');
  
  if (!fs.existsSync(iconsDir)) {
    fs.mkdirSync(iconsDir, { recursive: true });
  }
  
  function drawIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background
    ctx.fillStyle = '#3B82F6'; // Blue
    ctx.fillRect(0, 0, size, size);
    
    // Draw a simple ping/radar icon
    const centerX = size / 2;
    const centerY = size / 2;
    const radius = size * 0.35;
    
    // Outer circle
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = size * 0.08;
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
    ctx.stroke();
    
    // Inner circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius * 0.6, 0, Math.PI * 2);
    ctx.stroke();
    
    // Center dot
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(centerX, centerY, size * 0.1, 0, Math.PI * 2);
    ctx.fill();
    
    // Ping lines (radar sweep)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = size * 0.05;
    for (let i = 0; i < 4; i++) {
      const angle = (Math.PI * 2 * i) / 4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(
        centerX + Math.cos(angle) * radius,
        centerY + Math.sin(angle) * radius
      );
      ctx.stroke();
    }
    
    return canvas;
  }
  
  // Generate icons
  [16, 48, 128].forEach(size => {
    const canvas = drawIcon(size);
    const buffer = canvas.toBuffer('image/png');
    const filePath = path.join(iconsDir, `icon${size}.png`);
    fs.writeFileSync(filePath, buffer);
    console.log(`Generated icon${size}.png`);
  });
  
  console.log('All icons generated successfully!');
} catch (error) {
  console.log('Canvas package not found. Please either:');
  console.log('1. Use generate-icons.html in a browser to generate icons');
  console.log('2. Install canvas: npm install canvas');
  console.log('3. Or create your own icon files manually');
}

