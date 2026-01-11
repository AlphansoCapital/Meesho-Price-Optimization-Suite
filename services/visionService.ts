import { GoogleGenAI } from "@google/genai";

export const analyzeProductImage = async (dataUrl: string): Promise<string[]> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = dataUrl.split(',')[1];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: 'Analyze this product image for an e-commerce platform. Provide 6-10 highly relevant descriptive tags (keywords) separated by commas. Focus on material, style, color, and category. Return only the tags, no other text.',
          },
        ],
      },
    });

    const text = response.text || '';
    return text.split(',')
      .map(tag => tag.trim())
      .filter(tag => tag.length > 0)
      .map(tag => tag.charAt(0).toUpperCase() + tag.slice(1));
  } catch (error) {
    console.error('Vision analysis failed:', error);
    return ['E-commerce Product', 'Batch Variation'];
  }
};

export const generateProductBackground = async (dataUrl: string, theme: string): Promise<string | null> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const base64Data = dataUrl.split(',')[1];

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: 'image/jpeg',
              data: base64Data,
            },
          },
          {
            text: `Keep the product in the foreground exactly as it is, but replace the background with a ${theme} setting. Ensure professional e-commerce lighting, high-resolution textures, and a clean commercial aesthetic.`,
          },
        ],
      },
    });

    // The model might return text along with the image, iterate to find the image part.
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return null;
  } catch (error) {
    console.error('Background generation failed:', error);
    return null;
  }
};
