/**
 * Extracts the dominant vibrant color from an image URL.
 * Filters out grays, blacks, and whites to find a color that "pops".
 * 
 * @param {string} imageSrc - The URL of the image
 * @returns {Promise<string>} - A Promise that resolves to an RGB string "rgb(r, g, b)"
 */
export const extractDominantColor = (imageSrc) => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.src = imageSrc;

        img.onload = () => {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Resize for faster processing (max 100x100)
            const maxDimension = 100;
            const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
            canvas.width = img.width * scale;
            canvas.height = img.height * scale;
            
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            
            try {
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                const colorCounts = {};
                let maxCount = 0;
                let dominantColor = null;

                // Sample every 4th pixel (step by 4 data points * interval)
                // data contains [r, g, b, a, r, g, b, a, ...]
                const step = 4 * 5; // Check every 5th pixel
                
                for (let i = 0; i < data.length; i += step) {
                    const r = data[i];
                    const g = data[i + 1];
                    const b = data[i + 2];
                    const a = data[i + 3];

                    // Skip transparent pixels
                    if (a < 128) continue;

                    // Filter out greys/blacks/whites
                    if (isGrayscaleOrExtreme(r, g, b)) continue;

                    // Quantize colors (round to nearest 10 to group similar colors)
                    const rQ = Math.round(r / 20) * 20;
                    const gQ = Math.round(g / 20) * 20;
                    const bQ = Math.round(b / 20) * 20;
                    
                    const key = `${rQ},${gQ},${bQ}`;
                    colorCounts[key] = (colorCounts[key] || 0) + 1;

                    if (colorCounts[key] > maxCount) {
                        maxCount = colorCounts[key];
                        dominantColor = `rgb(${rQ}, ${gQ}, ${bQ})`;
                    }
                }

                resolve(dominantColor || 'rgb(20, 20, 40)'); // Fallback to dark blue if no color found
            } catch (e) {
                console.error("Error analyzing image data", e);
                resolve('rgb(20, 20, 40)'); // Fallback
            }
        };

        img.onerror = () => {
            console.error("Failed to load image for color extraction");
            resolve('rgb(20, 20, 40)');
        };
    });
};

// Helper: Check if color is grayscale, too dark, or too bright
function isGrayscaleOrExtreme(r, g, b) {
    // Convert RGB to HSL-like metrics
    
    // Lightness check
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const l = (max + min) / 2;

    if (l < 40) return true; // Too dark (black-ish)
    if (l > 220) return true; // Too bright (white-ish)

    // Saturation check (difference between max and min channel)
    const d = max - min;
    // If difference is small, it's grayish
    if (d < 30) return true; 

    return false;
}
