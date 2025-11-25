
import React from 'react';
import { ViewState, User } from '../types';
import { Type, Image, Edit3, Grid, Calculator, Film, Box, User as UserIcon, Crown, Coins } from 'lucide-react';

interface CircularDashboardProps {
  onNavigate: (view: ViewState) => void;
  currentUser?: User;
  onLogout: () => void;
}

const CircularDashboard: React.FC<CircularDashboardProps> = ({ onNavigate, currentUser, onLogout }) => {
  // Menu Items - Updated with rainbow colors: 赤橙黄绿青蓝紫
  const menuItems = [
    { 
      id: ViewState.TEXT_CREATIVE, 
      label: '文字创意\nCreative', 
      icon: <Type className="w-6 h-6" />, 
      color: 'text-red-600',
      hoverBorder: 'hover:border-red-600',
    },
    { 
      id: ViewState.IMAGE_CREATIVE, 
      label: '图片创意\nImage', 
      icon: <Image className="w-6 h-6" />, 
      color: 'text-orange-500',
      hoverBorder: 'hover:border-orange-500',
    },
    { 
      id: ViewState.IMAGE_EDIT, 
      label: '图片编辑\nEdit', 
      icon: <Edit3 className="w-6 h-6" />, 
      color: 'text-yellow-500',
      hoverBorder: 'hover:border-yellow-500',
    },
    { 
      id: ViewState.ANIMATION, 
      label: '漫游动画\nAnim', 
      icon: <Film className="w-6 h-6" />, 
      color: 'text-green-600',
      hoverBorder: 'hover:border-green-600',
    },
    { 
      id: ViewState.THREED_MODEL, 
      label: '三维模型\n3D Model', 
      icon: <Box className="w-6 h-6" />, 
      color: 'text-cyan-500',
      hoverBorder: 'hover:border-cyan-500',
    },
    { 
      id: ViewState.COST_ANALYSIS, 
      label: '造价分析\nCost', 
      icon: <Calculator className="w-6 h-6" />, 
      color: 'text-blue-600',
      hoverBorder: 'hover:border-blue-600',
    },
    { 
      id: ViewState.GALLERY, 
      label: '生成库\nGallery', 
      icon: <Grid className="w-6 h-6" />, 
      color: 'text-purple-600',
      hoverBorder: 'hover:border-purple-600',
    },
  ];

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-white"
    >
      
      <style>{`
        @keyframes orbit {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes orbit-reverse {
          from { transform: rotate(360deg); }
          to { transform: rotate(0deg); }
        }
        .animate-orbit {
          animation: orbit 40s linear infinite;
        }
        .animate-orbit-reverse {
          animation: orbit-reverse 40s linear infinite;
        }
        
        .orbit-container:hover .animate-orbit,
        .orbit-container:hover .animate-orbit-reverse {
          animation-play-state: paused;
        }
        
        :root {
           --orbit-radius: 140px;
        }
        @media (min-width: 768px) {
           :root {
              --orbit-radius: 220px;
           }
        }
      `}</style>

      {/* Decorative architectural lines & Perfect Circle Background */}
      <div className="absolute inset-0 pointer-events-none flex items-center justify-center z-0 opacity-10">
          <div className="absolute w-px h-full bg-slate-900"></div>
          <div className="absolute w-full h-px bg-slate-900"></div>
          <div className="w-[85vmin] h-[85vmin] max-w-[800px] max-h-[800px] border rounded-full border-slate-900"></div>
      </div>

      {/* User Status Top Right */}
      {currentUser && (
        <div className="absolute top-6 right-6 z-20 flex flex-col items-end gap-2 animate-fadeIn">
            <div className="flex items-center gap-2 text-slate-600 bg-white/80 px-4 py-2 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm">
                {currentUser.isPro ? <Crown className="w-4 h-4 text-yellow-500 fill-current" /> : <UserIcon className="w-4 h-4 text-mr-red" />}
                <span className="font-zongyi text-sm pt-0.5">{currentUser.username}</span>
            </div>
            
            <div className="flex items-center gap-2">
                <div 
                    className="flex items-center gap-1.5 text-slate-600 bg-white/80 px-3 py-1.5 rounded-full border border-slate-200 shadow-sm backdrop-blur-sm"
                    title="Available credits"
                >
                    <Coins className="w-3.5 h-3.5 text-yellow-500" />
                    <span className="font-sans text-xs font-bold">{currentUser.credits}</span>
                    <span className="text-[9px] text-slate-400 bg-slate-100 px-1 rounded">PTS</span>
                </div>
            </div>
        </div>
      )}

      <div className="relative w-[350px] h-[350px] md:w-[600px] md:h-[600px] flex items-center justify-center orbit-container z-10">
        
        {/* Dashed Orbit Ring - Connects the outer circles */}
        <div 
          className="absolute rounded-full border-2 border-dashed border-slate-300/60 pointer-events-none"
          style={{
             width: 'calc(var(--orbit-radius) * 2)',
             height: 'calc(var(--orbit-radius) * 2)',
          }}
        ></div>

        {/* Center Logo - Chinese and English */}
        <div className="absolute z-20 flex flex-col items-center justify-center text-center bg-white rounded-full shadow-2xl border-4 border-slate-50 w-48 h-48 md:w-64 md:h-64 overflow-hidden">
           <div className="flex flex-col items-center justify-center w-full px-2">
             {/* House Logo - Slightly smaller to fit english text */}
             <svg 
               viewBox="0 0 100 100" 
               className="w-10 h-10 md:w-16 md:h-16 mb-2 text-mr-red flex-shrink-0" 
               fill="none" 
               stroke="currentColor" 
               strokeWidth="4" 
               strokeLinecap="round" 
               strokeLinejoin="round"
             >
               <path d="M50 10 L85 45 L85 90 L58 90 L58 65 L42 65 L42 90 L15 90 L15 45 Z" />
             </svg>
             
             {/* Chinese Text Block */}
             <div className="flex flex-col items-center mb-1 md:mb-2">
                {/* Zongyi font looks better slightly larger */}
                <h1 className="font-zongyi text-gray-500 text-xl md:text-4xl leading-none mb-1 tracking-wide whitespace-nowrap">
                刚刚好先生
                </h1>
                <h2 className="font-zongyi text-gray-500 text-sm md:text-lg leading-none tracking-wide opacity-90">
                AI设计坊
                </h2>
             </div>

             {/* Divider Line */}
             <div className="w-12 h-px bg-slate-200 mb-1 md:mb-2"></div>

             {/* English Text Block */}
             <div className="flex flex-col gap-0.5 items-center">
                <p className="font-sans text-gray-500 text-[9px] md:text-[11px] uppercase tracking-widest scale-90 md:scale-100 font-medium">
                    Mr. Just Right
                </p>
                <p className="font-sans text-gray-400 text-[7px] md:text-[9px] uppercase tracking-wider scale-90 md:scale-100">
                    AI Design Workshop
                </p>
             </div>
           </div>
        </div>

        {/* Rotating Container for Menu Items */}
        <div className="absolute inset-0 animate-orbit pointer-events-none">
            {menuItems.map((item, index) => {
            const total = menuItems.length;
            const angle = (index * (360 / total)) - 90;
            
            return (
                <div
                    key={item.id}
                    className="absolute top-1/2 left-1/2 w-0 h-0 flex items-center justify-center pointer-events-auto"
                    style={{
                        transform: `rotate(${angle}deg) translate(var(--orbit-radius)) rotate(${-angle}deg)`,
                    }}
                >
                    <button
                    onClick={() => onNavigate(item.id)}
                    className="group focus:outline-none transition-transform duration-300 hover:scale-110"
                    >
                    <div className={`
                        flex flex-col items-center justify-center 
                        w-24 h-24 md:w-32 md:h-32 rounded-full 
                        shadow-lg border-2
                        transition-all duration-300
                        bg-white border-slate-200 
                        ${item.hoverBorder}
                        hover:shadow-xl
                        animate-orbit-reverse
                    `}>
                        <div className={`mb-1 ${item.color}`}>{item.icon}</div>
                        <span className="text-[10px] md:text-xs font-zongyi text-center whitespace-pre-line leading-tight text-gray-500">
                        {item.label}
                        </span>
                    </div>
                    </button>
                </div>
            );
            })}
        </div>
      </div>

      <footer className="absolute bottom-8 text-sm font-zongyi z-10 text-slate-400">
        Mr. Just Right - Architecture AI
      </footer>
    </div>
  );
};

export default CircularDashboard;
