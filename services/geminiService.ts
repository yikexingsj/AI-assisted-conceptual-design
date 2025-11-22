import { GoogleGenAI, Type } from "@google/genai";
import { GeneratedItem } from "../types";

// Helper to ensure API key is selected for Pro/Veo models
export const ensureApiKey = async (): Promise<void> => {
  if (window.aistudio && window.aistudio.openSelectKey) {
    const hasKey = await window.aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await window.aistudio.openSelectKey();
    }
  }
};

const getAiClient = () => {
  // Always create a new client to pick up the potentially newly selected key
  return new GoogleGenAI({ apiKey: process.env.API_KEY });
};

// 1. Text to Image (Using Gemini Pro Image Preview)
export const generateImageFromText = async (prompt: string, aspectRatio: string): Promise<string> => {
  await ensureApiKey();
  const ai = getAiClient();
  
  // Map aspect ratio to supported values if necessary, or pass directly
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: "1K"
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
  // Use standard flash image for vision capabilities + generation
  // Note: For high fidelity generation based on input, gemini-3-pro-image-preview is better if supported with input images
  // but strictly speaking, simpler image-to-text-to-image flows often use flash-image.
  // However, guidelines say for "High-Quality Image Generation" use 'gemini-3-pro-image-preview'.
  await ensureApiKey();
  const ai = getAiClient();
  
  const parts: any[] = images.map(base64 => ({
    inlineData: {
      data: base64,
      mimeType: 'image/png'
    }
  }));
  parts.push({ text: prompt });

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts },
    config: {
      imageConfig: { imageSize: "1K" }
    }
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
  await ensureApiKey();
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [
        { inlineData: { data: base64Image, mimeType: 'image/png' } },
        { text: prompt } // "Change the roof to red..."
      ]
    },
    config: {
      imageConfig: { imageSize: "1K" }
    }
  });

  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  throw new Error("No image generated");
};

// 4. Animation (Veo)
export const generateVideo = async (prompt: string, imageBase64?: string, lastFrameBase64?: string): Promise<string> => {
  await ensureApiKey();
  const ai = getAiClient();
  
  // Determine config based on inputs
  const model = 'veo-3.1-fast-generate-preview';
  
  let operation;
  
  if (imageBase64 && lastFrameBase64) {
    // First and Last frame
    operation = await ai.models.generateVideos({
      model,
      prompt,
      image: { imageBytes: imageBase64, mimeType: 'image/png' },
      config: {
        lastFrame: { imageBytes: lastFrameBase64, mimeType: 'image/png' },
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } else if (imageBase64) {
    // Image to Video
    operation = await ai.models.generateVideos({
      model,
      prompt,
      image: { imageBytes: imageBase64, mimeType: 'image/png' },
      config: {
        numberOfVideos: 1,
        resolution: '720p',
        aspectRatio: '16:9'
      }
    });
  } else {
    // Text to Video
    operation = await ai.models.generateVideos({
      model,
      prompt,
      config: {
        numberOfVideos: 1,
        resolution: '1080p',
        aspectRatio: '16:9'
      }
    });
  }

  // Polling
  while (!operation.done) {
    await new Promise(resolve => setTimeout(resolve, 5000));
    operation = await ai.operations.getVideosOperation({ operation });
  }

  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  if (!downloadLink) throw new Error("Video generation failed");

  // Fetch the actual video bytes
  // Note: Guidelines say "You must append an API key when fetching from the download link."
  const videoRes = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoRes.blob();
  return URL.createObjectURL(blob);
};

// 5. Cost Analysis (Text/JSON)
export const analyzeCost = async (prompt: string): Promise<string> => {
  // Simple text tasks use gemini-2.5-flash
  const ai = getAiClient();
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      systemInstruction: "You are an expert construction cost estimator in China. Provide output in JSON format containing a breakdown of costs.",
       responseSchema: {
        type: Type.OBJECT,
        properties: {
          summary: { type: Type.STRING },
          totalEstimatedCost: { type: Type.STRING },
          breakdown: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                item: { type: Type.STRING },
                cost: { type: Type.STRING },
                unit: { type: Type.STRING },
                remark: { type: Type.STRING }
              }
            }
          }
        }
      }
    }
  });

  return response.text || "{}";
};
