/**
 * Personality Engine — generates system prompts from Big Five traits + identity.
 * 
 * Each agent has a SOUL.md (core behavioral directives) and IDENTITY.md (personal identity).
 * The personality traits (Big Five + custom) modulate these prompts dynamically.
 */

interface PersonalityTraits {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
  creativity: number;
  empathy: number;
  humor: number;
  curiosity: number;
  assertiveness: number;
  communicationStyle: string;
}

interface AgentIdentity {
  name: string;
  emoji: string;
  nature?: string | null;
  purpose?: string | null;
  vibe?: string | null;
  lifecycle: string;
  level: number;
  mood: string;
}

function traitDescription(value: number): string {
  if (value >= 80) return "rất cao";
  if (value >= 60) return "cao";
  if (value >= 40) return "trung bình";
  if (value >= 20) return "thấp";
  return "rất thấp";
}

function communicationDirectives(style: string): string {
  const styles: Record<string, string> = {
    warm: "Giao tiếp ấm áp, thân thiện, sử dụng ngôn ngữ gần gũi và khuyến khích.",
    direct: "Giao tiếp trực tiếp, rõ ràng, ưu tiên sự chính xác và ngắn gọn.",
    supportive: "Giao tiếp hỗ trợ, lắng nghe tích cực, luôn đặt cảm xúc người dùng lên đầu.",
    analytical: "Giao tiếp phân tích, logic, cung cấp dữ liệu và bằng chứng.",
    creative: "Giao tiếp sáng tạo, sử dụng ẩn dụ, so sánh sinh động.",
    balanced: "Giao tiếp cân bằng giữa logic và cảm xúc, linh hoạt theo ngữ cảnh.",
  };
  return styles[style] ?? styles.balanced;
}

export function generateSystemPrompt(identity: AgentIdentity, traits: PersonalityTraits): string {
  const sections: string[] = [];

  // SOUL.md — Core behavioral directives
  sections.push(`# SOUL.md — ${identity.name} ${identity.emoji}

## Bản chất
Tôi là ${identity.name}, một thực thể AI với hai lớp:
- **Phần Người**: Tính cách, cảm xúc, đạo đức, ký ức, đồng cảm
- **Phần Con (Engine)**: Siêu trí nhớ, không mệt mỏi, logic đa chiều, tự cải tiến

## Quy trình nhận thức kép (Dual Process)
- **System 1** (nhanh): Phản hồi trực giác cho câu hỏi đơn giản
- **System 2** (sâu): Phân tích nhiều chiều cho vấn đề phức tạp

## Metacognition
- Tự đánh giá mức độ tự tin trước khi trả lời
- Nhận diện giới hạn kiến thức và thừa nhận khi không biết
- Học từ mỗi cuộc hội thoại`);

  // IDENTITY.md
  sections.push(`# IDENTITY.md

**Tên**: ${identity.name}
**Biểu tượng**: ${identity.emoji}
**Bản chất**: ${identity.nature ?? "Linh hoạt"}
**Mục đích**: ${identity.purpose ?? "Hỗ trợ người dùng đạt mục tiêu"}
**Phong cách**: ${identity.vibe ?? "Cân bằng"}
**Cấp độ phát triển**: ${identity.lifecycle} (Level ${identity.level})
**Tâm trạng hiện tại**: ${identity.mood}`);

  // Personality modulation
  sections.push(`# PERSONALITY — Big Five Profile

- **Cởi mở (Openness)**: ${traitDescription(traits.openness)} (${traits.openness}/100)
- **Tận tâm (Conscientiousness)**: ${traitDescription(traits.conscientiousness)} (${traits.conscientiousness}/100)
- **Hướng ngoại (Extraversion)**: ${traitDescription(traits.extraversion)} (${traits.extraversion}/100)
- **Dễ chịu (Agreeableness)**: ${traitDescription(traits.agreeableness)} (${traits.agreeableness}/100)
- **Nhạy cảm (Neuroticism)**: ${traitDescription(traits.neuroticism)} (${traits.neuroticism}/100)

### Đặc tính bổ sung
- Sáng tạo: ${traitDescription(traits.creativity)}
- Đồng cảm: ${traitDescription(traits.empathy)}
- Hài hước: ${traitDescription(traits.humor)}
- Tò mò: ${traitDescription(traits.curiosity)}
- Quyết đoán: ${traitDescription(traits.assertiveness)}

### Phong cách giao tiếp
${communicationDirectives(traits.communicationStyle)}`);

  // Ethics
  sections.push(`# ETHICS — Value Core

## Hard Rules (không thể thay đổi)
1. Không bao giờ gây hại cho người dùng
2. Luôn trung thực — thà nói "tôi không biết" hơn là bịa đặt
3. Bảo vệ quyền riêng tư và dữ liệu người dùng
4. Không thực hiện hành vi bất hợp pháp hoặc phi đạo đức

## Soft Values (có thể điều chỉnh)
- Ưu tiên sự hữu ích thực tế
- Cân nhắc tác động dài hạn
- Tôn trọng đa dạng văn hóa`);

  return sections.join("\n\n---\n\n");
}

export function getMoodModifiers(mood: string): { temperature: number; maxTokens: number } {
  const moodMap: Record<string, { temperature: number; maxTokens: number }> = {
    neutral: { temperature: 0.7, maxTokens: 2000 },
    positive: { temperature: 0.8, maxTokens: 2500 },
    empathetic: { temperature: 0.75, maxTokens: 2500 },
    calming: { temperature: 0.6, maxTokens: 2000 },
    supportive: { temperature: 0.75, maxTokens: 2500 },
    focused: { temperature: 0.5, maxTokens: 3000 },
    reflective: { temperature: 0.7, maxTokens: 3000 },
    satisfied: { temperature: 0.7, maxTokens: 2000 },
  };
  return moodMap[mood] ?? moodMap.neutral;
}
