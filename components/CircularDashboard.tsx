import React from 'react';
import { ViewState } from '../types';
import { Type, Image, Edit3, Film, Grid, DollarSign, PenTool } from 'lucide-react';

interface CircularDashboardProps {
  onNavigate: (view: ViewState) => void;
}

const CircularDashboard: React.FC<CircularDashboardProps> = ({ onNavigate }) => {
  
  const menuItems = [
    { id: ViewState.TEXT_CREATIVE, label: '文字创意\nText Creative', icon: <Type className="w-6 h-6" />, color: 'bg-blue-500' },
    { id: ViewState.IMAGE_CREATIVE, label: '图片创意\nImage Creative', icon: <Image className="w-6 h-6" />, color: 'bg-emerald-500' },
    { id: ViewState.IMAGE_EDIT, label: '图片编辑\nImage Edit', icon: <Edit3 className="w-6 h-6" />, color: 'bg-purple-500' },
    { id: ViewState.ANIMATION, label: '动画\nAnimation', icon: <Film className="w-6 h-6" />, color: 'bg-orange-500' },
    { id: ViewState.GALLERY, label: '生成图片库\nGallery', icon: <Grid className="w-6 h-6" />, color: 'bg-pink-500' },
    { id: ViewState.COST_ANALYSIS, label: '造价分析\nCost Analysis', icon: <DollarSign className="w-6 h-6" />, color: 'bg-slate-600' },
  ];

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white relative overflow-hidden">
      
      {/* Decorative subtle architectural lines */}
      <div className="absolute inset-0 pointer-events-none opacity-10">
          <div className="absolute top-0 left-1/2 w-px h-full bg-slate-900"></div>
          <div className="absolute left-0 top-1/2 w-full h-px bg-slate-900"></div>
          <div className="absolute top-1/4 left-1/4 w-1/2 h-1/2 border border-slate-900 rounded-full"></div>
      </div>

      <div className="relative w-[350px] h-[350px] md:w-[500px] md:h-[500px] flex items-center justify-center">
        
        {/* Center Logo */}
        <div className="absolute z-20 flex flex-col items-center justify-center text-center p-6 bg-white rounded-full shadow-xl border-4 border-slate-100 w-48 h-48 md:w-64 md:h-64">
           <PenTool className="w-12 h-12 text-mr-red mb-2" />
           <h1 className="font-zongyi text-xl md:text-2xl leading-tight text-slate-900">
             刚刚好先生<br/>
             <span className="text-mr-red text-lg md:text-xl">Ai设计坊</span>
           </h1>
        </div>

        {/* Circular Menu Items */}
        {menuItems.map((item, index) => {
          const total = menuItems.length;
          // Calculate position on the circle
          const angle = (index * (360 / total)) - 90; // -90 to start at top
          const radius = 160; // desktop radius adjustment needed via transform usually
          
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="absolute group z-10 focus:outline-none transition-transform duration-300 hover:scale-110"
              style={{
                transform: `rotate(${angle}deg) translate(140px) rotate(${-angle}deg)`, // Basic mobile radius
                // For larger screens, we might want a larger translate, but let's keep it simple/responsive via scale
              }}
            >
              <div className={`
                flex flex-col items-center justify-center 
                w-24 h-24 md:w-32 md:h-32 rounded-full 
                shadow-lg text-white border-4 border-white
                transition-all duration-300
                ${item.color} hover:shadow-2xl
              `}>
                <div className="mb-1">{item.icon}</div>
                <span className="text-[10px] md:text-xs font-zongyi text-center whitespace-pre-line leading-tight">
                  {item.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      <footer className="absolute bottom-8 text-slate-400 text-sm font-zongyi">
        Mr. Just Right - Architecture AI
      </footer>
    </div>
  );
};

export default CircularDashboard;