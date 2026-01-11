import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import SynthesizerModule from './components/SynthesizerModule';
import ValidatorModule from './components/ValidatorModule';
import InsightsModule from './components/InsightsModule';
import { AppSection, ImageVariant } from './types';
import { getAllVariantsFromDB } from './services/imageService';

const App: React.FC = () => {
  const [activeSection, setActiveSection] = useState<AppSection>(AppSection.SYNTHESIZER);
  const [variants, setVariants] = useState<ImageVariant[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);

  // Recovery System: Load history from DB on mount
  useEffect(() => {
    const loadHistory = async () => {
      try {
        const history = await getAllVariantsFromDB();
        if (history.length > 0) {
          setVariants(history.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)));
        }
      } catch (err) {
        console.error("Failed to recover session history", err);
      } finally {
        setIsLoadingHistory(false);
      }
    };
    loadHistory();
  }, []);

  const handleVariantsGenerated = (newVariants: ImageVariant[], autoNavigate: boolean) => {
    setVariants(prev => [...newVariants, ...prev]);
    if (autoNavigate) {
      setActiveSection(AppSection.VALIDATOR);
    }
  };

  const handleValidationComplete = (updatedVariants: ImageVariant[]) => {
    setVariants(prev => {
      // FIX: Explicitly typing the Map to ensure 'a' and 'b' in the sort function are recognized as ImageVariant instead of unknown
      const prevMap = new Map<string, ImageVariant>(prev.map(v => [v.id, v]));
      updatedVariants.forEach(v => prevMap.set(v.id, v));
      return Array.from(prevMap.values()).sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
    });
  };

  return (
    <div className="flex h-screen w-full bg-gray-50 overflow-hidden">
      <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
      
      <main className="flex-1 flex flex-col overflow-y-auto">
        <header className="h-16 bg-white border-b px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center space-x-4">
            <h1 className="text-sm font-bold text-gray-400 uppercase tracking-widest">
              Control Panel > <span className="text-gray-900">{activeSection.replace(/_/g, ' ')}</span>
            </h1>
          </div>
          <div className="flex items-center space-x-4">
            {isLoadingHistory && <span className="text-[10px] text-gray-400 animate-pulse">RECOVERING SESSION...</span>}
            <div className="flex items-center space-x-2 bg-green-50 px-3 py-1 rounded-full border border-green-100">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              <span className="text-xs font-bold text-green-700 uppercase">System Online</span>
            </div>
            <div className="w-8 h-8 rounded-full bg-gray-200 border"></div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto w-full">
          {activeSection === AppSection.SYNTHESIZER && (
            <SynthesizerModule 
              onVariantsGenerated={handleVariantsGenerated} 
              existingVariants={variants}
            />
          )}

          {activeSection === AppSection.VALIDATOR && (
            <ValidatorModule 
              variants={variants} 
              onValidationComplete={handleValidationComplete} 
            />
          )}

          {activeSection === AppSection.INSIGHTS && (
            <InsightsModule variants={variants} />
          )}

          {activeSection === AppSection.SETTINGS && (
            <div className="bg-white rounded-2xl p-12 border shadow-sm">
              <h2 className="text-2xl font-bold mb-4">RPA Environment Settings</h2>
              <div className="space-y-6">
                <div className="p-4 border rounded-xl space-y-4">
                   <h3 className="font-bold text-gray-700">Hotkey Mappings</h3>
                   <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Set Upload Point</span> <kbd className="bg-white border rounded px-1">Numpad 1</kbd></div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Set Price Field</span> <kbd className="bg-white border rounded px-1">Numpad 2</kbd></div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Set Log Point</span> <kbd className="bg-white border rounded px-1">Numpad 3</kbd></div>
                      <div className="flex justify-between p-2 bg-gray-50 rounded"><span>Start Automation</span> <kbd className="bg-white border rounded px-1">Numpad 7</kbd></div>
                   </div>
                </div>
                <div className="p-4 border rounded-xl">
                   <h3 className="font-bold text-gray-700 mb-2">Algorithm Sensitivity</h3>
                   <input type="range" className="w-full accent-pink-500" />
                   <div className="flex justify-between text-xs text-gray-400 font-bold mt-1">
                      <span>STRICT</span>
                      <span>OPTIMIZED</span>
                      <span>AGGRESSIVE</span>
                   </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.4s ease-out forwards;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: #f1f1f1;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #ff3f6c;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default App;