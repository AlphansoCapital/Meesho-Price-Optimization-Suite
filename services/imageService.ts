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
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

export const getVariantFromDB = async (id: string): Promise<ImageVariant | null> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
};

export const getAllVariantsFromDB = async (): Promise<ImageVariant[]> => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const clearAllVariantsFromDB = async () => {
  const db = await getDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(STORE_NAME, 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    store.clear();
    transaction.oncomplete = () => resolve(true);
    transaction.onerror = () => reject(transaction.error);
  });
};

// --- Image Generation Logic ---

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
  } = {}
): Promise<ImageVariant> => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  if (!ctx) throw new Error('Could not get canvas context');

  const scale = options.upscaleFactor || 1;
  canvas.width = baseImage.width * scale;
  canvas.height = baseImage.height * scale;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(baseImage, 0, 0, canvas.width, canvas.height);

  if (options.textureIntensity && options.textureIntensity > 0) {
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const data = imageData.data;
    for (let i = 0; i < data.length; i += 4) {
      const noise = (Math.random() - 0.5) * (options.textureIntensity * 10); 
      data[i] = Math.min(255, Math.max(0, data[i] + noise));
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise));
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise));
    }
    ctx.putImageData(imageData, 0, 0);
  }

  const config: OverlayConfig = {
    text: productName,
    fontFamily: FONTS[Math.floor(Math.random() * FONTS.length)],
    fontSize: (Math.random() * 0.5 + 0.5) * scale, 
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    x: (Math.random() * (baseImage.width - 20) + 10) * scale,
    y: (Math.random() * (baseImage.height - 20) + 10) * scale,
    rotation: Math.random() * Math.PI * 2,
    batchNumber: options.batchNumber,
    showDate: options.showDate,
    textureIntensity: options.textureIntensity,
    exportFormat: options.exportFormat || 'image/jpeg',
    upscaleFactor: scale,
    opacity: options.opacity ?? 0.05,
  };

  ctx.save();
  ctx.translate(config.x, config.y);
  ctx.rotate(config.rotation);
  ctx.font = `${config.fontSize}px ${config.fontFamily}`;
  ctx.fillStyle = config.color;
  ctx.globalAlpha = config.opacity ?? 0.05; 
  ctx.textAlign = 'center';
  ctx.fillText(config.text, 0, 0);
  ctx.restore();

  const format = options.exportFormat || 'image/jpeg';
  const dataUrl = canvas.toDataURL(format, 0.9);
  
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
    // More reliable for sandbox: Direct anchor trigger with dataUrl
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (err) {
    console.error('Standard download failed, trying blob fallback', err);
    try {
      const response = await fetch(dataUrl);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (innerErr) {
       console.error('All download methods failed', innerErr);
    }
  }
};

export const exportToCSV = (variants: ImageVariant[]) => {
  const headers = [
    'Amazon Link Ref',
    'Flipkart Link Ref',
    'Meesho Link Ref',
    'Local Filename',
    'Product Title', 
    'Batch Code', 
    'Optimized Price', 
    'Shipping Fee', 
    'Keywords',
    'Variant UUID'
  ];

  const rows = variants.map(v => {
    const shortId = v.id.split('-').pop();
    const ext = v.config.exportFormat === 'image/png' ? 'png' : 'jpg';
    const filename = `img_opt_${shortId}.${ext}`;
    
    return [
      `cdn://${filename}`,
      `cdn://${filename}`,
      `cdn://${filename}`,
      filename,
      v.config.text,
      v.config.batchNumber || 'N/A',
      v.detectedPrice || 'N/A',
      v.detectedShipping !== undefined ? v.detectedShipping : 'N/A',
      v.tags ? v.tags.join('; ') : '',
      v.id
    ];
  });

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `meesho_listings_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
};