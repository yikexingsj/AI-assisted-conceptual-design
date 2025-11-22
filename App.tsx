import React, { useState, useEffect } from 'react';
import { ViewState, AspectRatio, GeneratedItem, CostAnalysisData } from './types';
import CircularDashboard from './components/CircularDashboard';
import ModuleLayout from './components/ModuleLayout';
import DrawingCanvas from './components/DrawingCanvas';
import { generateImageFromText, generateCreativeImage, editImage, generateCostAnalysis } from './services/geminiService';
import { Type, Image as ImageIcon, Edit3, Grid, Loader2, Download, Calculator, Key, AlertTriangle } from 'lucide-react';

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
  
  // API Key State
  const [isKeyValid, setIsKeyValid] = useState(true);
  const [needsKeySelection, setNeedsKeySelection] = useState(false);

  // Shared States
  const [prompt, setPrompt] = useState('');
  const [result, setResult] = useState<string | null>(null);
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  
  // Image Creative States
  const [activeTab, setActiveTab] = useState<'single'|'dual'>('single');
  const [img1, setImg1] = useState<string | null>(null);
  const [img2, setImg2] = useState<string | null>(null);

  // Cost Analysis State
  const [costData, setCostData] = useState<CostAnalysisData>({
    type: 'new',
    aboveGroundArea: '',
    undergroundArea: '',
    floors: '',
    structure: '',
    facade: '',
    renovationScope: ''
  });
  const [costResult, setCostResult] = useState<string | null>(null);

  // Check API Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      // 1. If process.env.API_KEY is already set (e.g. via Vercel Env Vars), we are good.
      if (process.env.API_KEY) {
        setIsKeyValid(true);
        return;
      }

      // 2. If not, check if we are in an environment that supports dynamic key selection (like AI Studio / IDX)
      if (window.aistudio) {
        try {
          const hasSelected = await window.aistudio.hasSelectedApiKey();
          if (!hasSelected) {
            setNeedsKeySelection(true);
            setIsKeyValid(false);
          } else {
            setIsKeyValid(true);
          }
        } catch (e) {
          console.error("Error checking AI Studio key:", e);
          setIsKeyValid(false);
        }
      } else {
        // 3. No key and no helper -> Missing Config
        setIsKeyValid(false);
      }
    };
    checkKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
        // Assume success if no error, reload state
        setNeedsKeySelection(false);
        setIsKeyValid(true);
      } catch (e) {
        console.error("Key selection failed:", e);
      }
    }
  };

  const handleError = (e: any) => {
    console.error(e);
    const msg = e instanceof Error ? e.message : "Unknown error occurred";
    // Using a simple alert for operational errors, but key errors are handled by state
    if (msg.includes("API_KEY")) {
        setIsKeyValid(false);
    } else {
        alert(`Error: ${msg}`);
    }
  };

  const addToGallery = (type: 'image' | 'text', content: string, promptText: string) => {
    setGeneratedItems(prev => [{
      id: Date.now().toString(),
      type,
      content: type === 'text' ? content : undefined,
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
      handleError(e);
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
       handleError(e);
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
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleCostAnalysis = async () => {
    setLoading(true);
    setCostResult(null);
    try {
        const result = await generateCostAnalysis(costData);
        setCostResult(result);
        addToGallery('text', result, costData.type === 'new' ? 'New Construction Cost Analysis' : 'Renovation Cost Table');
    } catch (e) {
        handleError(e);
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

  // --- API Key Missing Screen ---
  if (!isKeyValid) {
    return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-slate-200">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Key className="w-8 h-8 text-mr-red" />
                </div>
                <h2 className="text-2xl font-zongyi text-slate-900 mb-4">Configuration Needed</h2>
                
                {needsKeySelection ? (
                    <div className="space-y-4">
                        <p className="text-slate-600 mb-6">
                            To start designing with AI, please select your Google Gemini API Key.
                        </p>
                        <button 
                            onClick={handleSelectKey}
                            className="w-full bg-mr-red text-white py-3 rounded-lg font-bold shadow hover:bg-red-700 transition-all"
                        >
                            Select API Key
                        </button>
                        <p className="text-xs text-slate-400 mt-4">
                            <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noreferrer" className="underline hover:text-mr-red">
                                Learn about billing
                            </a>
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                         <p className="text-slate-600">
                            The <code>API_KEY</code> environment variable is missing. 
                        </p>
                        <div className="bg-slate-100 p-4 rounded-lg text-left text-sm text-slate-700 border border-slate-200">
                            <p className="font-semibold mb-2 flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-orange-500"/> If you are deploying to Vercel:</p>
                            <ol className="list-decimal list-inside space-y-1 ml-1">
                                <li>Go to your Vercel Project Dashboard.</li>
                                <li>Click <strong>Settings</strong> → <strong>Environment Variables</strong>.</li>
                                <li>Add a new variable named <code>API_KEY</code>.</li>
                                <li>Paste your Google Gemini API Key as the value.</li>
                                <li>Redeploy your application.</li>
                            </ol>
                        </div>
                        <button 
                            onClick={() => window.location.reload()}
                            className="mt-4 px-6 py-2 bg-slate-900 text-white rounded hover:bg-slate-800 transition-colors"
                        >
                            I have added the key, Refresh
                        </button>
                    </div>
                )}
            </div>
            <div className="mt-8 text-slate-400 text-sm font-zongyi">Mr. Just Right - AI Design Workshop</div>
        </div>
    );
  }

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

  const renderCostAnalysis = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="造价分析" sub="Cost Analysis" />
        
        <div className="flex border-b border-slate-200">
          <button 
            onClick={() => setCostData({...costData, type: 'new'})} 
            className={`px-6 py-3 font-zongyi flex-1 ${costData.type === 'new' ? 'text-mr-red border-b-2 border-mr-red' : 'text-slate-500'}`}
          >
            新建建筑 New Build
          </button>
          <button 
            onClick={() => setCostData({...costData, type: 'renovation'})} 
            className={`px-6 py-3 font-zongyi flex-1 ${costData.type === 'renovation' ? 'text-mr-red border-b-2 border-mr-red' : 'text-slate-500'}`}
          >
            改造建筑 Renovation
          </button>
        </div>

        {costData.type === 'new' ? (
            <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">地上建筑面积 (㎡)</label>
                        <input type="text" className="w-full border-slate-300 rounded-md" 
                               value={costData.aboveGroundArea} onChange={e => setCostData({...costData, aboveGroundArea: e.target.value})} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">地下建筑面积 (㎡)</label>
                        <input type="text" className="w-full border-slate-300 rounded-md" 
                               value={costData.undergroundArea} onChange={e => setCostData({...costData, undergroundArea: e.target.value})} />
                    </div>
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">建筑层数</label>
                    <input type="text" className="w-full border-slate-300 rounded-md" 
                           value={costData.floors} onChange={e => setCostData({...costData, floors: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">建筑结构</label>
                    <input type="text" placeholder="如：钢筋混凝土框架结构" className="w-full border-slate-300 rounded-md" 
                           value={costData.structure} onChange={e => setCostData({...costData, structure: e.target.value})} />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">建筑立面材料</label>
                    <input type="text" placeholder="如：玻璃幕墙、石材" className="w-full border-slate-300 rounded-md" 
                           value={costData.facade} onChange={e => setCostData({...costData, facade: e.target.value})} />
                </div>
            </div>
        ) : (
             <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">改造范围与要求描述</label>
                    <textarea 
                        className="w-full border-slate-300 rounded-md h-48 p-3"
                        placeholder="例如：500平米办公室室内装修改造，包含拆除原有隔墙，新建玻璃隔断，铺设地毯，天花吊顶翻新..."
                        value={costData.renovationScope}
                        onChange={e => setCostData({...costData, renovationScope: e.target.value})}
                    />
                </div>
            </div>
        )}

        <button onClick={handleCostAnalysis} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
           {loading ? <Loader2 className="animate-spin mr-2" /> : "开始分析 Analyze"}
        </button>
      </div>

      <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 p-6 overflow-y-auto max-h-[600px]">
        {costResult ? (
             <div className="prose prose-slate max-w-none whitespace-pre-wrap text-sm leading-relaxed">
                {costResult}
             </div>
        ) : (
             <div className="h-full flex items-center justify-center text-slate-400 font-zongyi">
                Analysis Report Area
             </div>
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
            {item.type === 'text' ? (
              <div className="w-full h-48 p-4 text-xs overflow-y-auto bg-slate-50 text-slate-600 whitespace-pre-wrap">
                <div className="font-bold mb-2 border-b pb-1">{item.prompt}</div>
                {item.content}
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
                download={`generated-${item.id}.png`}
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
        currentView === ViewState.COST_ANALYSIS ? '造价分析 Cost Analysis' :
        '生成图片库 Gallery'
      }
      icon={
        currentView === ViewState.TEXT_CREATIVE ? <Type /> :
        currentView === ViewState.IMAGE_CREATIVE ? <ImageIcon /> :
        currentView === ViewState.IMAGE_EDIT ? <Edit3 /> :
        currentView === ViewState.COST_ANALYSIS ? <Calculator /> :
        <Grid />
      }
      onBack={goHome}
    >
      {currentView === ViewState.TEXT_CREATIVE && renderTextCreative()}
      {currentView === ViewState.IMAGE_CREATIVE && renderImageCreative()}
      {currentView === ViewState.IMAGE_EDIT && renderImageEdit()}
      {currentView === ViewState.COST_ANALYSIS && renderCostAnalysis()}
      {currentView === ViewState.GALLERY && renderGallery()}
    </ModuleLayout>
  );
}

export default App;