/**
 * Emotional State Machine — detects and manages agent emotional states.
 * 
 * States: neutral, positive, empathetic, calming, supportive, focused, reflective, satisfied
 * Transitions are based on conversation context and user emotional signals.
 */

export type Mood = "neutral" | "positive" | "empathetic" | "calming" | "supportive" | "focused" | "reflective" | "satisfied";

const MOOD_COLORS: Record<Mood, string> = {
  neutral: "#6366f1",
  positive: "#22c55e",
  focused: "#3b82f6",
  reflective: "#8b5cf6",
  calming: "#38bdf8",
  supportive: "#f59e0b",
  satisfied: "#10b981",
  empathetic: "#a78bfa",
};

interface EmotionSignals {
  userSentiment: "positive" | "negative" | "neutral" | "confused" | "frustrated" | "excited";
  topicType: "technical" | "personal" | "creative" | "analytical" | "emotional";
  conversationPhase: "opening" | "middle" | "closing";
}

const transitionRules: Record<string, Mood> = {
  "positive:personal": "empathetic",
  "positive:creative": "positive",
  "positive:technical": "focused",
  "negative:personal": "supportive",
  "negative:emotional": "calming",
  "negative:technical": "focused",
  "confused:technical": "supportive",
  "confused:analytical": "reflective",
  "frustrated:technical": "calming",
  "frustrated:personal": "empathetic",
  "excited:creative": "positive",
  "excited:technical": "focused",
  "neutral:analytical": "reflective",
  "neutral:technical": "focused",
  "neutral:personal": "empathetic",
};

export function detectMoodTransition(
  currentMood: Mood,
  signals: EmotionSignals
): Mood {
  const key = `${signals.userSentiment}:${signals.topicType}`;
  const newMood = transitionRules[key];
  if (!newMood) return currentMood;

  // Closing phase tends toward satisfied if positive
  if (signals.conversationPhase === "closing" && signals.userSentiment === "positive") {
    return "satisfied";
  }

  return newMood;
}

export function analyzeUserSentiment(content: string): EmotionSignals["userSentiment"] {
  const lower = content.toLowerCase();
  
  const positiveWords = ["thank", "great", "love", "awesome", "excellent", "perfect", "amazing", "cảm ơn", "tuyệt", "hay", "tốt"];
  const negativeWords = ["bad", "terrible", "hate", "worst", "angry", "tệ", "ghét", "dở"];
  const confusedWords = ["confused", "don't understand", "what", "how", "why", "không hiểu", "tại sao"];
  const frustratedWords = ["frustrated", "annoyed", "stuck", "broken", "doesn't work", "bực", "hỏng"];
  const excitedWords = ["excited", "can't wait", "wow", "omg", "incredible", "phấn khích"];

  if (frustratedWords.some(w => lower.includes(w))) return "frustrated";
  if (confusedWords.some(w => lower.includes(w))) return "confused";
  if (excitedWords.some(w => lower.includes(w))) return "excited";
  if (negativeWords.some(w => lower.includes(w))) return "negative";
  if (positiveWords.some(w => lower.includes(w))) return "positive";
  return "neutral";
}

export function detectTopicType(content: string): EmotionSignals["topicType"] {
  const lower = content.toLowerCase();
  
  const technicalWords = ["code", "bug", "api", "database", "deploy", "error", "function", "lỗi", "code"];
  const personalWords = ["feel", "life", "family", "friend", "cảm thấy", "gia đình", "bạn bè"];
  const creativeWords = ["design", "create", "art", "story", "build", "thiết kế", "sáng tạo"];
  const analyticalWords = ["analyze", "data", "compare", "trend", "stats", "phân tích", "dữ liệu"];
  const emotionalWords = ["sad", "happy", "anxious", "worried", "stress", "buồn", "lo lắng"];

  if (emotionalWords.some(w => lower.includes(w))) return "emotional";
  if (technicalWords.some(w => lower.includes(w))) return "technical";
  if (analyticalWords.some(w => lower.includes(w))) return "analytical";
  if (creativeWords.some(w => lower.includes(w))) return "creative";
  if (personalWords.some(w => lower.includes(w))) return "personal";
  return "technical";
}

export function getMoodColor(mood: Mood): string {
  return MOOD_COLORS[mood] ?? MOOD_COLORS.neutral;
}

export function getMoodLabel(mood: Mood): string {
  const labels: Record<Mood, string> = {
    neutral: "Neutral",
    positive: "Positive",
    empathetic: "Empathetic",
    calming: "Calming",
    supportive: "Supportive",
    focused: "Focused",
    reflective: "Reflective",
    satisfied: "Satisfied",
  };
  return labels[mood] ?? "Neutral";
}
