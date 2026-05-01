const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'utils', 'thermalPrinter.js');
const logoFile = 'new_logo_mono_base64.txt';

try {
    if (!fs.existsSync(targetFile)) {
        console.error('Target file not found:', targetFile);
        process.exit(1);
    }
    if (!fs.existsSync(logoFile)) {
        console.error('Logo file not found:', logoFile);
        process.exit(1);
    }

    let fileContent = fs.readFileSync(targetFile, 'utf8');
    let logoBase64 = fs.readFileSync(logoFile, 'utf8').trim();

    // Regex to find: const logoBase64 = '...';
    // We use [\s\S]*? to match the content inside the quotes non-greedily,
    // assuming the string might be long or have newlines (though base64 usually doesn't, it's safer).
    const regex = /(const logoBase64 = ')([\s\S]*?)(';)/;

    if (regex.test(fileContent)) {
        const newContent = fileContent.replace(regex, `$1${logoBase64}$3`);
        fs.writeFileSync(targetFile, newContent, 'utf8');
        console.log('Successfully updated logoBase64 in thermalPrinter.js');
        console.log('New logo size:', logoBase64.length);
    } else {
        console.error('Could not find "const logoBase64 = \'...\';" pattern in target file.');
        // Debug: print a snippet of where it might be
        const idx = fileContent.indexOf('const logoBase64');
        if (idx !== -1) {
            console.log('Found "const logoBase64" at index', idx);
            console.log('Context:', fileContent.substring(idx, idx + 50));
        }
    }

} catch (err) {
    console.error('Error updating logo:', err);
}
