const fs = require('fs');
const path = require('path');

const imagePath = path.join('src', 'assets', 'images', 'sarte_salon_logo.jpg');
const outputPath = path.join(__dirname, 'logo_base64.txt');

try {
    const bitmap = fs.readFileSync(imagePath);
    const base64 = Buffer.from(bitmap).toString('base64');
    fs.writeFileSync(outputPath, base64);
    console.log('Base64 saved to ' + outputPath);
} catch (err) {
    console.error('Error reading file:', err);
}
