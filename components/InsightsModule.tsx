import React, { useMemo } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts';
import { ImageVariant } from '../types';
import { downloadImage, exportToCSV } from '../services/imageService';

interface InsightsModuleProps {
  variants: ImageVariant[];
}

const InsightsModule: React.FC<InsightsModuleProps> = ({ variants }) => {
  const analyzedData = useMemo(() => {
    const completed = variants.filter(v => v.status === 'completed');
    if (completed.length === 0) return null;

    // Group by shipping cost
    const shippingGroups = completed.reduce((acc: any, v) => {
      const ship = v.detectedShipping || 0;
      acc[ship] = (acc[ship] || 0) + 1;
      return acc;
    }, {});

    const chartData = Object.entries(shippingGroups).map(([cost, count]) => ({
      name: `₹${cost}`,
      count,
      cost: Number(cost)
    })).sort((a, b) => a.cost - b.cost);

    const bestVariant = completed.reduce((prev, curr) => 
      (curr.detectedShipping || 999) < (prev.detectedShipping || 999) ? curr : prev
    );

    return { chartData, bestVariant, total: completed.length };
  }, [variants]);

  const handleDownloadBest = () => {
    if (analyzedData?.bestVariant) {
      const shortId = analyzedData.bestVariant.id.split('-').pop();
      downloadImage(analyzedData.bestVariant.dataUrl, `optimized-master-${shortId}.jpg`);
    }
  };

  const handleExportBestMetadata = () => {
    if (!analyzedData?.bestVariant) return;
    
    const metadata = {
      variantId: analyzedData.bestVariant.id,
      timestamp: analyzedData.bestVariant.timestamp,
      optimizationResults: {
        detectedPrice: analyzedData.bestVariant.detectedPrice,
        detectedShipping: analyzedData.bestVariant.detectedShipping,
      },
      configuration: analyzedData.bestVariant.config,
      tags: analyzedData.bestVariant.tags
    };

    const blob = new Blob([JSON.stringify(metadata, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `metadata-variant-${analyzedData.bestVariant.id.split('-').pop()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    if (variants.length > 0) {
      exportToCSV(variants);
    }
  };

  if (!analyzedData) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border shadow-sm flex flex-col items-center">
        <span className="text-6xl mb-4">📉</span>
        <h3 className="text-xl font-bold text-gray-700">No Data for Analysis</h3>
        <p className="text-gray-500 mt-2 max-w-md">Complete the Price Validator module to see the shipping cost cluster breakdown and optimization opportunities.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex justify-between items-center bg-white p-4 rounded-2xl border shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-widest leading-tight">Optimization Report</span>
          <span className="text-lg font-black text-gray-800">Dataset: {analyzedData.total} Optimized Clusters</span>
        </div>
        <button 
          onClick={handleExportAll}
          className="bg-gray-900 text-white px-6 py-2.5 rounded-xl font-bold text-sm shadow-lg hover:bg-black transition-all flex items-center active:scale-95"
        >
          <span className="mr-2">📑</span> Download Optimization Dataset (CSV)
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl p-8 border shadow-sm">
          <h3 className="text-xl font-bold mb-6 flex items-center">
            <span className="mr-2">📊</span> Shipping Tier Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analyzedData.chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip cursor={{fill: '#fef2f2'}} />
                <Bar dataKey="count" fill="#ff3f6c" radius={[4, 4, 0, 0]}>
                  {analyzedData.chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.cost === 0 ? '#34A853' : '#ff3f6c'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex justify-center space-x-4">
             <div className="flex items-center space-x-1 text-xs text-gray-500">
               <div className="w-3 h-3 bg-[#34A853] rounded"></div>
               <span>Zero Shipping Cluster</span>
             </div>
             <div className="flex items-center space-x-1 text-xs text-gray-500">
               <div className="w-3 h-3 bg-[#ff3f6c] rounded"></div>
               <span>Paid Shipping Cluster</span>
             </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-8 border shadow-sm flex flex-col">
          <h3 className="text-xl font-bold mb-6 flex items-center">
            <span className="mr-2">🏆</span> Winning Variation
          </h3>
          <div className="flex-1 flex flex-col md:flex-row gap-6">
             <div className="w-full md:w-1/2 rounded-xl overflow-hidden border relative group aspect-square">
                <img src={analyzedData.bestVariant.dataUrl} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" alt="Best" />
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button 
                    onClick={handleDownloadBest}
                    className="bg-white text-gray-900 px-4 py-2 rounded-lg font-bold text-sm shadow-xl active:scale-95 transition-transform"
                  >
                    Download Master
                  </button>
                </div>
             </div>
             <div className="flex-1 space-y-4">
               <div>
                 <p className="text-xs text-gray-500 uppercase tracking-widest font-bold">Optimization Success</p>
                 <h4 className="text-3xl font-black text-green-600">₹{analyzedData.bestVariant.detectedShipping} Shipping</h4>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm py-1 border-b">
                   <span className="text-gray-500">Font Family:</span>
                   <span className="font-medium">{analyzedData.bestVariant.config.fontFamily}</span>
                 </div>
                 <div className="flex justify-between text-sm py-1 border-b">
                   <span className="text-gray-500">Text Color:</span>
                   <div className="flex items-center space-x-2">
                     <div className="w-3 h-3 rounded-full" style={{backgroundColor: analyzedData.bestVariant.config.color}}></div>
                     <span className="font-medium uppercase">{analyzedData.bestVariant.config.color}</span>
                   </div>
                 </div>
                 <div className="flex justify-between text-sm py-1 border-b">
                   <span className="text-gray-500">Batch Code:</span>
                   <span className="font-medium">{analyzedData.bestVariant.config.batchNumber || 'N/A'}</span>
                 </div>
                 <div className="flex justify-between text-sm py-1 border-b">
                   <span className="text-gray-500">Cluster Hit:</span>
                   <span className="font-medium">Algorithm Tier 1</span>
                 </div>
               </div>
               <div className="grid grid-cols-1 gap-2">
                  <button 
                    onClick={handleDownloadBest}
                    className="w-full py-2 bg-meesho-gradient text-white rounded-lg text-sm font-bold shadow-md hover:opacity-90 transition-opacity"
                  >
                    Export Master Asset
                  </button>
                  <button 
                    onClick={handleExportBestMetadata}
                    className="w-full py-2 bg-white border border-gray-300 text-gray-700 rounded-lg text-sm font-bold shadow-sm hover:bg-gray-50 transition-colors flex items-center justify-center"
                  >
                    <span className="mr-2">📦</span> Export Metadata (JSON)
                  </button>
               </div>
               <p className="text-[10px] text-gray-400 italic leading-tight">
                 *Exported JSON contains coordinate data, opacity levels, and AI tags for precise replica generation in bulk tools.
               </p>
             </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InsightsModule;