
import React from 'react';
import { AppSection } from '../types';

interface SidebarProps {
  activeSection: AppSection;
  setActiveSection: (section: AppSection) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  const navItems = [
    { id: AppSection.SYNTHESIZER, label: 'Image Synthesizer', icon: '🎨' },
    { id: AppSection.VALIDATOR, label: 'Price Validator', icon: '🤖' },
    { id: AppSection.INSIGHTS, label: 'Cluster Insights', icon: '📊' },
    { id: AppSection.SETTINGS, label: 'System Settings', icon: '⚙️' },
  ];

  return (
    <div className="w-64 bg-white border-r h-full flex flex-col">
      <div className="p-6 border-b flex items-center space-x-3">
        <div className="w-10 h-10 bg-meesho-gradient rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
          M
        </div>
        <span className="font-bold text-lg tracking-tight text-gray-800">MeeshoSuite</span>
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSection(item.id)}
            className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-all duration-200 ${
              activeSection === item.id
                ? 'bg-meesho-gradient text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium">{item.label}</span>
          </button>
        ))}
      </nav>
      <div className="p-4 border-t">
        <div className="bg-pink-50 rounded-lg p-3 text-xs text-pink-700">
          <p className="font-bold">PRO License Active</p>
          <p>Next Batch: 100 Variations</p>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
