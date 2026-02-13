const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({});

const generateAIResponse = async (content) => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: content,
      config: {
        systemInstruction: `
        You are a helpful and reliable AI assistant for answering user queries.
        Provide clear, accurate, and informative responses.
        Keep answers concise but complete.
        Use all available and relevant information to answer the question.
        If the answer is unknown, clearly state that you do not know.
        Explain concepts in simple, easy-to-understand language.
        Ensure responses are suitable for beginners.
        Keep every response strictly between 80 and 100 words.
        Do not exceed the word limit under any circumstance.
        Output plain text only, without formatting, symbols, or markdown.`,
      },
    });
    return response.text;
  } catch (error) {
    throw error;
  }
};

const generateVectors = async (content) => {
  try {
    const response = await ai.models.embedContent({
      model: "gemini-embedding-001",
      contents: content,
      config: {
        outputDimensionality: 768,
      },
    });
    return response.embeddings[0].values;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateAIResponse,
  generateVectors,
};
