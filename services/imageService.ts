import { OverlayConfig, ImageVariant } from '../types';
import { FONTS, COLORS } from '../constants';

// --- Persistent Storage (IndexedDB) Setup ---
const DB_NAME = 'MeeshoSuiteDB';
const STORE_NAME = 'ImageVariants';

const getDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveVariantToDB = async (variant: ImageVariant) => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.put(variant);
    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

export const getAllVariantsFromDB = async (): Promise<ImageVariant[]> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => {
      db.close();
      resolve(request.result || []);
    };
    request.onerror = () => {
      db.close();
      reject(request.error);
    };
  });
};

export const clearAllVariantsFromDB = async () => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    transaction.oncomplete = () => {
      db.close();
      resolve(true);
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error);
    };
  });
};

// --- Adversarial Image Generation (Anti-Duplicate Engine) ---

export const generateVariant = async (
  baseImage: HTMLImageElement,
  productName: string,
  id: string,
  options: { 
    batchNumber?: string; 
    showDate?: boolean; 
    textureIntensity?: number;
    exportFormat?: 'image/jpeg' | 'image/png';
    upscaleFactor?: number;
    opacity?: number;
    tags?: string[];
    marketCloaking?: boolean; // New toggle for aggressive variation
  } = {}
): Promise<ImageVariant> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  if (!ctx) throw new Error('Could not get canvas context');

  const scale = options.upscaleFactor || 1;
  canvas.width = baseImage.width * scale;
  canvas.height = baseImage.height * scale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // --- Step 1: Geometric Jitter (Anti-Hash) ---
  ctx.save();
  if (options.marketCloaking) {
    // Random zoom between 100% and 103%
    const zoom = 1 + (Math.random() * 0.03);
    // Random micro-offset (translation)
    const offsetX = (Math.random() - 0.5) * (canvas.width * 0.02);
    const offsetY = (Math.random() - 0.5) * (canvas.height * 0.02);
    // Micro-rotation (0.1 to 0.3 degrees)
    const microRotation = (Math.random() - 0.5) * 0.005;

    ctx.translate(canvas.width / 2 + offsetX, canvas.height / 2 + offsetY);
    ctx.rotate(microRotation);
    ctx.scale(zoom, zoom);
    ctx.drawImage(baseImage, -canvas.width / 2, -canvas.height / 2, canvas.width, canvas.height);
  } else {
    ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);
  }
  ctx.restore();

  // --- Step 2: Chromatic Shifting (Anti-Histogram) ---
  if (options.marketCloaking) {
    // Subtle hue rotate and brightness shift
    const hue = (Math.random() - 0.5) * 4; // +/- 2 degrees
    const brightness = 1 + (Math.random() - 0.5) * 0.04; // +/- 2%
    const contrast = 1 + (Math.random() - 0.5) * 0.04; // +/- 2%
    ctx.filter = `hue-rotate(${hue}deg) brightness(${brightness}) contrast(${contrast})`;
    // Re-draw a portion or apply global filter effect
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    tempCanvas.getContext('2d')?.drawImage(canvas, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(tempCanvas, 0, 0);
    ctx.filter = 'none';
  }

  // --- Step 3: Noise & Textural Interference ---
  const noiseLevel = options.textureIntensity || 0.05;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    // Per-pixel micro-jittering
    const noise = (Math.random() - 0.5) * (noiseLevel * 15); 
    data[i] = Math.min(255, Math.max(0, data[i] + noise));
    data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
    data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    // Alpha channel variation (binary fingerprinting)
    if (i % 100 === 0) data[i+3] = 254 + Math.round(Math.random()); 
  }
  ctx.putImageData(imageData, 0, 0);

  // --- Step 4: Overlay Generation ---
  const config: OverlayConfig = {
    text: productName,
    fontFamily: FONTS[Math.floor(Math.random() * FONTS.length)],
    fontSize: (Math.random() * 0.4 + 0.4) * scale * 30, // Responsive size
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: (Math.random() * (baseImage.width * 0.8) + (baseImage.width * 0.1)) * scale,
    y: (Math.random() * (baseImage.height * 0.8) + (baseImage.height * 0.1)) * scale,
    rotation: Math.random() * Math.PI * 2,
    batchNumber: options.batchNumber,
    showDate: options.showDate,
    textureIntensity: options.textureIntensity,
    exportFormat: options.exportFormat || 'image/jpeg',
    upscaleFactor: scale,
    opacity: options.opacity ?? 0.03,
  };

  ctx.save();
  ctx.translate(config.x, config.y);
  ctx.rotate(config.rotation);
  ctx.font = `bold ${config.fontSize}px ${config.fontFamily}`;
  ctx.fillStyle = config.color;
  ctx.globalAlpha = config.opacity ?? 0.03; 
  ctx.textAlign = 'center';
  ctx.fillText(config.text, 0, 0);
  ctx.restore();

  // --- Step 5: Export with Unique Quantization ---
  const format = options.exportFormat || 'image/jpeg';
  // Vary quality slightly for every single image to change binary hash
  const quality = 0.88 + (Math.random() * 0.05); 
  const dataUrl = canvas.toDataURL(format, quality);
  
  const variant: ImageVariant = {
    id,
    dataUrl: dataUrl,
    blobUrl: dataUrl,
    config,
    status: 'pending',
    timestamp: Date.now(),
    tags: options.tags
  };

  await saveVariantToDB(variant);
  return variant;
};

export const loadImage = (url: string): Promise<HTMLImageElement> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
};

export const downloadImage = async (dataUrl: string, filename: string) => {
  if (!dataUrl) return;
  try {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Standard download failed', err);
  }
};

export const exportToCSV = (variants: ImageVariant[]) => {
  const headers = [
    'Amazon Link Ref', 'Flipkart Link Ref', 'Meesho Link Ref', 'Local Filename', 'Product Title', 'Batch Code', 'Optimized Price', 'Shipping Fee', 'Keywords', 'Variant UUID'
  ];

  const rows = variants.map(v => {
    const shortId = v.id.split('-').pop();
    const ext = v.config.exportFormat === 'image/png' ? 'png' : 'jpg';
    const filename = `cloaked_opt_${shortId}.${ext}`;
    return [
      `cdn://${filename}`, `cdn://${filename}`, `cdn://${filename}`, filename, v.config.text, v.config.batchNumber || 'N/A', v.detectedPrice || 'N/A', v.detectedShipping !== undefined ? v.detectedShipping : 'N/A', v.tags ? v.tags.join('; ') : '', v.id
    ];
  });

  const csvContent = [headers.join(','), ...rows.map(row => row.map(cell => `"${cell}"`).join(','))].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `listing_batch_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};