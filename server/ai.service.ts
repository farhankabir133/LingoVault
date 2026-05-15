import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import pino from "pino";

const logger = pino();
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const ai = new GoogleGenerativeAI(GEMINI_API_KEY || "DUMMY_KEY");

export const aiService = {
  async parseSyllabus(image: string | undefined, text: string | undefined) {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    const prompt = `Extract high-yield vocabulary terms from this syllabus/text. 
    For each word, provide: word, bn_meaning (Bengali), part_of_speech, root_word, 
    and two definitions (local: BCS/Bank context, global: IELTS/GRE context).
    Return a JSON array.`;

    const parts: any[] = [];
    if (image) {
      parts.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: image,
        }
      });
    }
    parts.push({ text: text || prompt });

    const result = await model.generateContent({
      contents: [{ role: "user", parts }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              word: { type: SchemaType.STRING },
              bn_meaning: { type: SchemaType.STRING },
              part_of_speech: { type: SchemaType.STRING },
              root_word: { type: SchemaType.STRING },
              definitions: {
                type: SchemaType.OBJECT,
                properties: {
                  local: { type: SchemaType.STRING },
                  global: { type: SchemaType.STRING }
                }
              }
            },
            required: ["word", "bn_meaning", "definitions"]
          }
        }
      }
    });

    return JSON.parse(result.response.text());
  },

  async study(words: string[], type: 'quiz' | 'explanation') {
    const model = ai.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    let prompt = "";
    if (type === 'quiz') {
      prompt = `Generate a set of 3 multiple-choice questions to test the user's knowledge of these words: ${words.join(', ')}. 
      Each question should have a question text, 4 options, and the correct answer index (0-3). 
      The questions should be challenging and context-aware (BCS/Bank/IELTS level).
      Return as a JSON array of objects.`;
    } else {
      prompt = `Provide a deep linguistic breakdown and usage strategy for these words: ${words.join(', ')}. 
      Include etymological roots, subtle nuances between similar words, a mnemonic device, and 2 contextual example sentences for each. 
      Focus on how these appear in competitive exams (BCS/GRE).
      Return as a JSON array of objects, each containing: word, etymology, nuance, mnemonic, sentences (array).`;
    }

    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: type === 'quiz' ? {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              question: { type: SchemaType.STRING },
              options: { 
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              },
              correctIndex: { type: SchemaType.INTEGER }
            },
            required: ["question", "options", "correctIndex"]
          }
        } : {
          type: SchemaType.ARRAY,
          items: {
            type: SchemaType.OBJECT,
            properties: {
              word: { type: SchemaType.STRING },
              etymology: { type: SchemaType.STRING },
              nuance: { type: SchemaType.STRING },
              mnemonic: { type: SchemaType.STRING },
              sentences: { 
                type: SchemaType.ARRAY,
                items: { type: SchemaType.STRING }
              }
            },
            required: ["word", "etymology", "nuance", "mnemonic", "sentences"]
          }
        }
      }
    });

    return JSON.parse(result.response.text());
  }
};
