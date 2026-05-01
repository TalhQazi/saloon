const fs = require('fs');
const path = require('path');

const base64File = path.join(__dirname, 'new_logo_base64.txt');
const targetFile = path.join(__dirname, 'src', 'utils', 'thermalPrinter.js');

try {
    const newLogo = fs.readFileSync(base64File, 'utf8').trim();
    let content = fs.readFileSync(targetFile, 'utf8');

    // Regex to replace the logoBase64 assignment
    // We look for const logoBase64 = '...';
    // We'll trust there aren't single quotes inside the base64 string (there shouldn't be).
    const regex = /const logoBase64 = '.*';/;

    if (regex.test(content)) {
        content = content.replace(regex, `const logoBase64 = '${newLogo}';`);
        fs.writeFileSync(targetFile, content, 'utf8');
        console.log('Successfully updated logoBase64 in thermalPrinter.js');
    } else {
        console.error('Could not find logoBase64 variable in thermalPrinter.js');
    }

} catch (err) {
    console.error('Error:', err);
}
