import React, { useRef, useEffect, useState } from 'react';
import { Eraser, Pen, Upload, Trash2 } from 'lucide-react';

interface DrawingCanvasProps {
  onImageChange: (base64: string | null) => void;
  label: string;
  allowDrawing: boolean;
}

const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onImageChange, label, allowDrawing }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasImage, setHasImage] = useState(false);
  const [brushColor, setBrushColor] = useState('#D32F2F'); // Default to mr-red
  const [brushSize, setBrushSize] = useState(4);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  const PRESET_COLORS = ['#000000', '#D32F2F', '#1976D2', '#388E3C', '#FBC02D'];
  const BRUSH_SIZES = [2, 4, 8, 16];

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    // Do not reset parent state here if re-initializing for clear, 
    // but if mounting, we might want to. 
    // For "Clear", we explicitly call initCanvas, so let's keep logic there.
    // But we should probably separate "setup" from "clear".
  };

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

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!allowDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !allowDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.strokeStyle = tool === 'eraser' ? '#ffffff' : brushColor;
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (isDrawing) {
      setIsDrawing(false);
      exportImage();
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
                      className="rounded-full bg-current text-slate-800" 
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