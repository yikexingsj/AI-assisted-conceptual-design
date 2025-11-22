import React, { useState } from 'react';
import { ViewState, AspectRatio, GeneratedItem } from './types';
import CircularDashboard from './components/CircularDashboard';
import ModuleLayout from './components/ModuleLayout';
import DrawingCanvas from './components/DrawingCanvas';
import { generateImageFromText, generateCreativeImage, editImage, generateVideo, analyzeCost } from './services/geminiService';
import { Type, Image as ImageIcon, Edit3, Film, Grid, DollarSign, Loader2, Download } from 'lucide-react';

// Reusable Red Title Block - Updated for Red Background with Black Text
const SectionTitle: React.FC<{ title: string, sub: string }> = ({ title, sub }) => (
  <div className="mb-6 inline-block">
    <h2 className="bg-mr-red text-black px-4 py-2 text-lg font-zongyi tracking-wider shadow-md">
      {title} <span className="text-xs font-sans opacity-80 ml-1 text-slate-900">{sub}</span>
    </h2>
  </div>
);

function App() {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [loading, setLoading] = useState(false);
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  
  // Shared States
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  
  // Image Creative States
  const [activeTab, setActiveTab] = useState<'single'|'dual'>('single');
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);

  // Animation States
  const [animMode, setAnimMode] = useState<'text'|'image'|'firstlast'>('text');
  const [animLastFrame, setAnimLastFrame] = useState<string | null>(null);

  // Cost States
  const [costMode, setCostMode] = useState<'new'|'renovation'>('new');
  const [costData, setCostData] = useState<any>({}); // Form data
  const [costResult, setCostResult] = useState<any>(null);

  const addToGallery = (type: 'image' | 'video' | 'text', content: string, promptText: string) => {
    setGeneratedItems(prev => [{
      id: Date.now().toString(),
      type,
      content: type === 'text' ? undefined : content, // For text result (cost), content might be the JSON string
      url: type === 'text' ? undefined : content,
      timestamp: Date.now(),
      prompt: promptText
    }, ...prev]);
  };

  const handleTextCreative = async () => {
    if (!prompt) return;
    setLoading(true);
    setResult(null);
    try {
      const url = await generateImageFromText(prompt, aspectRatio);
      setResult(url);
      addToGallery('image', url, prompt);
    } catch (e) {
      alert("Generation failed. Please check API Key or Quota.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageCreative = async () => {
    if (!prompt) { alert("Please enter a prompt"); return; }
    setLoading(true);
    setResult(null);
    try {
      const images = [];
      if (activeTab === 'single' && img1) images.push(img1);
      if (activeTab === 'dual') {
        if (img1) images.push(img1);
        if (img2) images.push(img2);
      }

      if (images.length === 0) {
        alert("Please upload or draw an image");
        setLoading(false);
        return;
      }

      const url = await generateCreativeImage(prompt, images);
      setResult(url);
      addToGallery('image', url, prompt);
    } catch (e) {
       alert("Generation failed.");
       console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageEdit = async () => {
    if (!img1 || !prompt) { alert("Image and prompt required"); return; }
    setLoading(true);
    setResult(null);
    try {
      // Using img1 (from upload/draw) as base
      const url = await editImage(img1, prompt);
      setResult(url);
      addToGallery('image', url, prompt);
    } catch (e) {
      alert("Edit failed.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAnimation = async () => {
    if (!prompt) { alert("Prompt required"); return; }
    setLoading(true);
    setResult(null);
    try {
      let url;
      if (animMode === 'text') {
        url = await generateVideo(prompt);
      } else if (animMode === 'image') {
        if (!img1) throw new Error("Start image required");
        url = await generateVideo(prompt, img1);
      } else {
        if (!img1 || !animLastFrame) throw new Error("Start and End frames required");
        url = await generateVideo(prompt, img1, animLastFrame);
      }
      setResult(url);
      addToGallery('video', url, prompt);
    } catch (e) {
      alert("Video generation failed. Please ensure you have a paid project selected via the key selector.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCostAnalysis = async () => {
    setLoading(true);
    setCostResult(null);
    try {
      let constructionPrompt = "";
      if (costMode === 'new') {
        constructionPrompt = `Perform a cost analysis for a NEW building with: 
        Above ground: ${costData.above || 0} sqm. 
        Under ground: ${costData.under || 0} sqm.
        Floors: ${costData.floors || 1}.
        Structure: ${costData.structure || 'Concrete'}.
        Facade: ${costData.facade || 'Glass'}.`;
      } else {
        constructionPrompt = `Perform a renovation cost estimate based on standard market rates for: ${costData.renovationDesc || 'General renovation'}`;
      }
      
      const jsonStr = await analyzeCost(constructionPrompt);
      try {
         const data = JSON.parse(jsonStr);
         setCostResult(data);
         addToGallery('text', JSON.stringify(data), constructionPrompt);
      } catch (e) {
        setCostResult({ summary: "Error parsing data", breakdown: [] });
      }
    } catch (e) {
      alert("Analysis failed");
    } finally {
      setLoading(false);
    }
  };

  // Reset function for navigating back
  const goHome = () => {
    setCurrentView(ViewState.DASHBOARD);
    setResult(null);
    setPrompt('');
    setImg1(null);
    setImg2(null);
    setCostResult(null);
  };

  // --- Render Methods for each Module ---

  const renderTextCreative = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="文字创意" sub="Text Creative" />
        <textarea
          className="w-full border-2 border-slate-300 p-4 rounded-lg focus:border-mr-red focus:ring-0 h-32"
          placeholder="Describe your architectural vision..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <div className="space-y-2">
          <label className="font-zongyi block">图幅比例 Aspect Ratio</label>
          <div className="flex flex-wrap gap-2">
            {Object.values(AspectRatio).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-4 py-2 rounded border ${aspectRatio === ratio ? 'bg-slate-800 text-white' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
              >
                {ratio}
              </button>
            ))}
          </div>
        </div>
        <button
          onClick={handleTextCreative}
          disabled={loading}
          className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 transition-colors flex justify-center items-center"
        >
          {loading ? <Loader2 className="animate-spin mr-2" /> : null}
          生成 Generate
        </button>
      </div>
      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px]">
        {result ? (
          <img src={result} alt="Generated" className="max-w-full max-h-full rounded shadow-lg" />
        ) : (
          <div className="text-slate-400 font-zongyi">Preview Area</div>
        )}
      </div>
    </div>
  );

  const renderImageCreative = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="图片创意" sub="Image Creative" />
        <div className="flex border-b border-slate-200">
          <button onClick={() => setActiveTab('single')} className={`px-6 py-3 font-zongyi ${activeTab === 'single' ? 'text-mr-red border-b-2 border-mr-red' : 'text-slate-500'}`}>单图创意 Single</button>
          <button onClick={() => setActiveTab('dual')} className={`px-6 py-3 font-zongyi ${activeTab === 'dual' ? 'text-mr-red border-b-2 border-mr-red' : 'text-slate-500'}`}>双图创意 Dual</button>
        </div>

        {activeTab === 'single' ? (
          <DrawingCanvas label="Draw or Upload Source" onImageChange={setImg1} allowDrawing={true} />
        ) : (
          <div className="grid grid-cols-2 gap-4">
             <DrawingCanvas label="Image 1" onImageChange={setImg1} allowDrawing={false} />
             <DrawingCanvas label="Image 2" onImageChange={setImg2} allowDrawing={false} />
          </div>
        )}

        <textarea
          className="w-full border-2 border-slate-300 p-4 rounded-lg h-24"
          placeholder="Describe how to transform the image(s)..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        
        <button onClick={handleImageCreative} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
           {loading ? <Loader2 className="animate-spin mr-2" /> : "生成 Generate"}
        </button>
      </div>
      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px]">
        {result ? <img src={result} alt="Result" className="max-w-full max-h-full rounded shadow-lg" /> : <span className="text-slate-400 font-zongyi">Result</span>}
      </div>
    </div>
  );

  const renderImageEdit = () => (
     <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="图片编辑" sub="Image Edit" />
        <p className="text-sm text-slate-500">Upload an image and describe what to change. You can draw on it to indicate the area implicitly.</p>
        <DrawingCanvas label="Source Image & Mark Area" onImageChange={setImg1} allowDrawing={true} />
        <textarea
          className="w-full border-2 border-slate-300 p-4 rounded-lg h-24"
          placeholder="Example: Change the marked roof to a green garden roof..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={handleImageEdit} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
           {loading ? <Loader2 className="animate-spin mr-2" /> : "编辑 Edit"}
        </button>
      </div>
      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px]">
        {result ? <img src={result} alt="Result" className="max-w-full max-h-full rounded shadow-lg" /> : <span className="text-slate-400 font-zongyi">Result</span>}
      </div>
    </div>
  );

  const renderAnimation = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="动画生成" sub="Animation Generation" />
        <div className="flex flex-wrap gap-2 mb-4">
           <button onClick={() => setAnimMode('text')} className={`px-3 py-1 rounded text-sm border ${animMode === 'text' ? 'bg-mr-red text-white' : 'bg-white'}`}>Text-to-Video</button>
           <button onClick={() => setAnimMode('image')} className={`px-3 py-1 rounded text-sm border ${animMode === 'image' ? 'bg-mr-red text-white' : 'bg-white'}`}>Image-to-Video</button>
           <button onClick={() => setAnimMode('firstlast')} className={`px-3 py-1 rounded text-sm border ${animMode === 'firstlast' ? 'bg-mr-red text-white' : 'bg-white'}`}>First/Last Frame</button>
        </div>

        {animMode !== 'text' && (
             <DrawingCanvas label="Start Frame" onImageChange={setImg1} allowDrawing={false} />
        )}
        {animMode === 'firstlast' && (
             <DrawingCanvas label="End Frame" onImageChange={setAnimLastFrame} allowDrawing={false} />
        )}

        <textarea
          className="w-full border-2 border-slate-300 p-4 rounded-lg h-24"
          placeholder="Describe the motion..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <button onClick={handleAnimation} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
           {loading ? <Loader2 className="animate-spin mr-2" /> : "生成 Animation"}
        </button>
      </div>
       <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px]">
        {result ? (
          <video src={result} controls autoPlay loop className="max-w-full max-h-full rounded shadow-lg" />
        ) : (
          <span className="text-slate-400 font-zongyi">Video Preview</span>
        )}
      </div>
    </div>
  );

  const renderCostAnalysis = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="造价分析" sub="Cost Analysis" />
        <div className="flex gap-4 mb-4">
           <button onClick={() => setCostMode('new')} className={`flex-1 py-2 border rounded ${costMode === 'new' ? 'bg-slate-800 text-white' : 'bg-white'}`}>New Construction</button>
           <button onClick={() => setCostMode('renovation')} className={`flex-1 py-2 border rounded ${costMode === 'renovation' ? 'bg-slate-800 text-white' : 'bg-white'}`}>Renovation</button>
        </div>

        {costMode === 'new' ? (
          <div className="grid grid-cols-2 gap-4">
             <input type="number" placeholder="Above Ground Area (sqm)" className="p-2 border rounded" onChange={(e) => setCostData({...costData, above: e.target.value})} />
             <input type="number" placeholder="Under Ground Area (sqm)" className="p-2 border rounded" onChange={(e) => setCostData({...costData, under: e.target.value})} />
             <input type="number" placeholder="Floors" className="p-2 border rounded" onChange={(e) => setCostData({...costData, floors: e.target.value})} />
             <select className="p-2 border rounded" onChange={(e) => setCostData({...costData, structure: e.target.value})}>
               <option value="Concrete">Concrete Frame</option>
               <option value="Steel">Steel Structure</option>
               <option value="Wood">Wood</option>
             </select>
             <input type="text" placeholder="Facade Material" className="col-span-2 p-2 border rounded" onChange={(e) => setCostData({...costData, facade: e.target.value})} />
          </div>
        ) : (
          <textarea 
            placeholder="Describe renovation requirements (e.g., remove wall, new flooring 50sqm...)"
            className="w-full border rounded p-2 h-32"
            onChange={(e) => setCostData({...costData, renovationDesc: e.target.value})}
          />
        )}

        <button onClick={handleCostAnalysis} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
           {loading ? <Loader2 className="animate-spin mr-2" /> : "分析 Analyze"}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-sm overflow-auto max-h-[600px]">
        {costResult ? (
          <div className="space-y-4">
             <h3 className="font-bold text-xl mb-2">Cost Breakdown</h3>
             <p className="text-slate-600 italic">{costResult.summary}</p>
             <div className="text-2xl font-zongyi text-mr-red text-right mb-4">
               Total: {costResult.totalEstimatedCost}
             </div>
             <table className="w-full text-sm text-left">
               <thead className="bg-slate-100">
                 <tr>
                   <th className="p-2">Item</th>
                   <th className="p-2">Cost</th>
                   <th className="p-2">Remark</th>
                 </tr>
               </thead>
               <tbody>
                 {costResult.breakdown?.map((item: any, i: number) => (
                   <tr key={i} className="border-b">
                     <td className="p-2 font-medium">{item.item}</td>
                     <td className="p-2 text-mr-red">{item.cost}</td>
                     <td className="p-2 text-slate-500">{item.remark}</td>
                   </tr>
                 ))}
               </tbody>
             </table>
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-400">Analysis Report will appear here</div>
        )}
      </div>
    </div>
  );

  const renderGallery = () => (
    <div className="space-y-6">
      <SectionTitle title="生成图片库" sub="Generated Gallery" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {generatedItems.map((item) => (
          <div key={item.id} className="group relative bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            {item.type === 'video' ? (
              <video src={item.url} className="w-full h-48 object-cover bg-black" />
            ) : item.type === 'text' ? (
              <div className="w-full h-48 p-4 text-xs overflow-hidden bg-slate-50 text-slate-600">
                {item.prompt}
              </div>
            ) : (
              <img src={item.url} alt="Gen" className="w-full h-48 object-cover" />
            )}
            <div className="p-3">
              <p className="text-xs text-slate-500 truncate">{item.prompt}</p>
              <p className="text-[10px] text-slate-400 mt-1">{new Date(item.timestamp).toLocaleTimeString()}</p>
            </div>
            {item.url && (
              <a 
                href={item.url} 
                download={`generated-${item.id}.${item.type === 'video' ? 'mp4' : 'png'}`}
                className="absolute top-2 right-2 p-2 bg-white/90 rounded-full shadow opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="w-4 h-4 text-slate-700" />
              </a>
            )}
          </div>
        ))}
        {generatedItems.length === 0 && (
          <div className="col-span-full text-center py-20 text-slate-400">
            No generated items yet. Start creating!
          </div>
        )}
      </div>
    </div>
  );

  if (currentView === ViewState.DASHBOARD) {
    return <CircularDashboard onNavigate={setCurrentView} />;
  }

  return (
    <ModuleLayout
      title={
        currentView === ViewState.TEXT_CREATIVE ? '文字创意 Text Creative' :
        currentView === ViewState.IMAGE_CREATIVE ? '图片创意 Image Creative' :
        currentView === ViewState.IMAGE_EDIT ? '图片编辑 Image Edit' :
        currentView === ViewState.ANIMATION ? '动画生成 Animation' :
        currentView === ViewState.COST_ANALYSIS ? '造价分析 Cost Analysis' :
        '生成图片库 Gallery'
      }
      icon={
        currentView === ViewState.TEXT_CREATIVE ? <Type /> :
        currentView === ViewState.IMAGE_CREATIVE ? <ImageIcon /> :
        currentView === ViewState.IMAGE_EDIT ? <Edit3 /> :
        currentView === ViewState.ANIMATION ? <Film /> :
        currentView === ViewState.COST_ANALYSIS ? <DollarSign /> :
        <Grid />
      }
      onBack={goHome}
    >
      {currentView === ViewState.TEXT_CREATIVE && renderTextCreative()}
      {currentView === ViewState.IMAGE_CREATIVE && renderImageCreative()}
      {currentView === ViewState.IMAGE_EDIT && renderImageEdit()}
      {currentView === ViewState.ANIMATION && renderAnimation()}
      {currentView === ViewState.COST_ANALYSIS && renderCostAnalysis()}
      {currentView === ViewState.GALLERY && renderGallery()}
    </ModuleLayout>
  );
}

export default App;