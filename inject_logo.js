const fs = require('fs');
const path = require('path');

const targetFile = path.join('src', 'utils', 'thermalPrinter.js');
const logoFile = 'logo_base64.txt';

try {
    let fileContent = fs.readFileSync(targetFile, 'utf8');
    let logoBase64 = fs.readFileSync(logoFile, 'utf8').trim();

    const toReplace = `    // Logo - Using large text to ensure it shows up clearly
    // \\x1b! is Select Print Mode. \\x38 = Double Width (0x20) + Double Height (0x10) + Emphasized (0x08)
    await BLEPrinter.printText('\\x1b!\\x38SARTE SALON\\x1b!\\x00\\n', {});
    await BLEPrinter.printText('\\n', {});`;

    const replacement = `    // Logo - Image from assets
    const logoBase64 = '${logoBase64}';

    try {
      await BLEPrinter.printImageBase64(logoBase64, { width: 200, height: 200 });
      await BLEPrinter.printText('\\n', {});
    } catch (logoErr) {
      console.log('[ThermalPrinter] Image print failed, using text fallback');
      await BLEPrinter.printText('\\x1b!\\x38SARTE SALON\\x1b!\\x00\\n', {});
    }`;

    // Check if replacement string is found (be careful with string matching due to whitespace)
    // I will use a more robust replacement by reading the file line by line or using a simpler marker if possible.
    // Actually, replacing via exact string match is risky with whitespace. 
    // Let's verify the content of the file locally first.

    if (fileContent.includes('// Logo - Using large text')) {
        // We can use a regex to replace the block
        const regex = /\/\/ Logo - Using large text[\s\S]*?BLEPrinter\.printText\('\\n', \{\}\);/;
        const newContent = fileContent.replace(regex, replacement);
        fs.writeFileSync(targetFile, newContent, 'utf8');
        console.log('Successfully injected logo base64!');
    } else {
        console.error('Target code block not found in ' + targetFile);
        // Fallback: Dump the file content for debugging
        // console.log(fileContent);
    }

} catch (err) {
    console.error('Error during injection:', err);
}
