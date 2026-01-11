import React, { useState, useRef, useEffect } from 'react';
import { generateVariant, loadImage, downloadImage, clearAllVariantsFromDB } from '../services/imageService';
import { analyzeProductImage, generateProductBackground } from '../services/visionService';
import { ImageVariant } from '../types';

interface SynthesizerModuleProps {
  onVariantsGenerated: (variants: ImageVariant[], autoNavigate: boolean) => void;
  existingVariants: ImageVariant[];
}

const BG_PRESETS = [
  { id: 'studio', name: 'Studio White', icon: '⚪' },
  { id: 'marble', name: 'Luxury Marble', icon: '🏛️' },
  { id: 'wood', name: 'Natural Wood', icon: '🪵' },
  { id: 'outdoor', name: 'Garden / Outdoor', icon: '🌿' },
  { id: 'urban', name: 'Urban Lifestyle', icon: '🏙️' },
  { id: 'pastel', name: 'Minimal Pastel', icon: '🎨' },
];

const SynthesizerModule: React.FC<SynthesizerModuleProps> = ({ onVariantsGenerated, existingVariants }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedMasters, setGeneratedMasters] = useState<string[]>([]);
  
  const [productName, setProductName] = useState('');
  const [variantCount, setVariantCount] = useState(10);
  const [batchNumber, setBatchNumber] = useState(`B-${Math.floor(1000 + Math.random() * 9000)}`);
  const [showDate, setShowDate] = useState(true);
  const [textureIntensity, setTextureIntensity] = useState(0.05);
  const [opacity, setOpacity] = useState(0.03); 
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBG, setIsGeneratingBG] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoNavigate, setAutoNavigate] = useState(false); 
  
  const [tags, setTags] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [upscaleFactor, setUpscaleFactor] = useState<number>(1);
  
  const [lastBatch, setLastBatch] = useState<ImageVariant[]>([]);
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [exportProgress, setExportProgress] = useState(0);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (existingVariants.length > 0 && lastBatch.length === 0) {
      setLastBatch(existingVariants);
    }
  }, [existingVariants]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const dataUrl = event.target?.result as string;
        setBaseImage(dataUrl);
        setOriginalImage(dataUrl);
        setGeneratedMasters([]);
        triggerAITagging(dataUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerAITagging = async (image: string) => {
    setIsTagging(true);
    try {
      const suggestedTags = await analyzeProductImage(image);
      setTags(suggestedTags);
      if (suggestedTags.length > 0 && !productName) {
        setProductName(suggestedTags[0]);
      }
    } catch (err) {
      console.error('Tagging error', err);
    } finally {
      setIsTagging(false);
    }
  };

  const handleGenerateBackground = async (theme: string) => {
    if (!originalImage) return;
    setIsGeneratingBG(true);
    try {
      const newBg = await generateProductBackground(originalImage, theme);
      if (newBg) {
        setGeneratedMasters(prev => [newBg, ...prev]);
        setBaseImage(newBg);
      }
    } catch (err) {
      alert("Failed to generate background. Check your API key or connection.");
    } finally {
      setIsGeneratingBG(false);
    }
  };

  const handleGenerate = async () => {
    if (!baseImage || !productName) return;
    
    setIsGenerating(true);
    setProgress(0);
    
    const newVariants: ImageVariant[] = [];
    
    try {
      const img = await loadImage(baseImage);
      
      for (let i = 0; i < variantCount; i++) {
        const variant = await generateVariant(img, productName, `v-${Date.now()}-${i}`, {
          batchNumber,
          showDate,
          textureIntensity,
          opacity, 
          exportFormat,
          upscaleFactor,
          tags 
        });
        newVariants.push(variant);
        setLastBatch(prev => [variant, ...prev]);
        setProgress(((i + 1) / variantCount) * 100);
        await new Promise(r => setTimeout(r, 10));
      }
      onVariantsGenerated(newVariants, autoNavigate);
    } catch (error) {
      console.error('Generation failed', error);
      alert('Synthesis failed.');
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadBatchSequentially = async () => {
    if (lastBatch.length === 0 || isBatchDownloading) return;
    
    setIsBatchDownloading(true);
    try {
      for (let i = 0; i < lastBatch.length; i++) {
        const v = lastBatch[i];
        const shortId = v.id.split('-').pop();
        const ext = v.config.exportFormat === 'image/png' ? 'png' : 'jpg';
        setExportProgress(((i + 1) / lastBatch.length) * 100);
        await downloadImage(v.dataUrl, `meesho-variant-${shortId}.${ext}`);
        await new Promise(r => setTimeout(r, 800)); 
      }
      alert(`Download sequence triggered for ${lastBatch.length} assets.`);
    } catch (err) {
      console.error('Batch download failed', err);
    } finally {
      setIsBatchDownloading(false);
      setExportProgress(0);
    }
  };

  const handleClear = async () => {
    if (confirm("Clear all variants from memory and database?")) {
      await clearAllVariantsFromDB();
      setLastBatch([]);
      location.reload(); 
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center">
          <span className="mr-2">🎨</span> Image Synthesizer
          <span className="ml-3 text-xs font-normal text-gray-400 uppercase tracking-widest text-pink-500">AI Enabled Engine</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider">Base Asset Source</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-2xl aspect-video flex flex-col items-center justify-center cursor-pointer hover:border-pink-300 hover:bg-pink-50 transition-all overflow-hidden relative group"
              >
                {baseImage ? (
                  <>
                    <img src={baseImage} className="w-full h-full object-contain" alt="Base" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                      <span className="text-white font-bold">Swap Base Asset</span>
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6">
                    <span className="text-4xl mb-2 block">📸</span>
                    <p className="text-sm font-bold text-gray-500">Click to upload product</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </div>

            {/* AI Background Lab */}
            <div className="p-4 bg-pink-50/50 rounded-2xl border border-pink-100">
               <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-pink-700 uppercase tracking-tight">AI Background Laboratory</h3>
                  {isGeneratingBG && <div className="w-4 h-4 border-2 border-pink-600 border-t-transparent rounded-full animate-spin"></div>}
               </div>
               
               <div className="grid grid-cols-3 gap-2 mb-4">
                  {BG_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleGenerateBackground(preset.name)}
                      disabled={!originalImage || isGeneratingBG}
                      className="flex flex-col items-center p-2 bg-white rounded-xl border border-pink-100 hover:bg-pink-100 transition-colors disabled:opacity-50"
                    >
                      <span className="text-lg">{preset.icon}</span>
                      <span className="text-[10px] font-bold text-gray-600 mt-1 whitespace-nowrap">{preset.name}</span>
                    </button>
                  ))}
               </div>

               {generatedMasters.length > 0 && (
                 <div className="space-y-2">
                    <p className="text-[10px] font-bold text-gray-400 uppercase">Generated Master Variations</p>
                    <div className="flex space-x-2 overflow-x-auto pb-2 custom-scrollbar">
                      <div 
                        onClick={() => setBaseImage(originalImage)}
                        className={`min-w-[60px] h-[60px] rounded-lg border-2 cursor-pointer overflow-hidden ${baseImage === originalImage ? 'border-pink-500' : 'border-white'}`}
                      >
                        <img src={originalImage!} className="w-full h-full object-cover grayscale opacity-60" alt="Orig" />
                      </div>
                      {generatedMasters.map((master, idx) => (
                        <div 
                          key={idx}
                          onClick={() => setBaseImage(master)}
                          className={`min-w-[60px] h-[60px] rounded-lg border-2 cursor-pointer overflow-hidden transition-all ${baseImage === master ? 'border-pink-500' : 'border-white'}`}
                        >
                          <img src={master} className="w-full h-full object-cover" alt={`Master ${idx}`} />
                        </div>
                      ))}
                    </div>
                 </div>
               )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Product Name Overlay</label>
                <input 
                  type="text" 
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g. Designer Saree"
                  className="w-full px-4 py-3 rounded-xl border focus:ring-2 focus:ring-pink-200 outline-none transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Variant Count</label>
                  <input type="number" value={variantCount} onChange={(e) => setVariantCount(Math.max(1, parseInt(e.target.value) || 1))} className="w-full px-4 py-3 rounded-xl border outline-none" min="1" max="100" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Export Format</label>
                  <select 
                    value={exportFormat} 
                    onChange={(e) => setExportFormat(e.target.value as any)} 
                    className="w-full px-4 py-3 rounded-xl border outline-none bg-white cursor-pointer"
                  >
                    <option value="image/jpeg">JPEG (Fast / Meesho)</option>
                    <option value="image/png">PNG (High Quality)</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                <input 
                  type="checkbox" 
                  id="autoNav" 
                  checked={autoNavigate} 
                  onChange={(e) => setAutoNavigate(e.target.checked)}
                  className="w-4 h-4 accent-pink-500"
                />
                <label htmlFor="autoNav" className="text-xs font-bold text-gray-600 cursor-pointer">
                  Auto-move to Validator after generation
                </label>
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating || !baseImage || !productName}
              className={`w-full py-4 rounded-2xl font-bold text-white shadow-lg transition-all active:scale-[0.98] ${
                isGenerating || !baseImage || !productName ? 'bg-gray-300' : 'bg-meesho-gradient hover:opacity-90'
              }`}
            >
              {isGenerating ? `Synthesizing ${Math.round(progress)}%` : `Generate ${variantCount} Asset Variations`}
            </button>
          </div>

          <div className="bg-gray-50 rounded-2xl p-6 border border-gray-100 flex flex-col h-full overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-700">Results Buffer ({lastBatch.length})</h3>
              {lastBatch.length > 0 && <button onClick={handleClear} className="text-[10px] font-bold text-red-500 uppercase hover:underline">Clear History</button>}
            </div>
            
            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
              <div className="grid grid-cols-3 gap-3">
                {lastBatch.map((v) => (
                  <div key={v.id} className="group relative aspect-square rounded-lg overflow-hidden border bg-white shadow-sm transition-transform hover:scale-[1.02]">
                    <img src={v.dataUrl} className="w-full h-full object-cover" alt="V" />
                    <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity text-center p-1 space-y-1">
                       <button 
                        onClick={() => downloadImage(v.dataUrl, `variant-${v.id.split('-').pop()}.jpg`)}
                        className="text-white text-[10px] font-bold hover:underline bg-white/20 w-full py-1 rounded-md"
                      >
                        Download
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {lastBatch.length > 0 && (
              <div className="mt-6 p-4 bg-white rounded-xl border border-gray-200 shadow-sm space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase">Batch Operations</p>
                <div className="flex flex-col space-y-2">
                  <button 
                    onClick={downloadBatchSequentially} 
                    disabled={isBatchDownloading}
                    className={`w-full py-2.5 text-white rounded-lg text-xs font-bold shadow-md transition-all ${
                      isBatchDownloading ? 'bg-gray-400' : 'bg-meesho-gradient hover:opacity-90'
                    }`}
                  >
                    {isBatchDownloading ? `Downloading... ${Math.round(exportProgress)}%` : 'Download Batch (Sequential)'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SynthesizerModule;
