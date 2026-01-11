import React, { useState, useEffect } from 'react';
import { ImageVariant, ValidationSummary } from '../types';
import { MOCK_PRICES, MOCK_SHIPPING } from '../constants';
import { exportToCSV } from '../services/imageService';

interface ValidatorModuleProps {
  variants: ImageVariant[];
  onValidationComplete: (variants: ImageVariant[]) => void;
}

const ERROR_TYPES = [
  "Incorrect Coordinate Mapping: [450, 320] invalid target",
  "UI Element Not Found: 'Upload' button obstructed",
  "Unexpected Page Load: Seller session expired",
  "Network Timeout: Algorithmic wait state exceeded",
  "OCR Failure: Price field unreadable"
];

const ValidatorModule: React.FC<ValidatorModuleProps> = ({ variants, onValidationComplete }) => {
  const [isRunning, setIsRunning] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(-1);
  const [logs, setLogs] = useState<string[]>([]);
  const [results, setResults] = useState<ImageVariant[]>([]);
  const [summary, setSummary] = useState<ValidationSummary | null>(null);

  useEffect(() => {
    setResults(variants);
  }, [variants]);

  const addLog = (msg: string, type: 'info' | 'error' = 'info') => {
    const prefix = type === 'error' ? ' [!] ERROR: ' : ' ';
    setLogs(prev => [`[${new Date().toLocaleTimeString()}]${prefix}${msg}`, ...prev].slice(0, 15));
  };

  const handleOpenImage = (dataUrl: string) => {
    // Large Base64 strings can fail in window.open(url)
    // We create a temporary object URL from a blob for better browser compatibility
    fetch(dataUrl)
      .then(res => res.blob())
      .then(blob => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank');
        // We don't revoke immediately so the user can see it
      });
  };

  const startSimulation = async () => {
    if (variants.length === 0) return;
    setIsRunning(true);
    setSummary(null);
    setLogs([]);
    addLog('Initializing Marketplace RPA Engine...');
    addLog('Syncing Local Asset Vault...');

    const updatedVariants = [...variants];
    const errors: Array<{ variantId: string; error: string }> = [];

    for (let i = 0; i < variants.length; i++) {
      setCurrentIndex(i);
      addLog(`Testing Cluster: ${variants[i].id.split('-').pop()}`);
      
      const isError = Math.random() < 0.05; 
      await new Promise(r => setTimeout(r, 600));

      if (isError) {
        const errorMsg = ERROR_TYPES[Math.floor(Math.random() * ERROR_TYPES.length)];
        updatedVariants[i] = { ...updatedVariants[i], status: 'failed', errorMessage: errorMsg };
        addLog(errorMsg, 'error');
        errors.push({ variantId: variants[i].id, error: errorMsg });
      } else {
        const price = MOCK_PRICES[Math.floor(Math.random() * MOCK_PRICES.length)];
        const shipping = MOCK_SHIPPING[Math.floor(Math.random() * MOCK_SHIPPING.length)];
        
        updatedVariants[i] = {
          ...updatedVariants[i],
          status: 'completed',
          detectedPrice: price,
          detectedShipping: shipping
        };
        addLog(`Stability Pass: ₹${price} / Ship ₹${shipping}`);
      }
      setResults([...updatedVariants]);
    }

    setSummary({ total: variants.length, success: variants.length - errors.length, failed: errors.length, errors });
    setIsRunning(false);
    setCurrentIndex(-1);
    addLog('Batch Ready for Amazon/Flipkart/Meesho Export.');
    onValidationComplete(updatedVariants);
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-sm border p-8">
        <div className="flex justify-between items-center mb-6">
          <div>
             <h2 className="text-2xl font-bold flex items-center">
              <span className="mr-2">🤖</span> Marketplace Bulk Validator
            </h2>
            <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Status: Persistent Asset Mode</p>
          </div>
          <div className="flex space-x-3">
             {results.length > 0 && (
                <button
                  onClick={() => exportToCSV(results)}
                  className="px-4 py-2 text-sm font-bold text-pink-600 bg-pink-50 border border-pink-100 rounded-xl hover:bg-pink-100 transition-colors flex items-center"
                >
                  <span className="mr-2">📄</span> Export Listings (CSV)
                </button>
             )}
             <button
                onClick={startSimulation}
                disabled={isRunning || variants.length === 0}
                className={`px-6 py-2 rounded-xl text-white font-bold shadow-md ${
                  isRunning || variants.length === 0 ? 'bg-gray-300' : 'bg-meesho-gradient hover:opacity-90'
                }`}
              >
                {isRunning ? 'Validating Batch...' : 'Analyze Market Pricing'}
              </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
             <div className="overflow-x-auto border rounded-xl bg-gray-50 max-h-[600px] overflow-y-auto custom-scrollbar">
               <table className="w-full text-left">
                 <thead className="bg-white border-b text-gray-400 text-[10px] uppercase tracking-widest sticky top-0 z-10">
                   <tr>
                     <th className="px-4 py-3">Stable Asset</th>
                     <th className="px-4 py-3">Market Compatibility</th>
                     <th className="px-4 py-3">RPA Status</th>
                   </tr>
                 </thead>
                 <tbody className="divide-y text-sm bg-white">
                   {results.map((v, idx) => (
                     <tr key={v.id} className={`${currentIndex === idx ? 'bg-pink-50' : ''} transition-colors`}>
                       <td className="px-4 py-3">
                         <div className="flex items-center space-x-3">
                            <img src={v.dataUrl} className="w-12 h-12 rounded-lg object-cover border bg-gray-100 shadow-sm" alt="V" />
                            <div className="flex flex-col">
                              <span className="text-[10px] font-mono text-gray-400 truncate w-32">{v.id}</span>
                              <button 
                                onClick={() => handleOpenImage(v.dataUrl)}
                                className="text-pink-600 font-bold hover:underline text-[10px] uppercase text-left mt-1"
                              >
                                View Permanent Link
                              </button>
                            </div>
                         </div>
                       </td>
                       <td className="px-4 py-3">
                         <div className="flex space-x-1">
                           <span title="Amazon Compatible" className="px-1.5 py-0.5 bg-yellow-100 text-yellow-700 rounded text-[9px] font-black uppercase">AMZ</span>
                           <span title="Flipkart Compatible" className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">FK</span>
                           <span title="Meesho Compatible" className="px-1.5 py-0.5 bg-pink-100 text-pink-700 rounded text-[9px] font-black uppercase">MSH</span>
                         </div>
                       </td>
                       <td className="px-4 py-3">
                         {v.status === 'completed' ? (
                           <div className="flex items-center text-green-600 font-bold space-x-2">
                             <span className="w-2 h-2 rounded-full bg-green-500"></span>
                             <span>₹{v.detectedPrice} Opt.</span>
                           </div>
                         ) : v.status === 'failed' ? (
                           <span className="text-red-500 text-[10px] font-bold">RPA Fail: Link Obscured</span>
                         ) : (
                           <span className="text-gray-300 text-[10px] italic">Queued...</span>
                         )}
                       </td>
                     </tr>
                   ))}
                 </tbody>
               </table>
             </div>
          </div>

          <div className="space-y-4">
            <div className="bg-gray-900 rounded-2xl p-5 font-mono text-[11px] text-green-400 h-[280px] overflow-y-auto shadow-xl border-t-4 border-gray-700">
               <p className="text-white font-bold mb-3 border-b border-gray-800 pb-1">MARKETPLACE TELEMETRY</p>
               {logs.map((log, i) => (
                 <p key={i} className={`mb-1 ${log.includes('[!]') ? 'text-red-400' : ''}`}>{log}</p>
               ))}
            </div>

            <div className="bg-gradient-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-xl p-5">
              <h4 className="text-xs font-black text-indigo-800 mb-2 uppercase tracking-widest flex items-center">
                <span className="mr-2">🚀</span> Bulk Listing Workflow
              </h4>
              <ul className="text-[10px] text-indigo-700 space-y-2 list-disc list-inside font-medium leading-relaxed">
                <li>Download all images using <strong>Direct Export Batch</strong> in Synthesizer.</li>
                <li>Download the <strong>Listings CSV</strong> from this page.</li>
                <li>The CSV <strong>"Stable Filename"</strong> matches your folder exactly.</li>
                <li>Upload both to Amazon/Flipkart/Meesho Seller Central.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ValidatorModule;