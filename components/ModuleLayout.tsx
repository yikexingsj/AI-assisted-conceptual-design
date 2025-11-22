import React from 'react';
import { ArrowLeft } from 'lucide-react';

interface ModuleLayoutProps {
  title: string;
  icon?: React.ReactNode;
  onBack: () => void;
  children: React.ReactNode;
}

const ModuleLayout: React.FC<ModuleLayoutProps> = ({ title, icon, onBack, children }) => {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <header className="sticky top-0 z-50 bg-white border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
           <div className="flex items-center gap-4">
            <button 
                onClick={onBack}
                className="p-2 rounded-full hover:bg-slate-100 transition-colors text-slate-600"
            >
                <ArrowLeft className="w-6 h-6" />
            </button>
            <div className="flex items-center gap-3">
               {icon && <div className="text-mr-red">{icon}</div>}
               <h1 className="text-2xl font-zongyi tracking-wide text-slate-900">{title}</h1>
            </div>
           </div>
           <div className="text-sm text-slate-400 font-zongyi hidden sm:block">Mr. Just Right - AI Design Workshop</div>
        </div>
      </header>
      <main className="flex-grow p-6 max-w-7xl mx-auto w-full">
        {children}
      </main>
    </div>
  );
};

export default ModuleLayout;