import { GoogleGenAI } from "@google/genai";
import { CostAnalysisData } from "../types";

// Declare process to avoid TypeScript build errors in browser environments
declare const process: { env: any };

// Safe retrieval of API Key from environment
const getAiClient = () => {
  // Safe access to process.env
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;

  if (!apiKey) {
    // Throwing a specific error to be caught by the UI layer
    throw new Error("API_KEY is missing. Please check your Vercel Environment Variables.");
  }
  return new GoogleGenAI({ apiKey });
};

// --- Helper for Video Polling ---
async function waitForVideoOperation(operation: any, ai: GoogleGenAI): Promise<any> {
  let updatedOperation = operation;
  while (!updatedOperation.done) {
    // Wait 5 seconds before polling
    await new Promise(resolve => setTimeout(resolve, 5000));
    updatedOperation = await ai.operations.getVideosOperation({ operation: updatedOperation });
  }
  return updatedOperation;
}

async function fetchVideoBlob(uri: string): Promise<string> {
  const apiKey = (typeof process !== 'undefined' && process.env) ? process.env.API_KEY : undefined;
  if (!apiKey) throw new Error("API Key missing for video fetch");
  
  // Append key to the download link
  const response = await fetch(`${uri}&key=${apiKey}`);
  if (!response.ok) throw new Error("Failed to download video bytes");
  
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

// 1. Text to Image (Switched to Flash Image for standard access)
export const generateImageFromText = async (prompt: string, aspectRatio: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio as any,
        }
      }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("The model produced a response but no image was found. It might have been blocked by safety filters.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Image generation failed");
  }
};

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  image?: string; // base64 string
}

// 1.5 Text Consultation (Chat with Image Support)
export const sendChatMessage = async (history: ChatMessage[], message: string, image?: string): Promise<string> => {
  const ai = getAiClient();
  
  // Construct multi-turn conversation
  const contents = history.map(h => {
    const parts: any[] = [];
    if (h.image) {
      parts.push({
        inlineData: {
          data: h.image,
          mimeType: 'image/png'
        }
      });
    }
    if (h.text) {
      parts.push({ text: h.text });
    }
    return {
      role: h.role,
      parts
    };
  });

  // Add the current new message
  const currentParts: any[] = [];
  if (image) {
    currentParts.push({
      inlineData: {
        data: image,
        mimeType: 'image/png'
      }
    });
  }
  currentParts.push({ text: message });

  contents.push({
    role: 'user',
    parts: currentParts
  });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: contents,
      config: {
        systemInstruction: "You are 'Mr. Just Right' (刚刚好先生), a professional architectural design assistant. You provide concise, creative, and practical advice on architecture, interior design, and construction costs. If the user uploads an image, analyze it from an architectural or interior design perspective. Keep responses professional yet friendly.",
      }
    });
    
    return response.text || "";
  } catch (error: any) {
    console.error("Chat Error:", error);
    throw new Error(error.message || "Chat generation failed");
  }
};

// 2. Image Creative (Single or Dual Image)
export const generateCreativeImage = async (prompt: string, images: string[], aspectRatio?: string): Promise<string> => {
  const ai = getAiClient();
  
  const parts: any[] = images.map(base64 => ({
    inlineData: {
      data: base64,
      mimeType: 'image/png'
    }
  }));
  parts.push({ text: prompt });

  const config: any = {};
  if (aspectRatio) {
    config.imageConfig = { aspectRatio };
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
      config: Object.keys(config).length > 0 ? config : undefined
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No image generated. Please try a different prompt.");
  } catch (error: any) {
     console.error("Gemini API Error:", error);
     throw new Error(error.message || "Creative image generation failed");
  }
};

// 3. Image Edit (Instruction based)
export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          { inlineData: { data: base64Image, mimeType: 'image/png' } },
          { text: prompt }
        ]
      },
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited image generated.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Image editing failed");
  }
};

// 4. Cost Analysis
export const generateCostAnalysis = async (data: CostAnalysisData): Promise<string> => {
  const ai = getAiClient();
  let prompt = "";
  
  const hasImages = data.images && data.images.length > 0;
  const imageContext = hasImages ? "请同时结合提供的图纸/现场照片进行分析，识别图纸中的设计复杂度、材料档次或现场施工条件，以修正造价估算。" : "";

  if (data.type === 'new') {
    prompt = `作为一名资深造价工程师，请根据以下建筑参数${hasImages ? "及附带的参考图纸" : ""}生成一份专业的造价估算分析报告。
    
    ${imageContext}

    【项目参数】
    - 地上建筑面积：${data.aboveGroundArea} 平方米
    - 地下建筑面积：${data.undergroundArea} 平方米
    - 建筑层数：${data.floors} 层
    - 建筑结构体系：${data.structure}
    - 建筑立面材料：${data.facade}
    
    【分析要求】
    1. 估算项目总造价范围（万元）。
    2. 提供单方造价指标（元/平方米）。
    3. 列出主要分部分项工程（土建、装饰、安装、措施费等）的费用占比和估算金额。
    4. 简要分析影响本项目造价的主要敏感因素${hasImages ? "（请特别提及从图像中观察到的具体影响因素）" : ""}。
    
    请使用人民币(CNY)为单位，保持格式清晰、专业，适合建筑师和业主阅读。`;
  } else {
    prompt = `作为一名资深造价工程师，请针对以下改造工程范围，${hasImages ? "结合现场/设计图片" : ""}根据当前市场常规建筑装饰装修标准，列出一份详细的改造工程计价表。
    
    ${imageContext}

    【改造范围描述】
    ${data.renovationScope}
    
    【输出要求】
    请生成一个Markdown表格，包含以下列：
    - 序号
    - 项目名称
    - 单位
    - 参考综合单价范围（元）
    - 备注（简述施工工艺或材料档次建议，若从图片中识别出具体风格或难点请注明）
    
    表格下方请补充对总造价的粗略预估建议。`;
  }

  const parts: any[] = [];
  
  // Add images if present
  if (data.images && data.images.length > 0) {
    data.images.forEach(img => {
        parts.push({
            inlineData: {
                data: img,
                mimeType: 'image/png'
            }
        });
    });
  }

  // Add text prompt
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts }
    });
    
    return response.text || "Analysis failed to return text.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Cost analysis failed");
  }
};

