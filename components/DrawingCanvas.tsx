import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, Upload, Trash2, Activity, Circle, Square, Diamond } from 'lucide-react';

interface DrawingCanvasProps {
  onImageChange: (base64: string | null) => void;
  label: string;
  allowDrawing: boolean;
}

type BrushShape = 'round' | 'square' | 'diamond';

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onImageChange, label, allowDrawing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [brushColor, setBrushColor] = useState('#D32F2F'); // Default to mr-red
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');
  const [smoothing, setSmoothing] = useState(true);
  const [brushShape, setBrushShape] = useState<BrushShape>('round');

  const lastPointRef = useRef<{x: number, y: number} | null>(null);
  const lastMidPointRef = useRef<{x: number, y: number} | null>(null);

  const PRESET_COLORS = ['#000000', '#D32F2F', '#1976D2', '#388E3C', '#FBC02D'];
  const BRUSH_SIZES = [1, 2, 4, 8, 16, 24];

  // Initial setup
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to draw a diamond at a specific point
  const drawDiamondStamp = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(Math.PI / 4); // 45 degrees
    ctx.fillStyle = color;
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!allowDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    lastPointRef.current = { x, y };
    lastMidPointRef.current = { x, y };

    // Initial dot/shape
    if (brushShape === 'diamond' && tool === 'pen') {
        drawDiamondStamp(ctx, x, y, brushSize, brushColor);
    } else {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y);
        ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
        ctx.lineWidth = brushSize;
        // For square brush, 'square' lineCap extends the line, but for a single dot 'butt' or 'square' 
        // with 0 length might be invisible or different. 
        // For a dot, if it's square, we want a square cap or just fillRect.
        ctx.lineCap = brushShape === 'square' ? 'square' : 'round';
        ctx.lineJoin = brushShape === 'square' ? 'miter' : 'round';
        ctx.stroke();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !allowDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const currentColor = tool === 'eraser' ? '#ffffff' : brushColor;

    // Diamond Brush Handling (Custom Stamping)
    if (brushShape === 'diamond' && tool === 'pen') {
        if (smoothing) {
             const lastPoint = lastPointRef.current;
             const lastMid = lastMidPointRef.current;
             if (lastPoint && lastMid) {
                const midPoint = { x: (lastPoint.x + x) / 2, y: (lastPoint.y + y) / 2 };
                
                // Interpolate quadratic curve for stamping
                // Curve from lastMid to midPoint with control lastPoint
                const dist = Math.hypot(midPoint.x - lastMid.x, midPoint.y - lastMid.y);
                const steps = Math.max(dist / (brushSize / 4), 1); // Density based on brush size

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
            // Linear interpolation for diamond
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
        return; // Exit special diamond draw
    }

    // Standard Path Drawing (Round / Square)
    ctx.lineWidth = brushSize;
    ctx.strokeStyle = currentColor;
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
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      exportImage();
      lastPointRef.current = null;
      lastMidPointRef.current = null;
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Clear and draw image fitted
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Simple aspect ratio fit
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height);
        const x = (canvas.width / 2) - (img.width / 2) * scale;
        const y = (canvas.height / 2) - (img.height / 2) * scale;
        
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
        
        setHasImage(true);
        exportImage();
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const exportImage = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    onImageChange(base64);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onImageChange(null);
    setHasImage(false);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap justify-between items-end gap-2">
        <label className="font-zongyi text-lg text-slate-700">{label}</label>
        
        <div className="flex flex-wrap items-center gap-2">
             <label className="cursor-pointer p-2 hover:bg-gray-100 rounded border border-gray-300 bg-white shadow-sm transition-colors" title="Upload Image">
              <Upload className="w-4 h-4 text-slate-600" />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>

          {allowDrawing && (
            <>
              {/* Tools Group */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                <button 
                  onClick={() => setTool('pen')} 
                  className={`p-1.5 rounded transition-all ${tool === 'pen' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Pen"
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
                <button 
                  onClick={() => setSmoothing(!smoothing)} 
                  className={`p-1.5 rounded transition-all ${smoothing ? 'bg-white shadow text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  title={smoothing ? "Smoothing On" : "Smoothing Off"}
                >
                  <Activity className="w-4 h-4" />
                </button>
              </div>

              {/* Brush Shape Group */}
              <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
                 <button 
                  onClick={() => setBrushShape('round')} 
                  className={`p-1.5 rounded transition-all ${brushShape === 'round' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Round Brush"
                >
                  <Circle className="w-4 h-4 fill-current" />
                </button>
                <button 
                  onClick={() => setBrushShape('square')} 
                  className={`p-1.5 rounded transition-all ${brushShape === 'square' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Square Brush"
                >
                  <Square className="w-4 h-4 fill-current" />
                </button>
                 <button 
                  onClick={() => setBrushShape('diamond')} 
                  className={`p-1.5 rounded transition-all ${brushShape === 'diamond' ? 'bg-white shadow text-slate-900' : 'text-slate-500 hover:text-slate-700'}`}
                  title="Diamond Brush"
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
              {tool === 'pen' && (
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
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-white shadow-inner">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-auto cursor-crosshair touch-none"
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;