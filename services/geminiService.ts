import { GoogleGenAI } from "@google/genai";
import { CostAnalysisData } from "../types";

const getAiClient = () => {
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 1. Text to Image (Switched to Flash Image for standard access)
export const generateImageFromText = async (prompt: string, aspectRatio: string): Promise<string> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        // imageSize is not supported on flash-image
      }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
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

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts },
    // imageSize not supported
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

// 3. Image Edit (Instruction based)
export const editImage = async (base64Image: string, prompt: string): Promise<string> => {
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: prompt }
      ]
    },
    // imageSize not supported
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

// 4. Cost Analysis
export const generateCostAnalysis = async (data: CostAnalysisData): Promise<string> => {
  const ai = getAiClient();
  let prompt = "";
  
  if (data.type === 'new') {
    prompt = `作为一名资深造价工程师，请根据以下建筑参数生成一份专业的造价估算分析报告：
    
    [项目参数]
    - 地上建筑面积：${data.aboveGroundArea} 平方米
    - 地下建筑面积：${data.undergroundArea} 平方米
    - 建筑层数：${data.floors} 层
    - 建筑结构体系：${data.structure}
    - 建筑立面材料：${data.facade}
    
    [输出要求]
    1. 请估算项目总造价范围。
    2. 提供单方造价指标（元/平方米）。
    3. 列出主要分部分项工程的费用估算表（如：土建、装饰、安装等）。
    4. 简要分析影响该项目造价的主要因素。
    
    请使用人民币(CNY)为单位，保持格式清晰专业。`;
  } else {
    prompt = `作为一名资深造价工程师，请针对以下改造工程范围，根据常规建筑装饰装修标准，列出一份详细的改造工程计价表：
    
    [改造范围描述]
    ${data.renovationScope}
    
    [输出要求]
    请以表格形式列出建议的计价清单，包含：
    - 项目名称
    - 单位
    - 参考综合单价范围（人民币）
    - 备注（简述施工工艺或材料档次建议）
    
    请确保内容符合当前市场常规标准。`;
  }

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [{ text: prompt }] }
  });
  
  return response.text || "Analysis failed";
};