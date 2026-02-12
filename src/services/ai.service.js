const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({});

const generateAIResponse = async (content) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: content,
    });
    return response.text;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateAIResponse,
};
