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
  const [brushColor, setBrushColor] = useState('#FF0000'); // Red for markup
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState<'pen' | 'eraser'>('pen');

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    onImageChange(null);
    setHasImage(false);
  };

  useEffect(() => {
    initCanvas();
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
    // Strip the data:image/png;base64, prefix if needed, but API usually takes raw base64 or builds it
    const dataUrl = canvas.toDataURL('image/png');
    const base64 = dataUrl.split(',')[1];
    onImageChange(base64);
  };

  const clearCanvas = () => {
    initCanvas();
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-between items-center">
        <label className="font-zongyi text-lg text-slate-700">{label}</label>
        <div className="flex gap-2">
             <label className="cursor-pointer p-2 hover:bg-gray-100 rounded border border-gray-300" title="Upload Image">
              <Upload className="w-4 h-4" />
              <input type="file" accept="image/*" className="hidden" onChange={handleUpload} />
            </label>
          {allowDrawing && (
            <>
              <button onClick={() => setTool('pen')} className={`p-2 rounded border ${tool === 'pen' ? 'bg-mr-red text-white border-mr-red' : 'border-gray-300 hover:bg-gray-100'}`}>
                <Pen className="w-4 h-4" />
              </button>
               <button onClick={() => setTool('eraser')} className={`p-2 rounded border ${tool === 'eraser' ? 'bg-slate-600 text-white' : 'border-gray-300 hover:bg-gray-100'}`}>
                <Eraser className="w-4 h-4" />
              </button>
              <input 
                type="color" 
                value={brushColor} 
                onChange={(e) => setBrushColor(e.target.value)}
                className="w-8 h-8 p-0 border-0 rounded cursor-pointer"
              />
            </>
          )}
          <button onClick={clearCanvas} className="p-2 text-red-500 hover:bg-red-50 rounded border border-red-200">
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div className="border-2 border-slate-200 rounded-lg overflow-hidden bg-gray-50">
        <canvas
          ref={canvasRef}
          width={400}
          height={400}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className={`w-full h-auto cursor-crosshair touch-none`}
        />
      </div>
    </div>
  );
};

export default DrawingCanvas;