import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, Upload, Trash2, Activity, Circle, Square, Diamond, Undo, Redo, PenTool, Pencil, Droplet, Waves, Slash, Triangle, Maximize, Minimize } from 'lucide-react';

interface DrawingCanvasProps {
  onImageChange: (base64: string | null) => void;
  label: string;
  allowDrawing: boolean;
  initialImage?: string | null;
}

type BrushShape = 'round' | 'square' | 'diamond';
type BrushStyle = 'solid' | 'pencil' | 'watercolor' | 'water';
// Expanded tool types to include shapes
type ToolType = 'pen' | 'eraser' | 'line' | 'rectangle' | 'circle' | 'triangle';

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onImageChange, label, allowDrawing, initialImage }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [brushColor, setBrushColor] = useState('#D32F2F'); // Default to mr-red
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<ToolType>('pen');
  const [brushStyle, setBrushStyle] = useState<BrushStyle>('solid');
  const [smoothing, setSmoothing] = useState(true);
  const [brushShape, setBrushShape] = useState<BrushShape>('round');
  
  // Fullscreen and Size State
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 512, height: 512 });

  // History Management
  const [history, setHistory] = useState<string[]>([]);
  const [historyStep, setHistoryStep] = useState(-1);

  // References for drawing logic
  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const lastMidPointRef = useRef<{x: number, y: number} | null>(null);
  const startPointRef = useRef<{x: number, y: number} | null>(null); // For shapes
  const snapshotRef = useRef<ImageData | null>(null); // For shape preview
  const lastExportedRef = useRef<string | null>(null);

  const PRESET_COLORS = ['#000000', '#D32F2F', '#1976D2', '#388E3C', '#FBC02D'];
  const BRUSH_SIZES = [1, 2, 4, 8, 16, 24, 48];

  // Initial setup - Blank Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        // Save initial blank state
        const initialData = canvas.toDataURL('image/png');
        setHistory([initialData]);
        setHistoryStep(0);
      }
    }
  }, []); // Only runs once on mount, but size changes handle their own redraw

  // Fullscreen Resize Logic
  useEffect(() => {
    const handleResize = () => {
        if (isFullScreen) {
             // Fullscreen: subtract approx toolbar/padding height
             // Using mostly window size to maximize space
             setCanvasSize({ width: window.innerWidth - 32, height: window.innerHeight - 100 });
        } else {
             // Normal: Fixed high res 512x512
             setCanvasSize({ width: 512, height: 512 });
        }
    };
    
    // Initial call
    handleResize();

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullScreen]);

  // Restore image content when canvas size changes
  useEffect(() => {
      // If we have data, we must redraw it on the resized canvas
      if (lastExportedRef.current) {
          const src = `data:image/png;base64,${lastExportedRef.current}`;
          fitAndDrawNewImage(src, false); // Don't add resize events to history stack
      } else {
          // If no image, just clear to white
          const canvas = canvasRef.current;
          if (canvas) {
              const ctx = canvas.getContext('2d');
              if (ctx) {
                ctx.fillStyle = '#ffffff';
                ctx.fillRect(0, 0, canvas.width, canvas.height);
              }
          }
      }
  }, [canvasSize]);

  // Helper: Save current state to history
  const saveToHistory = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    
    // If we are not at the end of history, truncate future steps
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push(dataUrl);
    
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  // Helper: Load image from string onto canvas (stretch/fit logic handled in fitAndDrawNewImage)
  const loadImageOnCanvas = (src: string, callback?: () => void) => {
      fitAndDrawNewImage(src, false, callback);
  };

  // Helper: Fit and draw a new external image (Upload or Prop or Restore)
  const fitAndDrawNewImage = (src: string, recordHistory = true, callback?: () => void) => {
    const img = new Image();
    img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        ctx.globalCompositeOperation = 'source-over';
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Smart Fit: Maintain aspect ratio and center
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        setHasImage(true);
        exportImage();
        
        if (recordHistory) {
            saveToHistory();
        }
        if (callback) callback();
    };
    img.src = src;
  };

  // Handle Undo
  const handleUndo = () => {
    if (historyStep > 0) {
        const prevStep = historyStep - 1;
        const prevImage = history[prevStep];
        setHistoryStep(prevStep);
        // Note: History items are dataURLs. When drawing back, we should stretch them to fill canvas 
        // if resolution changed, OR just use fit logic. 
        // For simplicity, we assume history is valid for current session. 
        // Using fit logic is safer if size changed.
        fitAndDrawNewImage(prevImage, false); 
    }
  };

  // Handle Redo
  const handleRedo = () => {
    if (historyStep < history.length - 1) {
        const nextStep = historyStep + 1;
        const nextImage = history[nextStep];
        setHistoryStep(nextStep);
        fitAndDrawNewImage(nextImage, false);
    }
  };

  // Handle external initial image updates
  useEffect(() => {
    if (initialImage && initialImage !== lastExportedRef.current) {
        // Check if it already has data prefix, if not assume base64 png
        const src = initialImage.startsWith('data:') ? initialImage : `data:image/png;base64,${initialImage}`;
        fitAndDrawNewImage(src, true);
        lastExportedRef.current = initialImage; 
    }
  }, [initialImage]);

  // Helper to draw a diamond at a specific point
  const drawDiamondStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4); // 45 degrees
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  };

  const setupContextForStyle = (ctx: CanvasRenderingContext2D) => {
    if (tool === 'eraser') {
      ctx.globalAlpha = 1.0;
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ffffff';
      ctx.fillStyle = '#ffffff';
      return;
    }

    ctx.strokeStyle = brushColor;
    ctx.fillStyle = brushColor;

    switch (brushStyle) {
      case 'solid': // Steel Pen
        ctx.globalAlpha = 1.0;
        ctx.shadowBlur = 0;
        break;
      case 'pencil':
        ctx.globalAlpha = 0.7; // Slightly transparent
        ctx.shadowBlur = 0.5; // Very slight fuzz
        ctx.shadowColor = brushColor;
        break;
      case 'watercolor':
        ctx.globalAlpha = 0.4; // Transparent
        ctx.shadowBlur = brushSize / 2; // Bleeding edge
        ctx.shadowColor = brushColor;
        break;
      case 'water': // Gouache (水粉) - High opacity, low spread
        ctx.globalAlpha = 0.9;
        ctx.shadowBlur = 1; 
        ctx.shadowColor = brushColor;
        break;
    }
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!allowDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    
    // Calculate scaling factors
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    // Apply scaling to mouse coordinates
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    
    lastPointRef.current = { x, y };
    lastMidPointRef.current = { x, y };
    startPointRef.current = { x, y };

    if (tool === 'pen' || tool === 'eraser') {
      // Pen Logic
      setupContextForStyle(ctx);

      // Initial dot/shape
      if (brushShape === 'diamond' && tool === 'pen') {
          drawDiamondStamp(ctx, x, y, brushSize, brushColor);
      } else {
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x, y);
          
          ctx.lineWidth = brushSize;
          ctx.lineCap = brushShape === 'square' ? 'square' : 'round';
          ctx.lineJoin = brushShape === 'square' ? 'miter' : 'round';
          ctx.stroke();
      }
    } else {
      // Shape Logic: Save Snapshot
      snapshotRef.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !allowDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if (tool === 'pen' || tool === 'eraser') {
      // --- PEN DRAWING LOGIC ---
      setupContextForStyle(ctx);
      const currentColor = tool === 'eraser' ? '#ffffff' : brushColor;

      // Diamond Brush Handling (Custom Stamping)
      if (brushShape === 'diamond' && tool === 'pen') {
          if (smoothing) {
               const lastPoint = lastPointRef.current;
               const lastMid = lastMidPointRef.current;
               if (lastPoint && lastMid) {
                  const midPoint = { x: (lastPoint.x + x) / 2, y: (lastPoint.y + y) / 2 };
                  
                  const dist = Math.hypot(midPoint.x - lastMid.x, midPoint.y - lastMid.y);
                  const steps = Math.max(dist / (brushSize / 4), 1); 

                  for (let t = 0; t <= 1; t += 1/steps) {
                     const oneMinusT = 1 - t;
                     const qx = oneMinusT * oneMinusT * lastMid.x + 2 * oneMinusT * t * lastPoint.x + t * t * midPoint.x;
                     const qy = oneMinusT * oneMinusT * lastMid.y + 2 * oneMinusT * t * lastPoint.y + t * t * midPoint.y;
                     drawDiamondStamp(ctx, qx, qy, brushSize, currentColor);
                  }
                  lastPointRef.current = { x, y };
                  lastMidPointRef.current = midPoint;
               }
          } else {
              const lastPoint = lastPointRef.current || { x, y };
              const dist = Math.hypot(x - lastPoint.x, y - lastPoint.y);
              const steps = Math.max(dist / (brushSize / 4), 1);
              
              for (let i = 0; i <= steps; i++) {
                  const t = i / steps;
                  const lx = lastPoint.x + (x - lastPoint.x) * t;
                  const ly = lastPoint.y + (y - lastPoint.y) * t;
                  drawDiamondStamp(ctx, lx, ly, brushSize, currentColor);
              }
              lastPointRef.current = { x, y };
              lastMidPointRef.current = { x, y };
          }
          return; 
      }

      // Standard Path Drawing
      ctx.lineWidth = brushSize;
      ctx.lineCap = brushShape === 'square' ? 'square' : 'round';
      ctx.lineJoin = brushShape === 'square' ? 'bevel' : 'round';

      if (smoothing) {
        const lastPoint = lastPointRef.current;
        const lastMid = lastMidPointRef.current;

        if (lastPoint && lastMid) {
          const midPoint = {
            x: (lastPoint.x + x) / 2,
            y: (lastPoint.y + y) / 2
          };
          
          ctx.beginPath();
          ctx.moveTo(lastMid.x, lastMid.y);
          ctx.quadraticCurveTo(lastPoint.x, lastPoint.y, midPoint.x, midPoint.y);
          ctx.stroke();

          lastPointRef.current = { x, y };
          lastMidPointRef.current = midPoint;
        }
      } else {
        ctx.beginPath();
        if (lastPointRef.current) {
          ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
        } else {
          ctx.moveTo(x, y);
        }
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastPointRef.current = { x, y };
        lastMidPointRef.current = { x, y };
      }
    } else {
      // --- SHAPE PREVIEW LOGIC ---
      if (!snapshotRef.current || !startPointRef.current) return;

      // Restore image from start of drag
      ctx.putImageData(snapshotRef.current, 0, 0);

      const sx = startPointRef.current.x;
      const sy = startPointRef.current.y;
      const w = x - sx;
      const h = y - sy;

      setupContextForStyle(ctx);
      ctx.lineWidth = brushSize;
      ctx.lineCap = brushShape === 'square' ? 'square' : 'round';
      ctx.lineJoin = brushShape === 'square' ? 'miter' : 'round';
      
      ctx.beginPath();
      
      if (tool === 'line') {
        ctx.moveTo(sx, sy);
        ctx.lineTo(x, y);
      } else if (tool === 'rectangle') {
        ctx.rect(sx, sy, w, h);
      } else if (tool === 'circle') {
        // Draw Ellipse based on bounding box
        ctx.ellipse(sx + w/2, sy + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, 2 * Math.PI);
      } else if (tool === 'triangle') {
        // Simple isosceles triangle in bounding box
        ctx.moveTo(sx + w / 2, sy);
        ctx.lineTo(sx, sy + h);
        ctx.lineTo(sx + w, sy + h);
        ctx.closePath();
      }
      
      ctx.stroke();
    }
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      // Reset context properties to default for safety
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        if (ctx) {
             ctx.globalAlpha = 1.0;
             ctx.shadowBlur = 0;
        }
      }
      exportImage();
      saveToHistory();
      lastPointRef.current = null;
      lastMidPointRef.current = null;
      startPointRef.current = null;
      snapshotRef.current = null;
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      fitAndDrawNewImage(result, true);
    };
    reader.readAsDataURL(file);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    lastExportedRef.current = base64; // Update tracking ref
    onImageChange(base64);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Reset brush defaults just in case
    ctx.globalAlpha = 1.0;
    ctx.shadowBlur = 0;
    
    lastExportedRef.current = null;
    onImageChange(null);
    setHasImage(false);
    saveToHistory(); // Save empty state
  };

  const toggleFullScreen = () => {
      setIsFullScreen(!isFullScreen);
  };

  return (
    <div className={`transition-all duration-300 ${isFullScreen ? 'fixed inset-0 z-50 bg-slate-100 flex flex-col' : 'flex flex-col gap-2'}`}>
      
      {/* Toolbar */}
      <div className={`flex flex-wrap justify-between items-end gap-2 bg-white ${isFullScreen ? 'p-4 shadow-md z-10' : ''}`}>
        <label className="font-zongyi text-lg text-slate-700 flex items-center gap-2">
            {label}
            {isFullScreen && <span className="text-xs bg-mr-red text-white px-2 py-0.5 rounded">FULLSCREEN</span>}
        </label>
        
        <div className="flex flex-wrap items-center gap-2">
             <button 
              onClick={toggleFullScreen}
              className={`p-2 rounded border transition-colors ${isFullScreen ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
              title={isFullScreen ? "Exit Fullscreen" : "Fullscreen"}
             >
                {isFullScreen ? <Minimize className="w-4 h-4"/> : <Maximize className="w-4 h-4"/>}
             </button>

             <label className="cursor-pointer p-2 hover:bg-gray-100 rounded border border-gray-300 bg-white shadow-sm transition-colors" title="Upload Image">
              <Upload className="w-4 h-4 text-slate-600" />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>

          {allowDrawing && (
            <>
              {/* History Controls */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={handleUndo} 
                  disabled={historyStep <= 0}
                  className={`p-1.5 rounded transition-all ${historyStep > 0 ? 'text-slate-700 hover:bg-white hover:shadow' : 'text-slate-300 cursor-not-allowed'}`}
                  title="Undo (返回上步)"
                >
                  <Undo className="w-4 h-4" />
                </button>
                <button 
                  onClick={handleRedo}
                  disabled={historyStep >= history.length - 1} 
                  className={`p-1.5 rounded transition-all ${historyStep < history.length - 1 ? 'text-slate-700 hover:bg-white hover:shadow' : 'text-slate-300 cursor-not-allowed'}`}
                  title="Redo (重复上步)"
                >
                  <Redo className="w-4 h-4" />
                </button>
              </div>

              {/* Tools Group (Pen/Eraser + Shapes) */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setTool('pen')} 
                  className={`p-1.5 rounded transition-all ${tool === 'pen' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Draw Tool"
                >
                  <Pen className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTool('eraser')} 
                  className={`p-1.5 rounded transition-all ${tool === 'eraser' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Eraser"
                >
                  <Eraser className="w-4 h-4" />
                </button>
                
                <div className="w-px bg-slate-300 mx-1 my-1"></div>
                
                {/* Shape Tools */}
                <button 
                  onClick={() => setTool('line')} 
                  className={`p-1.5 rounded transition-all ${tool === 'line' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Line (直线)"
                >
                  <Slash className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTool('rectangle')} 
                  className={`p-1.5 rounded transition-all ${tool === 'rectangle' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Rectangle (矩形)"
                >
                  <Square className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTool('circle')} 
                  className={`p-1.5 rounded transition-all ${tool === 'circle' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Circle/Ellipse (圆/椭圆)"
                >
                  <Circle className="w-4 h-4" />
                </button>
                <button 
                  onClick={() => setTool('triangle')} 
                  className={`p-1.5 rounded transition-all ${tool === 'triangle' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Triangle (三角形)"
                >
                  <Triangle className="w-4 h-4" />
                </button>

                <div className="w-px bg-slate-300 mx-1 my-1"></div>
                
                <button 
                  onClick={() => setSmoothing(!smoothing)} 
                  className={`p-1.5 rounded transition-all ${smoothing ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  title={smoothing ? "Smoothing On (Pen Only)" : "Smoothing Off"}
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>
              
              {/* Brush Style Group (Visible only when not using Eraser) */}
              {tool !== 'eraser' && (
                <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                    <button 
                    onClick={() => setBrushStyle('solid')} 
                    className={`p-1.5 rounded transition-all ${brushStyle === 'solid' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Steel Pen (钢笔)"
                    >
                    <PenTool className="w-4 h-4" />
                    </button>
                    <button 
                    onClick={() => setBrushStyle('pencil')} 
                    className={`p-1.5 rounded transition-all ${brushStyle === 'pencil' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Pencil (铅笔)"
                    >
                    <Pencil className="w-4 h-4" />
                    </button>
                    <button 
                    onClick={() => setBrushStyle('watercolor')} 
                    className={`p-1.5 rounded transition-all ${brushStyle === 'watercolor' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Watercolor (水彩)"
                    >
                    <Droplet className="w-4 h-4" />
                    </button>
                    <button 
                    onClick={() => setBrushStyle('water')} 
                    className={`p-1.5 rounded transition-all ${brushStyle === 'water' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                    title="Gouache (水粉)"
                    >
                    <Waves className="w-4 h-4" />
                    </button>
                </div>
              )}

              {/* Brush Shape Group */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                 <button 
                  onClick={() => setBrushShape('round')} 
                  className={`p-1.5 rounded transition-all ${brushShape === 'round' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Round Tip"
                >
                  <Circle className="w-4 h-4 fill-current" />
                </button>
                <button 
                  onClick={() => setBrushShape('square')} 
                  className={`p-1.5 rounded transition-all ${brushShape === 'square' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Square Tip"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
                 <button 
                  onClick={() => setBrushShape('diamond')} 
                  className={`p-1.5 rounded transition-all ${brushShape === 'diamond' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Diamond Tip"
                >
                  <Diamond className="w-4 h-4 fill-current" />
                </button>
              </div>

              {/* Brush Size Group */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 items-center gap-1">
                {BRUSH_SIZES.map(size => (
                  <button
                    key={size}
                    onClick={() => setBrushSize(size)}
                    className={`w-6 h-6 flex items-center justify-center rounded hover:bg-white transition-all ${brushSize === size ? 'bg-white shadow' : ''}`}
                    title={`Size: ${size}px`}
                  >
                    <div 
                      className={`bg-current text-slate-800 ${brushShape === 'round' ? 'rounded-full' : brushShape === 'diamond' ? 'rotate-45' : ''}`} 
                      style={{ width: Math.min(size, 16), height: Math.min(size, 16) }} 
                    />
                  </button>
                ))}
              </div>

              {/* Colors Group */}
              {tool !== 'eraser' && (
                 <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 items-center gap-1">
                    {PRESET_COLORS.map(color => (
                        <button
                            key={color}
                            onClick={() => setBrushColor(color)}
                            className={`w-5 h-5 rounded-full border border-slate-300 transition-transform hover:scale-110 ${brushColor === color ? 'ring-2 ring-slate-400 ring-offset-1' : ''}`}
                            style={{ backgroundColor: color }}
                            title={color}
                        />
                    ))}
                    <div className="w-px h-4 bg-slate-300 mx-1"></div>
                    <div className="relative w-5 h-5 overflow-hidden rounded-full border border-slate-300 hover:scale-110 transition-transform">
                      <input 
                        type="color" 
                        value={brushColor} 
                        onChange={(e) => setBrushColor(e.target.value)}
                        className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-[150%] h-[150%] p-0 border-0 cursor-pointer"
                        title="Custom Color"
                      />
                    </div>
                 </div>
              )}
            </>
          )}
          
          <button onClick={clearCanvas} className="p-2 text-red-500 hover:bg-red-50 rounded border border-red-200 bg-white shadow-sm transition-colors" title="Clear Canvas">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Canvas Area */}
      <div className={`
          ${isFullScreen 
            ? 'flex-1 flex items-center justify-center p-4 overflow-hidden relative' 
            : 'border-2 border-slate-200 rounded-lg overflow-hidden bg-white shadow-inner relative'}
      `}>
         {isFullScreen && <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAiIGhlaWdodD0iMjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGNpcmNsZSBjeD0iMSIgY3k9IjEiIHI9IjEiIGZpbGw9IiNjY2MiIG9wYWNpdHk9IjAuNSIvPjwvc3ZnPg==')] opacity-20 pointer-events-none"></div>}
         
        <canvas
          ref={canvasRef}
          width={canvasSize.width}
          height={canvasSize.height}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className={`cursor-crosshair touch-none bg-white shadow-lg ${isFullScreen ? 'max-w-full max-h-full border border-slate-300' : 'w-full h-auto'}`}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;