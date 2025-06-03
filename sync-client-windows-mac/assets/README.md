# Assets Directory

This directory should contain the icon files for the Sync Client application.

## Required Icon Files

### Tray Icons
- **`tray-icon.ico`** - Windows tray icon (16x16 pixels, ICO format)
- **`tray-icon.png`** - macOS/Linux tray icon (16x16 or 32x32 pixels, PNG format)

### Window Icon
- **`icon.png`** - Main application window icon (256x256 pixels recommended, PNG format)

## How to Create Icons

### Option 1: Use Online Icon Converters
1. Create or find a PNG image (preferably square, 256x256 or larger)
2. For Windows ICO file:
   - Go to https://convertio.co/png-ico/ or similar
   - Upload your PNG and convert to ICO format
   - Download as `tray-icon.ico`
3. For PNG tray icon:
   - Resize your image to 16x16 or 32x32 pixels
   - Save as `tray-icon.png`

### Option 2: Use ImageMagick (if installed)
```bash
# Convert PNG to ICO for Windows
magick icon.png -resize 16x16 tray-icon.ico

# Resize for PNG tray icon
magick icon.png -resize 16x16 tray-icon.png
```

### Option 3: Use GIMP (Free)
1. Open GIMP
2. Create new 16x16 image
3. Design your icon
4. Export as PNG or ICO

## Fallback Behavior

If icon files are missing, the application will:
1. Try multiple file paths (dev and production)
2. Use a programmatically generated white circle icon as fallback
3. Log the attempted paths to help with debugging

The application will still work without custom icons, but adding proper icons will improve the user experience. 