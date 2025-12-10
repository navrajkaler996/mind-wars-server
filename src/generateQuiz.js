import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function generateQuiz(topic, numOfQuestions) {
  try {
    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
Generate ${numOfQuestions} multiple-choice quiz questions about "${topic}".

RETURN THE OUTPUT STRICTLY AS A RAW JSON ARRAY LIKE THIS:

[
  {
    "question": "string",
    "options": ["A", "B", "C", "D"],
    "answer": "correct option text"
  }
]

RULES:
- EXACTLY 4 options
- "answer" MUST be one of the 4 options exactly
- NO explanations
- NO extra text
- NO markdown
- ONLY return the JSON array, nothing else
`;

    const result = await model.generateContent(prompt);

    const text = result.response.text();

    const jsonTextFormatted = text.replace(/```json|```/g, "").trim();

    const parsed = JSON.parse(jsonTextFormatted);

    return parsed;
  } catch (error) {
    console.error("Gemini Error:", error);
    return [];
  }
}
