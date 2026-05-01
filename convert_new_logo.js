const fs = require('fs');
const path = require('path');

// The path provided by the user metadata
const imagePath = 'd:/saloon/src/assets/images/logo-removebg-preview.png';
const outputPath = path.join(__dirname, 'new_logo_base64.txt');

try {
    if (fs.existsSync(imagePath)) {
        const bitmap = fs.readFileSync(imagePath);
        const base64 = Buffer.from(bitmap).toString('base64');
        fs.writeFileSync(outputPath, base64);
        console.log('Base64 saved to ' + outputPath);
    } else {
        console.error('Image file not found at: ' + imagePath);
    }
} catch (err) {
    console.error('Error reading file:', err);
}
