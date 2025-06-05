import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Proper HSL to RGB conversion with better precision
function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360; // Normalize hue to 0-360
    s = Math.max(0, Math.min(100, s)) / 100; // Clamp and normalize saturation
    l = Math.max(0, Math.min(100, l)) / 100; // Clamp and normalize lightness

    const c = (1 - Math.abs(2 * l - 1)) * s; // Chroma
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r, g, b;

    if (h >= 0 && h < 60) {
        [r, g, b] = [c, x, 0];
    } else if (h >= 60 && h < 120) {
        [r, g, b] = [x, c, 0];
    } else if (h >= 120 && h < 180) {
        [r, g, b] = [0, c, x];
    } else if (h >= 180 && h < 240) {
        [r, g, b] = [0, x, c];
    } else if (h >= 240 && h < 300) {
        [r, g, b] = [x, 0, c];
    } else {
        [r, g, b] = [c, 0, x];
    }

    return [
        Math.round((r + m) * 255),
        Math.round((g + m) * 255),
        Math.round((b + m) * 255)
    ];
}

function rgbToHex(r, g, b) {
    const toHex = (val) => {
        const hex = Math.max(0, Math.min(255, val)).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
    };
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function hslToHex(h, s, l) {
    const [r, g, b] = hslToRgb(h, s, l);
    return rgbToHex(r, g, b);
}

function convertCssColors(input) {
    // Match HSL values in CSS custom properties
    return input.replace(/--[\w-]+:\s*(\d+(?:\.\d+)?)\s+(\d+(?:\.\d+)?)%\s+(\d+(?:\.\d+)?)%/g, (match, h, s, l) => {
        const hex = hslToHex(
            parseFloat(h),
            parseFloat(s),
            parseFloat(l)
        );
        const propertyName = match.split(':')[0];
        return `${propertyName}: ${hex}`;
    });
}

// Read the CSS file
const cssPath = path.join(__dirname, 'src', 'index.css');

if (!fs.existsSync(cssPath)) {
    console.error(`CSS file not found: ${cssPath}`);
    process.exit(1);
}

const css = fs.readFileSync(cssPath, 'utf8');
console.log('Original CSS preview (first 500 chars):');
console.log(css.substring(0, 500) + '...\n');

// Convert colors
const convertedCss = convertCssColors(css);

// Check if any conversions were made
if (css === convertedCss) {
    console.log('No HSL color values found to convert.');
} else {
    console.log('Color conversion completed!');
}

// Output to a new file
const outputPath = path.join(__dirname, 'src', 'index.css');
fs.writeFileSync(outputPath, convertedCss);

console.log(`\nOutput written to: ${outputPath}`);
console.log('\nConverted CSS preview (first 500 chars):');
console.log(convertedCss.substring(0, 500) + '...'); 