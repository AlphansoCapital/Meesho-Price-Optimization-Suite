import React, { useState, useRef, useEffect } from 'react';
import { generateVariant, loadImage, downloadImage } from '../services/imageService';
import { analyzeProductImage, generateProductBackground } from '../services/visionService';
import { ImageVariant } from '../types';

interface SynthesizerModuleProps {
  onVariantsGenerated: (variants: ImageVariant[], autoNavigate: boolean) => void;
  existingVariants: ImageVariant[];
  onClearHistory: () => Promise<boolean>;
}

const BG_PRESETS = [
  { id: 'studio', name: 'Studio White', icon: '⚪' },
  { id: 'marble', name: 'Luxury Marble', icon: '🏛️' },
  { id: 'wood', name: 'Natural Wood', icon: '🪵' },
  { id: 'outdoor', name: 'Garden / Outdoor', icon: '🌿' },
  { id: 'urban', name: 'Urban Lifestyle', icon: '🏙️' },
  { id: 'pastel', name: 'Minimal Pastel', icon: '🎨' },
];

const SynthesizerModule: React.FC<SynthesizerModuleProps> = ({ onVariantsGenerated, existingVariants, onClearHistory }) => {
  const [baseImage, setBaseImage] = useState<string | null>(null);
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [generatedMasters, setGeneratedMasters] = useState<string[]>([]);
  
  const [productName, setProductName] = useState('');
  const [variantCount, setVariantCount] = useState(10);
  const [batchNumber, setBatchNumber] = useState(`B-${Math.floor(1000 + Math.random() * 9000)}`);
  const [showDate, setShowDate] = useState(true);
  const [textureIntensity, setTextureIntensity] = useState(0.08);
  const [opacity, setOpacity] = useState(0.04); 
  const [marketCloaking, setMarketCloaking] = useState(true);
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [isGeneratingBG, setIsGeneratingBG] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoNavigate, setAutoNavigate] = useState(false); 
  const [clearAfterDownload, setClearAfterDownload] = useState(false);
  
  const [tags, setTags] = useState<string[]>([]);
  const [isTagging, setIsTagging] = useState(false);
  
  const [exportFormat, setExportFormat] = useState<'image/jpeg' | 'image/png'>('image/jpeg');
  const [upscaleFactor, setUpscaleFactor] = useState<number>(1);
  
  const [lastBatch, setLastBatch] = useState<ImageVariant[]>([]);
  const [exportProgress, setExportProgress] = useState(0);
  const [isBatchDownloading, setIsBatchDownloading] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setLastBatch(existingVariants);
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
      // For cloaking, we request slightly different lighting/angles in the prompt
      const enhancedTheme = marketCloaking ? `${theme} with asymmetrical commercial lighting and unique depth of field` : theme;
      const newBg = await generateProductBackground(originalImage, enhancedTheme);
      if (newBg) {
        setGeneratedMasters(prev => [newBg, ...prev]);
        setBaseImage(newBg);
      }
    } catch (err) {
      alert("Background generation failure.");
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
        const variant = await generateVariant(img, productName, `cloaked-${Date.now()}-${i}`, {
          batchNumber,
          showDate,
          textureIntensity,
          opacity, 
          exportFormat,
          upscaleFactor,
          tags,
          marketCloaking
        });
        newVariants.push(variant);
        setProgress(((i + 1) / variantCount) * 100);
        await new Promise(r => setTimeout(r, 10));
      }
      onVariantsGenerated(newVariants, autoNavigate);
    } catch (error) {
      console.error('Generation failed', error);
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
        await downloadImage(v.dataUrl, `cloaked-asset-${shortId}.${ext}`);
        await new Promise(r => setTimeout(r, 600)); 
      }
      if (clearAfterDownload) {
        setLastBatch([]);
        await onClearHistory();
      }
    } finally {
      setIsBatchDownloading(false);
      setExportProgress(0);
    }
  };

  const handleClear = async () => {
    if (confirm("Reset current workspace?")) {
      setLastBatch([]);
      setBaseImage(null);
      setOriginalImage(null);
      setGeneratedMasters([]);
      setProductName('');
      await onClearHistory();
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-xl border border-gray-100 p-8">
        <div className="flex justify-between items-start mb-8">
          <div>
            <h2 className="text-3xl font-black text-gray-900 tracking-tight flex items-center">
              <span className="mr-3">🎨</span> Synthesizer Core
              {marketCloaking && (
                <span className="ml-4 px-3 py-1 bg-green-500 text-white text-[10px] font-black uppercase rounded-full animate-pulse shadow-lg shadow-green-200">
                  Market Cloaking Active
                </span>
              )}
            </h2>
            <p className="text-gray-400 text-xs font-bold uppercase mt-2 tracking-widest">Adversarial Asset Generation Engine</p>
          </div>
          <div className="flex items-center space-x-2 bg-gray-50 p-2 rounded-2xl border">
             <div className="flex items-center space-x-2 mr-4">
                <span className="text-[10px] font-black text-gray-500 uppercase">Anti-Detection</span>
                <button 
                  onClick={() => setMarketCloaking(!marketCloaking)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${marketCloaking ? 'bg-green-500' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${marketCloaking ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
             </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-8">
            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Base Asset (Raw Product)</label>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 rounded-3xl aspect-[4/3] flex flex-col items-center justify-center cursor-pointer hover:border-pink-500 hover:bg-pink-50 transition-all overflow-hidden relative group"
              >
                {baseImage ? (
                  <img src={baseImage} className="w-full h-full object-contain" alt="Base" />
                ) : (
                  <div className="text-center">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
                      <span className="text-3xl">📥</span>
                    </div>
                    <p className="text-sm font-black text-gray-400 uppercase">Upload Original Product</p>
                  </div>
                )}
                <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
              </div>
            </div>

            <div className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-3xl border border-gray-200">
               <h3 className="text-xs font-black text-gray-800 uppercase mb-4 flex justify-between">
                 <span>AI Background Env</span>
                 {isGeneratingBG && <span className="animate-spin text-lg">⏳</span>}
               </h3>
               <div className="grid grid-cols-3 gap-3 mb-6">
                  {BG_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      onClick={() => handleGenerateBackground(preset.name)}
                      disabled={!originalImage || isGeneratingBG}
                      className="flex flex-col items-center p-3 bg-white rounded-2xl border shadow-sm hover:border-pink-500 hover:shadow-md transition-all active:scale-95 disabled:opacity-50"
                    >
                      <span className="text-xl">{preset.icon}</span>
                      <span className="text-[9px] font-black text-gray-600 mt-2 uppercase">{preset.name}</span>
                    </button>
                  ))}
               </div>
               <div className="space-y-2">
                 <p className="text-[9px] font-black text-gray-400 uppercase">Custom Prompt Override</p>
                 <div className="flex space-x-2">
                    <input 
                      type="text" 
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="e.g. Modern kitchen with soft bokeh"
                      className="flex-1 px-4 py-3 text-xs rounded-xl border-none shadow-inner bg-white focus:ring-2 focus:ring-pink-300 transition-all"
                    />
                    <button 
                      onClick={() => handleGenerateBackground(customPrompt)}
                      disabled={!customPrompt || isGeneratingBG}
                      className="px-5 py-3 bg-gray-900 text-white rounded-xl text-[10px] font-black uppercase hover:bg-black transition-all disabled:opacity-50"
                    >Apply</button>
                 </div>
               </div>
            </div>
            
            <div className="space-y-5">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Title (SEO)</label>
                  <input type="text" value={productName} onChange={(e) => setProductName(e.target.value)} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 focus:border-pink-500 outline-none font-bold" />
                </div>
                <div className="space-y-2">
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Variant Count</label>
                  <input type="number" value={variantCount} onChange={(e) => setVariantCount(Number(e.target.value))} className="w-full px-5 py-4 rounded-2xl border-2 border-gray-100 outline-none font-bold" />
                </div>
              </div>
              
              <button
                onClick={handleGenerate}
                disabled={isGenerating || !baseImage || !productName}
                className={`w-full py-5 rounded-3xl font-black text-white shadow-2xl transition-all active:scale-[0.97] text-lg uppercase tracking-tighter ${
                  isGenerating || !baseImage || !productName ? 'bg-gray-300' : 'bg-meesho-gradient hover:brightness-110'
                }`}
              >
                {isGenerating ? `Cracking Algorithms... ${Math.round(progress)}%` : `Generate Adversarial Batch`}
              </button>
            </div>
          </div>

          <div className="flex flex-col h-full bg-gray-50 rounded-3xl p-8 border border-gray-200">
             <div className="flex justify-between items-center mb-6">
                <h3 className="text-sm font-black text-gray-800 uppercase">Cloaked Results Buffer</h3>
                <span className="bg-pink-500 text-white text-[10px] px-3 py-1 rounded-full font-black">{lastBatch.length} VARS</span>
             </div>

             <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {lastBatch.length > 0 ? (
                  <div className="grid grid-cols-2 gap-4">
                    {lastBatch.map((v) => (
                      <div key={v.id} className="bg-white p-2 rounded-2xl border shadow-sm group relative overflow-hidden">
                        <img src={v.dataUrl} className="w-full aspect-square object-cover rounded-xl" alt="V" />
                        <div className="absolute inset-2 bg-black/80 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-4">
                           <button onClick={() => downloadImage(v.dataUrl, `v-${v.id.slice(-4)}.jpg`)} className="bg-white text-black px-4 py-2 rounded-xl text-[10px] font-black uppercase w-full">Download Single</button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30">
                    <span className="text-6xl">🎭</span>
                    <p className="font-black uppercase text-xs mt-4">Buffer Empty</p>
                  </div>
                )}
             </div>

             {lastBatch.length > 0 && (
               <div className="mt-8 p-6 bg-white rounded-3xl border shadow-xl space-y-4">
                  <button 
                    onClick={downloadBatchSequentially}
                    disabled={isBatchDownloading}
                    className="w-full py-4 bg-gray-900 text-white rounded-2xl text-xs font-black uppercase shadow-lg hover:bg-black transition-all"
                  >
                    {isBatchDownloading ? `Exporting... ${Math.round(exportProgress)}%` : 'Bulk Export Cloaked Batch'}
                  </button>
                  <div className="flex items-center space-x-3 p-4 bg-red-50 rounded-2xl border border-red-100">
                     <input type="checkbox" checked={clearAfterDownload} onChange={(e) => setClearAfterDownload(e.target.checked)} className="w-4 h-4 accent-red-600" />
                     <label className="text-[10px] font-black text-red-700 uppercase tracking-tighter">Destroy History after download</label>
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