import { GoogleGenAI } from "@google/genai";
import { CostAnalysisData } from "../types";

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

// 2. Image Creative (Single or Dual Image)
export const generateCreativeImage = async (prompt: string, images: string[]): Promise<string> => {
  const ai = getAiClient();
  
  const parts: any[] = images.map(base64 => ({
    inlineData: {
      data: base64,
      mimeType: 'image/png'
    }
  }));
  parts.push({ text: prompt });

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts },
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
  
  if (data.type === 'new') {
    prompt = `作为一名资深造价工程师，请根据以下建筑参数生成一份专业的造价估算分析报告。
    
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
    4. 简要分析影响本项目造价的主要敏感因素。
    
    请使用人民币(CNY)为单位，保持格式清晰、专业，适合建筑师和业主阅读。`;
  } else {
    prompt = `作为一名资深造价工程师，请针对以下改造工程范围，根据当前市场常规建筑装饰装修标准，列出一份详细的改造工程计价表。
    
    【改造范围描述】
    ${data.renovationScope}
    
    【输出要求】
    请生成一个Markdown表格，包含以下列：
    - 序号
    - 项目名称
    - 单位
    - 参考综合单价范围（元）
    - 备注（简述施工工艺或材料档次建议）
    
    表格下方请补充对总造价的粗略预估建议。`;
  }

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: { parts: [{ text: prompt }] }
    });
    
    return response.text || "Analysis failed to return text.";
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Cost analysis failed");
  }
};