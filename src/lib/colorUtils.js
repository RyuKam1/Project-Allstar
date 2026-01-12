export const getDominantColor = (imgEl) => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  canvas.width = 1;
  canvas.height = 1;

  try {
    ctx.drawImage(imgEl, 0, 0, 1, 1);
    const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
    return `rgba(${r}, ${g}, ${b}, 0.3)`;
  } catch (e) {
    // Fallback for cross-origin or other errors
    return 'rgba(99, 102, 241, 0.3)';
  }
};