// 5. Video Generation Functions

// Text to Video
export const generateVideoFromText = async (prompt: string): Promise<{videoUrl: string, operation: any}> => {
  const ai = getAiClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9'
    }
  });
  
  operation = await waitForVideoOperation(operation, ai);
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation completed but no URI returned.");
  
  const videoUrl = await fetchVideoBlob(downloadLink);
  return { videoUrl, operation };
};

// Image to Video
export const generateVideoFromImage = async (image: string, prompt: string): Promise<{videoUrl: string, operation: any}> => {
  const ai = getAiClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: image,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9' // Defaulting to 16:9 for cinematic look
    }
  });

  operation = await waitForVideoOperation(operation, ai);
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation completed but no URI returned.");
  
  const videoUrl = await fetchVideoBlob(downloadLink);
  return { videoUrl, operation };
};

// Start and End Frame Video
export const generateVideoFromStartEnd = async (startImg: string, endImg: string, prompt: string): Promise<{videoUrl: string, operation: any}> => {
  const ai = getAiClient();
  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-fast-generate-preview',
    prompt: prompt,
    image: {
      imageBytes: startImg,
      mimeType: 'image/png',
    },
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9',
      lastFrame: {
        imageBytes: endImg,
        mimeType: 'image/png'
      }
    }
  });

  operation = await waitForVideoOperation(operation, ai);
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation completed but no URI returned.");
  
  const videoUrl = await fetchVideoBlob(downloadLink);
  return { videoUrl, operation };
};

// Extend Video (Animation Edit)
// Note: Can only extend 720p videos.
export const extendVideo = async (previousOperation: any, prompt: string): Promise<{videoUrl: string, operation: any}> => {
  const ai = getAiClient();
  const prevVideo = previousOperation.response?.generatedVideos?.[0]?.video;
  if (!prevVideo) throw new Error("Invalid previous video operation.");

  let operation = await ai.models.generateVideos({
    model: 'veo-3.1-generate-preview', // Must use non-fast model for extension usually? The example implies general model.
    prompt: prompt, // Mandatory for extension
    video: prevVideo,
    config: {
      numberOfVideos: 1,
      resolution: '720p',
      aspectRatio: '16:9', // Must match previous video ideally, simplifying to 16:9 assumption for this app
    }
  });

  operation = await waitForVideoOperation(operation, ai);
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video extension completed but no URI returned.");
  
  const videoUrl = await fetchVideoBlob(downloadLink);
  return { videoUrl, operation };
};

// 6. 3D Model Logic (Simulated via High-Fidelity Views)

export const generate3DViewFromText = async (prompt: string): Promise<string> => {
  const ai = getAiClient();
  // We force the prompt to be a 3D model render style
  const enhancedPrompt = `High fidelity 3D architectural clay model render of ${prompt}. Isometric view, white minimalist background, studio lighting, ambient occlusion, sharp details, architectural visualization style.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', // Fast generation for concept
      contents: { parts: [{ text: enhancedPrompt }] },
      config: { imageConfig: { aspectRatio: '1:1' } }
    });

    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No 3D view generated.");
  } catch (error: any) {
    console.error("3D Gen Error:", error);
    throw new Error(error.message || "3D generation failed");
  }
};

export const generate3DViewFromImage = async (image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  // Ask to convert input to a 3D model style
  const enhancedPrompt = `Transform this reference image into a clean 3D architectural model render. ${prompt}. Isometric view, clay or maquette style, white background, soft shadows.`;

  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [
          { inlineData: { data: image, mimeType: 'image/png' } },
          { text: enhancedPrompt }
        ]
      },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No 3D view generated from image.");
  } catch (error: any) {
    console.error("3D Gen Error:", error);
    throw new Error(error.message || "3D generation failed");
  }
};

export const edit3DModelView = async (image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  const enhancedPrompt = `Modify this 3D model render: ${prompt}. Maintain the isometric model style, clay material, and white background.`;
  
  try {
     const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { 
        parts: [
          { inlineData: { data: image, mimeType: 'image/png' } },
          { text: enhancedPrompt }
        ]
      },
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("No edited 3D view generated.");
  } catch (error: any) {
    console.error("3D Edit Error:", error);
    throw new Error(error.message || "3D edit failed");
  }
};