import React, { useState, useEffect, useRef } from 'react';
import { ViewState, AspectRatio, GeneratedItem, CostAnalysisData } from './types';
import CircularDashboard from './components/CircularDashboard';
import ModuleLayout from './components/ModuleLayout';
import DrawingCanvas from './components/DrawingCanvas';
import { 
  generateImageFromText, 
  generateCreativeImage, 
  editImage, 
  generateCostAnalysis,
  generateVideoFromText,
  generateVideoFromImage,
  generateVideoFromStartEnd,
  extendVideo,
  generate3DViewFromText,
  generate3DViewFromImage,
  edit3DModelView,
  sendChatMessage,
  ChatMessage
} from './services/geminiService';
import { Type, Image as ImageIcon, Edit3, Grid, Loader2, Download, Calculator, Key, AlertTriangle, ArrowRightCircle, Plus, X, Layers, Film, PlayCircle, StepForward, Box, Cuboid, Upload, MessageSquare, Send, Trash2, User, Bot, Paperclip } from 'lucide-react';

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
  const [loadingMessage, setLoadingMessage] = useState('');
  const [generatedItems, setGeneratedItems] = useState<GeneratedItem[]>([]);
  
  // API Key State
  const [isKeyValid, setIsKeyValid] = useState(true);
  const [needsKeySelection, setNeedsKeySelection] = useState(false);

  // --- 1. TEXT CREATIVE STATE ---
  const [textCreativeTab, setTextCreativeTab] = useState<'image' | 'chat'>('image');
  // Text to Image
  const [textPrompt, setTextPrompt] = useState('');
  const [textResult, setTextResult] = useState<string | null>(null);
  const [textAspectRatio, setTextAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  // Chat (Consultation)
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatImage, setChatImage] = useState<string | null>(null); // For preview and upload
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // --- 2. IMAGE CREATIVE STATE ---
  const [creativePrompt, setCreativePrompt] = useState('');
  const [creativeResult, setCreativeResult] = useState<string | null>(null);
  const [creativeTab, setCreativeTab] = useState<'single'|'multi'>('single');
  const [creativeAspectRatio, setCreativeAspectRatio] = useState<AspectRatio>(AspectRatio.SQUARE);
  const [creativeSingleImg, setCreativeSingleImg] = useState<string | null>(null);
  const [creativeMultiImages, setCreativeMultiImages] = useState<{id: string, data: string | null}[]>([
    { id: 'init-1', data: null },
    { id: 'init-2', data: null }
  ]);

  // --- 3. IMAGE EDIT STATE ---
  const [editPrompt, setEditPrompt] = useState('');
  const [editResult, setEditResult] = useState<string | null>(null);
  const [editInputImg, setEditInputImg] = useState<string | null>(null);

  // --- 4. ANIMATION STATE ---
  const [animPrompt, setAnimPrompt] = useState('');
  const [animTab, setAnimTab] = useState<'text' | 'image' | 'frames' | 'edit'>('text');
  const [videoStartImg, setVideoStartImg] = useState<string | null>(null);
  const [videoEndImg, setVideoEndImg] = useState<string | null>(null);
  const [videoResultUrl, setVideoResultUrl] = useState<string | null>(null);
  const [lastVideoOperation, setLastVideoOperation] = useState<any>(null);

  // --- 5. 3D MODEL STATE ---
  const [threeDPrompt, setThreeDPrompt] = useState('');
  const [threeDResult, setThreeDResult] = useState<string | null>(null);
  const [threeDTab, setThreeDTab] = useState<'text' | 'image' | 'edit'>('text');
  const [threeDInputImg, setThreeDInputImg] = useState<string | null>(null);

  // --- 6. COST ANALYSIS STATE ---
  const [costData, setCostData] = useState<CostAnalysisData>({
    type: 'new',
    aboveGroundArea: '',
    undergroundArea: '',
    floors: '',
    structure: '',
    facade: '',
    renovationScope: '',
    images: []
  });
  const [costResult, setCostResult] = useState<string | null>(null);

  // Check API Key on Mount
  useEffect(() => {
    const checkKey = async () => {
      if (process.env.API_KEY) {
        setIsKeyValid(true);
        return;
      }
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
        setIsKeyValid(false);
      }
    };
    checkKey();
  }, []);

  useEffect(() => {
    if (textCreativeTab === 'chat' && chatBottomRef.current) {
      chatBottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, textCreativeTab]);

  const handleSelectKey = async () => {
    if (window.aistudio) {
      try {
        await window.aistudio.openSelectKey();
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
    if (msg.includes("API_KEY")) {
        setIsKeyValid(false);
    } else {
        alert(`Error: ${msg}`);
    }
  };

  const addToGallery = (type: 'image' | 'text' | 'video', content: string, promptText: string) => {
    setGeneratedItems(prev => [{
      id: Date.now().toString(),
      type,
      content: type === 'text' ? content : undefined,
      url: type !== 'text' ? content : undefined,
      timestamp: Date.now(),
      prompt: promptText
    }, ...prev]);
  };

  // --- Handlers ---

  const handleTextCreative = async () => {
    if (!textPrompt) return;
    setLoading(true);
    setTextResult(null);
    try {
      const url = await generateImageFromText(textPrompt, textAspectRatio);
      setTextResult(url);
      addToGallery('image', url, textPrompt);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChatImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setChatImage(ev.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSendChat = async () => {
    if (!chatInput.trim() && !chatImage) return;
    
    const newMessageText = chatInput.trim();
    // Strip data prefix for service call, but keep full string for local display if needed
    // The service expects raw base64.
    const imageBase64 = chatImage ? chatImage.split(',')[1] : undefined;
    
    // For local display state, we need to match the type structure.
    // The image stored in state should be raw base64 to match ChatMessage interface if we want consistency,
    // OR we change ChatMessage interface. 
    // The service uses `image` as raw base64. Let's store raw base64 in the history state.
    
    const newMessage: ChatMessage = { 
        role: 'user', 
        text: newMessageText,
        image: imageBase64 
    };
    
    const updatedHistory = [...chatMessages, newMessage];
    
    setChatMessages(updatedHistory);
    setChatInput('');
    setChatImage(null);
    setLoading(true);
    
    try {
      // Pass the previous history (before this new message) + the new message details to the service
      // Or simply pass the OLD history and the NEW parameters.
      // My service implementation appends the new message to history.
      const responseText = await sendChatMessage(chatMessages, newMessageText, imageBase64);
      setChatMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (e) {
      handleError(e);
      // Optional: remove the failed message from UI
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    if (confirm("Are you sure you want to clear the chat history?")) {
      setChatMessages([]);
    }
  };

  const handleImageCreative = async () => {
    if (!creativePrompt) { alert("Please enter a prompt"); return; }
    setLoading(true);
    setCreativeResult(null);
    try {
      const images: string[] = [];
      
      if (creativeTab === 'single') {
        if (creativeSingleImg) images.push(creativeSingleImg);
      } else {
        creativeMultiImages.forEach(item => {
          if (item.data) images.push(item.data);
        });
      }

      if (images.length === 0) {
        alert("Please upload or draw at least one image");
        setLoading(false);
        return;
      }

      const url = await generateCreativeImage(creativePrompt, images, creativeAspectRatio);
      setCreativeResult(url);
      addToGallery('image', url, creativePrompt);
    } catch (e) {
       handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handleImageEdit = async () => {
    if (!editInputImg || !editPrompt) { alert("Image and prompt required"); return; }
    setLoading(true);
    setEditResult(null);
    try {
      const url = await editImage(editInputImg, editPrompt);
      setEditResult(url);
      addToGallery('image', url, editPrompt);
    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
    }
  };

  const handle3DModelGenerate = async () => {
    if (!threeDPrompt) { alert("Please enter a description"); return; }
    setLoading(true);
    setThreeDResult(null);
    try {
        let url;
        if (threeDTab === 'text') {
            url = await generate3DViewFromText(threeDPrompt);
        } else if (threeDTab === 'image') {
            if (!threeDInputImg) { alert("Input image required"); setLoading(false); return; }
            url = await generate3DViewFromImage(threeDInputImg, threeDPrompt);
        } else {
             if (!threeDInputImg) { alert("Input image to edit required"); setLoading(false); return; }
             url = await edit3DModelView(threeDInputImg, threeDPrompt);
        }
        setThreeDResult(url);
        addToGallery('image', url, `3D Model View: ${threeDPrompt}`);
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

  const handleCostImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newImages: string[] = [];
      const files = Array.from(e.target.files);
      let loadedCount = 0;

      files.forEach((file: File) => {
        const reader = new FileReader();
        reader.onload = (ev) => {
           const result = ev.target?.result as string;
           const base64 = result.split(',')[1];
           newImages.push(base64);
           loadedCount++;
           if (loadedCount === files.length) {
               setCostData(prev => ({
                   ...prev,
                   images: [...(prev.images || []), ...newImages]
               }));
           }
        };
        reader.readAsDataURL(file);
      });
    }
  };

  const removeCostImage = (index: number) => {
      setCostData(prev => {
          const newImages = [...(prev.images || [])];
          newImages.splice(index, 1);
          return { ...prev, images: newImages };
      });
  };

  const handleAnimationGenerate = async () => {
    if (!animPrompt) { alert("Please enter a prompt"); return; }
    
    setLoading(true);
    setVideoResultUrl(null);
    setLoadingMessage('Initializing Veo video model...');

    try {
      let result;
      
      if (animTab === 'text') {
        setLoadingMessage('Generating video from text... This may take a moment.');
        result = await generateVideoFromText(animPrompt);
      } 
      else if (animTab === 'image') {
        if (!videoStartImg) { alert("Start image required"); setLoading(false); return; }
        setLoadingMessage('Animating your image...');
        result = await generateVideoFromImage(videoStartImg, animPrompt);
      } 
      else if (animTab === 'frames') {
        if (!videoStartImg || !videoEndImg) { alert("Start and End images required"); setLoading(false); return; }
        setLoadingMessage('Interpolating frames between start and end images...');
        result = await generateVideoFromStartEnd(videoStartImg, videoEndImg, animPrompt);
      }
      else if (animTab === 'edit') {
        if (!lastVideoOperation) { alert("No previous video to extend. Generate one first."); setLoading(false); return; }
        setLoadingMessage('Extending video timeline...');
        result = await extendVideo(lastVideoOperation, animPrompt);
      }

      if (result) {
        setVideoResultUrl(result.videoUrl);
        setLastVideoOperation(result.operation);
        addToGallery('video', result.videoUrl, animPrompt);
      }

    } catch (e) {
      handleError(e);
    } finally {
      setLoading(false);
      setLoadingMessage('');
    }
  };

  // Reset function for navigating back - ONLY CHANGES VIEW, PRESERVES STATE
  const goHome = () => {
    setCurrentView(ViewState.DASHBOARD);
  };

  // Multi Image Helpers
  const updateMultiImage = (id: string, base64: string | null) => {
    setCreativeMultiImages(prev => prev.map(item => item.id === id ? { ...item, data: base64 } : item));
  };

  const addMultiImageSlot = () => {
    setCreativeMultiImages(prev => [...prev, { id: Date.now().toString() + Math.random(), data: null }]);
  };

  const removeMultiImageSlot = (id: string) => {
    setCreativeMultiImages(prev => prev.filter(item => item.id !== id));
  };

  // --- Render Methods for each Module ---

  const renderTextCreative = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <SectionTitle title="文字创意" sub="Text Creative" />
        <div className="flex bg-slate-100 rounded-lg p-1 border border-slate-200">
            <button
                onClick={() => setTextCreativeTab('image')}
                className={`px-4 py-2 rounded-md text-sm font-zongyi transition-all ${textCreativeTab === 'image' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
            >
                文生图<br/><span className="text-[10px] font-sans">Text to Image</span>
            </button>
            <button
                onClick={() => setTextCreativeTab('chat')}
                className={`px-4 py-2 rounded-md text-sm font-zongyi transition-all ${textCreativeTab === 'chat' ? 'bg-white shadow text-mr-red' : 'text-slate-500 hover:text-slate-700'}`}
            >
                文字咨询<br/><span className="text-[10px] font-sans">Text Consultation</span>
            </button>
        </div>
      </div>

      {textCreativeTab === 'image' ? (
        <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-6">
                <textarea
                className="w-full border-2 border-slate-300 p-4 rounded-lg focus:border-mr-red focus:ring-0 h-32"
                placeholder="Describe your architectural vision..."
                value={textPrompt}
                onChange={(e) => setTextPrompt(e.target.value)}
                />
                <div className="space-y-2">
                <label className="font-zongyi block">图幅比例 Aspect Ratio</label>
                <div className="flex flex-wrap gap-2">
                    {Object.values(AspectRatio).map((ratio) => (
                    <button
                        key={ratio}
                        onClick={() => setTextAspectRatio(ratio)}
                        className={`px-4 py-2 rounded border ${textAspectRatio === ratio ? 'bg-slate-800 text-white' : 'bg-white border-slate-300 hover:bg-slate-50'}`}
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
            <div className="flex flex-col gap-4">
                <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px] relative overflow-hidden group">
                    {textResult ? (
                    <>
                        <img src={textResult} alt="Generated" className="max-w-full max-h-full rounded shadow-lg" />
                        <a 
                        href={textResult} 
                        download={`text-creative-${Date.now()}.png`}
                        className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Download Image"
                        >
                        <Download className="w-5 h-5" />
                        </a>
                    </>
                    ) : (
                    <div className="text-slate-400 font-zongyi">Preview Area</div>
                    )}
                </div>
                
                {textResult && (
                    <div className="space-y-4">
                        <div className="flex gap-4">
                            <a
                                href={textResult}
                                download={`text-creative-${Date.now()}.png`}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                            >
                                <Download className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                                <span className="font-zongyi text-sm">下载图片<br/><span className="text-[10px] font-sans">Download</span></span>
                            </a>
                            <button 
                                onClick={() => {
                                    const base64 = textResult.replace(/^data:image\/\w+;base64,/, '');
                                    setCreativeSingleImg(base64);
                                    setCreativeTab('single');
                                    setCreativeResult(null); // Clear previous result for fresh start
                                    setCurrentView(ViewState.IMAGE_CREATIVE);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                            >
                                <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                                <span className="font-zongyi text-sm">发送至图片创意<br/><span className="text-[10px] font-sans">Send to Creative</span></span>
                                <ArrowRightCircle className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                            <button 
                                onClick={() => {
                                    const base64 = textResult.replace(/^data:image\/\w+;base64,/, '');
                                    setEditInputImg(base64);
                                    setEditResult(null); // Clear previous result
                                    setCurrentView(ViewState.IMAGE_EDIT);
                                }}
                                className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                            >
                                <Edit3 className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                                <span className="font-zongyi text-sm">发送至图片编辑<br/><span className="text-[10px] font-sans">Send to Edit</span></span>
                                <ArrowRightCircle className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      ) : (
        <div className="flex flex-col h-[600px] bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {chatMessages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 opacity-50">
                        <MessageSquare className="w-16 h-16 mb-4" />
                        <p className="font-zongyi text-lg">开始咨询 Start Consultation</p>
                        <p className="text-xs">Upload floor plans or ask Mr. Just Right about design ideas.</p>
                    </div>
                )}
                {chatMessages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[80%] rounded-2xl px-4 py-3 shadow-sm ${msg.role === 'user' ? 'bg-mr-red text-white rounded-br-none' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none'}`}>
                            <div className="flex items-center gap-2 mb-1 opacity-80 text-xs font-bold uppercase tracking-wider">
                                {msg.role === 'user' ? <User className="w-3 h-3"/> : <Bot className="w-3 h-3"/>}
                                {msg.role === 'user' ? 'You' : 'Mr. Just Right'}
                            </div>
                            {msg.image && (
                                <div className="mb-2 mt-1">
                                    <img src={`data:image/png;base64,${msg.image}`} alt="Uploaded" className="max-w-full h-auto rounded-lg max-h-48 border border-white/20" />
                                </div>
                            )}
                            <div className="whitespace-pre-wrap text-sm leading-relaxed">{msg.text}</div>
                        </div>
                    </div>
                ))}
                {loading && (
                     <div className="flex justify-start">
                         <div className="bg-white text-slate-500 border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm flex items-center gap-2">
                             <Loader2 className="w-4 h-4 animate-spin" />
                             <span className="text-xs font-medium">Thinking...</span>
                         </div>
                     </div>
                )}
                <div ref={chatBottomRef} />
            </div>
            
            <div className="bg-white border-t border-slate-200 p-4">
                {chatImage && (
                    <div className="mb-2 relative inline-block">
                        <img src={chatImage} alt="Preview" className="h-20 w-auto rounded border border-slate-200 shadow-sm" />
                        <button 
                            onClick={() => setChatImage(null)}
                            className="absolute -top-2 -right-2 bg-slate-800 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    </div>
                )}
                <div className="flex gap-2">
                    <button 
                        onClick={clearChat}
                        className="p-3 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Clear Chat"
                    >
                        <Trash2 className="w-5 h-5" />
                    </button>
                    
                    <label className="p-3 text-slate-400 hover:text-mr-red hover:bg-red-50 rounded-lg transition-colors cursor-pointer" title="Upload Image">
                         <Paperclip className="w-5 h-5" />
                         <input type="file" accept="image/*" className="hidden" onChange={handleChatImageUpload} />
                    </label>

                    <input 
                        type="text" 
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendChat()}
                        placeholder="Ask about design, materials, or upload a plan..."
                        className="flex-1 border border-slate-300 rounded-lg px-4 focus:outline-none focus:border-mr-red focus:ring-1 focus:ring-mr-red"
                    />
                    <button 
                        onClick={handleSendChat}
                        disabled={loading || (!chatInput.trim() && !chatImage)}
                        className="bg-mr-red text-white p-3 rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="w-5 h-5" />
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );

  const renderImageCreative = () => (
    <div className="space-y-6">
        <div>
            <SectionTitle title="图片创意" sub="Image Creative" />
            <div className="flex border-b border-slate-200 mt-4">
            <button onClick={() => setCreativeTab('single')} className={`px-6 py-3 font-zongyi ${creativeTab === 'single' ? 'text-mr-red border-b-2 border-mr-red' : 'text-slate-500'}`}>单图创意 Single</button>
            <button onClick={() => setCreativeTab('multi')} className={`px-6 py-3 font-zongyi ${creativeTab === 'multi' ? 'text-mr-red border-b-2 border-mr-red' : 'text-slate-500'}`}>多图创意 Multi</button>
            </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
                {creativeTab === 'single' ? (
                <DrawingCanvas label="绘图 / 上传 Draw or Upload" onImageChange={setCreativeSingleImg} allowDrawing={true} initialImage={creativeSingleImg} />
                ) : (
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                    {creativeMultiImages.map((item, index) => (
                        <div key={item.id} className="relative group">
                            <DrawingCanvas 
                                label={`Image ${index + 1}`} 
                                onImageChange={(base64) => updateMultiImage(item.id, base64)} 
                                allowDrawing={false} 
                                initialImage={item.data} 
                            />
                            {creativeMultiImages.length > 1 && (
                                <button 
                                    onClick={() => removeMultiImageSlot(item.id)}
                                    className="absolute -top-1 -right-1 z-10 p-1 bg-white rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 border border-slate-200 shadow-sm"
                                    title="Remove Image"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                    
                    <button 
                        onClick={addMultiImageSlot}
                        className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-lg h-full min-h-[200px] text-slate-400 hover:text-mr-red hover:border-mr-red hover:bg-red-50 transition-all gap-2 aspect-square"
                        title="Add Another Image"
                    >
                        <Plus className="w-8 h-8" />
                        <span className="font-zongyi text-sm">Add Image</span>
                    </button>
                    </div>
                </div>
                )}

                <textarea
                className="w-full border-2 border-slate-300 p-4 rounded-lg h-24"
                placeholder={creativeTab === 'single' ? "Describe how to transform the image..." : "Describe how to combine or transform these images..."}
                value={creativePrompt}
                onChange={(e) => setCreativePrompt(e.target.value)}
                />

                <div className="space-y-2">
                    <label className="font-zongyi block text-sm text-slate-700">生成比例 Aspect Ratio</label>
                    <div className="flex flex-wrap gap-2">
                        {Object.values(AspectRatio).map((ratio) => (
                        <button
                            key={ratio}
                            onClick={() => setCreativeAspectRatio(ratio)}
                            className={`px-3 py-1.5 text-xs rounded border transition-colors ${creativeAspectRatio === ratio ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                        >
                            {ratio}
                        </button>
                        ))}
                    </div>
                </div>
                
                <button onClick={handleImageCreative} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "生成 Generate"}
                </button>
            </div>
            
            <div className="space-y-4">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap justify-between items-end gap-2 h-[40px]">
                        <label className="font-zongyi text-lg text-slate-700">生成结果 Result</label>
                    </div>
                    <div className="aspect-square w-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group shadow-inner">
                        {creativeResult ? (
                        <>
                            <img src={creativeResult} alt="Result" className="w-full h-full object-contain" />
                            <a 
                            href={creativeResult} 
                            download={`image-creative-${Date.now()}.png`}
                            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Download Image"
                            >
                            <Download className="w-5 h-5" />
                            </a>
                        </>
                        ) : <span className="text-slate-400 font-zongyi">Result Preview</span>}
                    </div>
                </div>
                
                {creativeResult && (
                    <div className="flex flex-col sm:flex-row gap-3">
                        <a
                            href={creativeResult}
                            download={`image-creative-${Date.now()}.png`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                        >
                            <Download className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                            <span className="font-zongyi text-sm">下载图片<br/><span className="text-[10px] font-sans">Download</span></span>
                        </a>
                        
                        <button
                            onClick={() => {
                                const base64 = creativeResult.replace(/^data:image\/\w+;base64,/, '');
                                setCreativeMultiImages(prev => {
                                    const emptyIndex = prev.findIndex(item => item.data === null);
                                    if (emptyIndex !== -1) {
                                        const newArr = [...prev];
                                        newArr[emptyIndex] = { ...newArr[emptyIndex], data: base64 };
                                        return newArr;
                                    }
                                    return [...prev, { id: Date.now().toString(), data: base64 }];
                                });
                                setCreativeTab('multi');
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                        >
                            <Layers className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                            <span className="font-zongyi text-sm">发送至多图<br/><span className="text-[10px] font-sans">Send to Multi</span></span>
                            <ArrowRightCircle className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>

                        <button
                            onClick={() => {
                                const base64 = creativeResult.replace(/^data:image\/\w+;base64,/, '');
                                setEditInputImg(base64);
                                setEditResult(null); // Clear previous edit result
                                setCurrentView(ViewState.IMAGE_EDIT);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                        >
                            <Edit3 className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                            <span className="font-zongyi text-sm">发送至图片编辑<br/><span className="text-[10px] font-sans">Send to Edit</span></span>
                            <ArrowRightCircle className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  const renderImageEdit = () => (
     <div className="space-y-6">
        <div>
            <SectionTitle title="图片编辑" sub="Image Edit" />
            <p className="text-sm text-slate-500 mt-2">Upload an image and describe what to change. You can draw on it to indicate the area implicitly.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 items-start">
            <div className="space-y-6">
                <DrawingCanvas label="原图 Source Image" onImageChange={setEditInputImg} allowDrawing={true} initialImage={editInputImg} />
                <textarea
                className="w-full border-2 border-slate-300 p-4 rounded-lg h-24"
                placeholder="Example: Change the marked roof to a green garden roof..."
                value={editPrompt}
                onChange={(e) => setEditPrompt(e.target.value)}
                />
                <button onClick={handleImageEdit} disabled={loading} className="w-full bg-mr-red text-white py-3 rounded-lg font-zongyi text-lg hover:bg-red-700 flex justify-center">
                {loading ? <Loader2 className="animate-spin mr-2" /> : "编辑 Edit"}
                </button>
            </div>
            
            <div className="space-y-4">
                 <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap justify-between items-end gap-2 h-[40px]">
                        <label className="font-zongyi text-lg text-slate-700">编辑结果 Result</label>
                    </div>
                     <div className="aspect-square w-full bg-slate-50 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center relative overflow-hidden group shadow-inner">
                        {editResult ? (
                        <>
                            <img src={editResult} alt="Result" className="w-full h-full object-contain" />
                            <a 
                            href={editResult} 
                            download={`image-edit-${Date.now()}.png`}
                            className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                            title="Download Image"
                            >
                            <Download className="w-5 h-5" />
                            </a>
                        </>
                        ) : <span className="text-slate-400 font-zongyi">Result Preview</span>}
                    </div>
                </div>

                {editResult && (
                    <div className="flex gap-4">
                        <a
                            href={editResult}
                            download={`image-edit-${Date.now()}.png`}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                        >
                            <Download className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                            <span className="font-zongyi text-sm">下载图片<br/><span className="text-[10px] font-sans">Download</span></span>
                        </a>
                        <button 
                            onClick={() => {
                                const base64 = editResult.replace(/^data:image\/\w+;base64,/, '');
                                setCreativeSingleImg(base64);
                                setCreativeTab('single');
                                setCreativeResult(null); // Clear previous result for fresh start
                                setCurrentView(ViewState.IMAGE_CREATIVE);
                            }}
                            className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-slate-50 hover:border-mr-red hover:text-mr-red transition-all group"
                        >
                            <ImageIcon className="w-5 h-5 text-slate-500 group-hover:text-mr-red" />
                            <span className="font-zongyi text-sm">发送至图片创意<br/><span className="text-[10px] font-sans">Send to Creative</span></span>
                            <ArrowRightCircle className="w-4 h-4 ml-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    </div>
  );

  const renderAnimation = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="漫游动画" sub="Roaming Animation" />
        
        <div className="flex flex-wrap border-b border-slate-200">
          <button onClick={() => setAnimTab('text')} className={`px-4 py-3 font-zongyi text-sm ${animTab === 'text' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'}`}>文字生成<br/>Text</button>
          <button onClick={() => setAnimTab('image')} className={`px-4 py-3 font-zongyi text-sm ${animTab === 'image' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'}`}>图片生成<br/>Image</button>
          <button onClick={() => setAnimTab('frames')} className={`px-4 py-3 font-zongyi text-sm ${animTab === 'frames' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'}`}>首尾帧<br/>Start/End</button>
          <button onClick={() => setAnimTab('edit')} className={`px-4 py-3 font-zongyi text-sm ${animTab === 'edit' ? 'text-purple-700 border-b-2 border-purple-700' : 'text-slate-500'}`}>动画编辑<br/>Extend</button>
        </div>

        <div className="space-y-4">
          {animTab === 'text' && (
            <p className="text-sm text-slate-500 italic">Enter a detailed prompt to generate a cinematic video.</p>
          )}

          {animTab === 'image' && (
             <DrawingCanvas label="Reference Image" onImageChange={setVideoStartImg} allowDrawing={false} initialImage={videoStartImg} />
          )}

          {animTab === 'frames' && (
             <div className="grid grid-cols-2 gap-4">
               <DrawingCanvas label="Start Frame" onImageChange={setVideoStartImg} allowDrawing={false} initialImage={videoStartImg} />
               <DrawingCanvas label="End Frame" onImageChange={setVideoEndImg} allowDrawing={false} initialImage={videoEndImg} />
             </div>
          )}

          {animTab === 'edit' && (
             <div className="p-4 bg-purple-50 rounded-lg border border-purple-100 text-purple-800 text-sm">
                {lastVideoOperation ? (
                  <p className="flex items-center gap-2"><StepForward className="w-4 h-4"/> Ready to extend previous video by 5 seconds.</p>
                ) : (
                  <p>No video generated in this session to extend yet. Please generate a video first.</p>
                )}
             </div>
          )}

          <textarea
            className="w-full border-2 border-slate-300 p-4 rounded-lg h-24 focus:border-purple-700"
            placeholder={
                animTab === 'edit' ? "Describe what happens next..." :
                "Describe the camera movement, lighting, and subject of the animation..."
            }
            value={animPrompt}
            onChange={(e) => setAnimPrompt(e.target.value)}
          />

          <button 
            onClick={handleAnimationGenerate} 
            disabled={loading || (animTab === 'edit' && !lastVideoOperation)} 
            className={`w-full text-white py-3 rounded-lg font-zongyi text-lg flex justify-center items-center gap-2 transition-colors ${loading || (animTab === 'edit' && !lastVideoOperation) ? 'bg-slate-300' : 'bg-purple-700 hover:bg-purple-800'}`}
          >
             {loading ? <Loader2 className="animate-spin" /> : <PlayCircle className="w-5 h-5" />}
             {loading ? 'Generating...' : '生成动画 Generate Video'}
          </button>
          
          {loading && loadingMessage && (
            <p className="text-center text-xs text-purple-600 animate-pulse">{loadingMessage}</p>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px] relative overflow-hidden group">
            {videoResultUrl ? (
              <video 
                src={videoResultUrl} 
                controls 
                autoPlay 
                loop 
                className="max-w-full max-h-[500px] rounded shadow-lg bg-black"
              />
            ) : (
              <div className="flex flex-col items-center text-slate-400 font-zongyi gap-2">
                 <Film className="w-8 h-8 opacity-50"/>
                 Video Preview
              </div>
            )}
        </div>

        {videoResultUrl && (
             <div className="flex gap-4">
                <a
                    href={videoResultUrl}
                    download={`animation-${Date.now()}.mp4`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-purple-50 hover:border-purple-700 hover:text-purple-700 transition-all group"
                >
                    <Download className="w-5 h-5 text-slate-500 group-hover:text-purple-700" />
                    <span className="font-zongyi text-sm">下载视频<br/><span className="text-[10px] font-sans">Download MP4</span></span>
                </a>
            </div>
        )}
      </div>
    </div>
  );

  const render3DModel = () => (
    <div className="grid md:grid-cols-2 gap-8">
      <div className="space-y-6">
        <SectionTitle title="三维模型" sub="3D Model Generation" />
        
        <div className="flex flex-wrap border-b border-slate-200">
          <button onClick={() => setThreeDTab('text')} className={`px-4 py-3 font-zongyi text-sm ${threeDTab === 'text' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}>文字生成<br/>Text to Model</button>
          <button onClick={() => setThreeDTab('image')} className={`px-4 py-3 font-zongyi text-sm ${threeDTab === 'image' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}>图片转模型<br/>Image to Model</button>
          <button onClick={() => setThreeDTab('edit')} className={`px-4 py-3 font-zongyi text-sm ${threeDTab === 'edit' ? 'text-orange-600 border-b-2 border-orange-600' : 'text-slate-500'}`}>模型编辑<br/>Model Edit</button>
        </div>

        <div className="space-y-4">
          
          {(threeDTab === 'image' || threeDTab === 'edit') && (
             <DrawingCanvas 
                label={threeDTab === 'image' ? "Reference Sketch/Image" : "Model View to Edit"} 
                onImageChange={setThreeDInputImg} 
                allowDrawing={true} 
                initialImage={threeDInputImg} 
             />
          )}

          <textarea
            className="w-full border-2 border-slate-300 p-4 rounded-lg h-24 focus:border-orange-600"
            placeholder={
                threeDTab === 'text' ? "Describe the object to model (e.g. Modern concrete villa, isometric view)..." :
                threeDTab === 'image' ? "Describe how to convert this image into a 3D model..." :
                "Describe changes to the model (e.g. Add a glass roof)..."
            }
            value={threeDPrompt}
            onChange={(e) => setThreeDPrompt(e.target.value)}
          />

          <button 
            onClick={handle3DModelGenerate} 
            disabled={loading} 
            className={`w-full text-white py-3 rounded-lg font-zongyi text-lg flex justify-center items-center gap-2 transition-colors ${loading ? 'bg-slate-300' : 'bg-orange-600 hover:bg-orange-700'}`}
          >
             {loading ? <Loader2 className="animate-spin" /> : <Box className="w-5 h-5" />}
             {loading ? 'Processing...' : '生成模型视图 Generate View'}
          </button>
          
          <p className="text-xs text-slate-400 italic text-center">
            * Generates high-fidelity isometric or perspective renders simulating 3D models.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-4">
        <div className="bg-slate-50 rounded-xl border-2 border-dashed border-slate-300 flex items-center justify-center min-h-[400px] relative overflow-hidden group">
            {threeDResult ? (
              <>
                <img src={threeDResult} alt="3D Result" className="max-w-full max-h-full rounded shadow-lg object-contain" />
                <a 
                  href={threeDResult} 
                  download={`3d-model-view-${Date.now()}.png`}
                  className="absolute top-4 right-4 p-2 bg-white/90 hover:bg-white text-slate-700 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
                  title="Download Image"
                >
                  <Download className="w-5 h-5" />
                </a>
              </>
            ) : (
              <div className="flex flex-col items-center text-slate-400 font-zongyi gap-2">
                 <Cuboid className="w-12 h-12 opacity-50"/>
                 Model View Preview
              </div>
            )}
        </div>

        {threeDResult && (
             <div className="flex gap-4">
                <a
                    href={threeDResult}
                    download={`3d-model-view-${Date.now()}.png`}
                    className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-orange-50 hover:border-orange-600 hover:text-orange-600 transition-all group"
                >
                    <Download className="w-5 h-5 text-slate-500 group-hover:text-orange-600" />
                    <span className="font-zongyi text-sm">下载视图<br/><span className="text-[10px] font-sans">Download View</span></span>
                </a>
                 <button 
                        onClick={() => {
                             const base64 = threeDResult.replace(/^data:image\/\w+;base64,/, '');
                             setThreeDInputImg(base64);
                             setThreeDTab('edit');
                             setThreeDResult(null); // Clear result to focus on edit input
                             setThreeDPrompt('');
                        }}
                        className="flex-1 flex items-center justify-center gap-2 py-3 bg-white border border-slate-300 rounded-lg shadow-sm hover:bg-orange-50 hover:border-orange-600 hover:text-orange-600 transition-all group"
                    >
                        <Edit3 className="w-5 h-5 text-slate-500 group-hover:text-orange-600" />
                        <span className="font-zongyi text-sm">编辑此模型<br/><span className="text-[10px] font-sans">Edit Model</span></span>
                    </button>
            </div>
        )}
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

        {/* Common Image Upload Section */}
        <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700 mb-1">参考图纸/现场照片 (支持多选)</label>
            <div className="flex flex-wrap gap-2">
                {costData.images && costData.images.map((img, idx) => (
                    <div key={idx} className="relative w-16 h-16 border rounded overflow-hidden group">
                        <img src={`data:image/png;base64,${img}`} alt="Upload" className="w-full h-full object-cover" />
                        <button 
                            onClick={() => removeCostImage(idx)}
                            className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                ))}
                <label className="w-16 h-16 border-2 border-dashed border-slate-300 rounded flex items-center justify-center cursor-pointer hover:border-mr-red hover:bg-red-50 text-slate-400 hover:text-mr-red transition-all">
                    <Upload className="w-6 h-6" />
                    <input type="file" multiple accept="image/*" className="hidden" onChange={handleCostImageUpload} />
                </label>
            </div>
            <p className="text-xs text-slate-400">上传平面图、立面图或现场照片可提高造价估算准确度。</p>
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
                    {/* Updated label to be more inclusive and added placeholder */}
                    <label className="block text-sm font-medium text-slate-700 mb-1">建筑层数或建筑高度</label>
                    <input type="text" className="w-full border-slate-300 rounded-md" 
                           placeholder="如：6层 或 24米"
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
      <SectionTitle title="生成库" sub="Generated Gallery" />
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {generatedItems.map((item) => (
          <div key={item.id} className="group relative bg-white rounded-lg shadow overflow-hidden border border-slate-200">
            {item.type === 'text' ? (
              <div className="w-full h-48 p-4 text-xs overflow-y-auto bg-slate-50 text-slate-600 whitespace-pre-wrap">
                <div className="font-bold mb-2 border-b pb-1">{item.prompt}</div>
                {item.content}
              </div>
            ) : item.type === 'video' ? (
              <video src={item.url} className="w-full h-48 object-cover bg-black" />
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

  // --- Main View Controller ---

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
            <div className="mt-8 text-slate-400 text-sm font-zongyi">Mr. Just Right - Architecture AI</div>
        </div>
    );
  }

  if (currentView === ViewState.DASHBOARD) {
    return <CircularDashboard onNavigate={setCurrentView} />;
  }

  return (
    <ModuleLayout
      title={
        currentView === ViewState.TEXT_CREATIVE ? '文字创意 Text Creative' :
        currentView === ViewState.IMAGE_CREATIVE ? '图片创意 Image Creative' :
        currentView === ViewState.IMAGE_EDIT ? '图片编辑 Image Edit' :
        currentView === ViewState.ANIMATION ? '漫游动画 Animation' :
        currentView === ViewState.THREED_MODEL ? '三维模型 3D Model' :
        currentView === ViewState.COST_ANALYSIS ? '造价分析 Cost Analysis' :
        '生成库 Gallery'
      }
      icon={
        currentView === ViewState.TEXT_CREATIVE ? <Type /> :
        currentView === ViewState.IMAGE_CREATIVE ? <ImageIcon /> :
        currentView === ViewState.IMAGE_EDIT ? <Edit3 /> :
        currentView === ViewState.ANIMATION ? <Film /> :
        currentView === ViewState.THREED_MODEL ? <Box /> :
        currentView === ViewState.COST_ANALYSIS ? <Calculator /> :
        <Grid />
      }
      onBack={goHome}
    >
      {currentView === ViewState.TEXT_CREATIVE && renderTextCreative()}
      {currentView === ViewState.IMAGE_CREATIVE && renderImageCreative()}
      {currentView === ViewState.IMAGE_EDIT && renderImageEdit()}
      {currentView === ViewState.ANIMATION && renderAnimation()}
      {currentView === ViewState.THREED_MODEL && render3DModel()}
      {currentView === ViewState.COST_ANALYSIS && renderCostAnalysis()}
      {currentView === ViewState.GALLERY && renderGallery()}
    </ModuleLayout>
  );
}

export default App;