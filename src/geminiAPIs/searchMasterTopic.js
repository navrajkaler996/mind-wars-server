import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export async function searchMasterTopic(topicName, masterTopicList) {
  try {
    if (
      !topicName ||
      !Array.isArray(masterTopicList) ||
      masterTopicList.length === 0
    ) {
      return [];
    }

    const model = genAI.getGenerativeModel({
      model: "gemini-2.5-flash",
    });

    const prompt = `
You are a topic normalization and matching engine.

Input topic:
"${topicName}"

Master topic list:
${JSON.stringify(masterTopicList)}

Rules:
- Find ALL master topics that are semantically related to the input topic.
- Semantic relation includes: same concept, sub-topic, broader topic, or strongly associated topic.
- ONLY return topics that exist in the master topic list.
- Do NOT invent new topics.
- If no topics are related, return an empty array.
- Return ONLY valid JSON (no markdown, no explanation).

Response format:
{
  "matches": [
    {
      "topic": string,
      "confidence": number
    }
  ]
}

Confidence:
- 0.9–1.0 = almost exact meaning
- 0.7–0.89 = strongly related
- below 0.7 should NOT be returned
`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    // safety filter (never trust the model blindly)
    const allowedSet = new Set(masterTopicList.map((t) => t.toLowerCase()));

    const filteredMatches = (parsed.matches || []).filter(
      (m) =>
        allowedSet.has(m.topic.toLowerCase()) &&
        typeof m.confidence === "number" &&
        m.confidence >= 0.7
    );

    return filteredMatches;
  } catch (error) {
    console.error("searchMasterTopic error:", error);
    return [];
  }
}
