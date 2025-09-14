export async function getImageDimensions(file: File): Promise<{ width: number; height: number }>
{
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => reject(new Error("Failed to load image"));
      img.src = url;
    });
    return dims;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function bytesToReadable(size: number): string {
  const units = ["B", "KB", "MB", "GB"]; // we won't go beyond
  let idx = 0;
  let s = size;
  while (s > 1024 && idx < units.length - 1) {
    s /= 1024;
    idx += 1;
  }
  return `${s.toFixed(1)} ${units[idx]}`;
}
