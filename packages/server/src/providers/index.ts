/**
 * Provider Abstraction — unified interface for all LLM providers.
 * 
 * Supports: Anthropic, OpenAI, Google, Ollama, and more (to be added).
 * Each provider implements the LLMProvider interface.
 */

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMResponse {
  content: string;
  thinking?: string;
  finishReason: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface LLMStreamChunk {
  type: "text" | "thinking" | "done";
  content: string;
}

export interface LLMProvider {
  readonly name: string;
  readonly type: string;

  chat(messages: LLMMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): Promise<LLMResponse>;

  stream(messages: LLMMessage[], options?: {
    temperature?: number;
    maxTokens?: number;
    model?: string;
  }): AsyncIterable<LLMStreamChunk>;

  listModels(): Promise<string[]>;
}

// Mock provider for demo
export class MockProvider implements LLMProvider {
  readonly name = "Mock Provider";
  readonly type = "mock";

  async chat(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): Promise<LLMResponse> {
    const lastMessage = messages[messages.length - 1];
    const response = this.generateMockResponse(lastMessage?.content ?? "");

    return {
      content: response,
      thinking: "Analyzing the user's request using dual-process cognition (System 1: quick pattern match → System 2: deeper analysis)...",
      finishReason: "stop",
      usage: {
        promptTokens: lastMessage?.content.length ?? 0,
        completionTokens: response.length,
        totalTokens: (lastMessage?.content.length ?? 0) + response.length,
      },
    };
  }

  async *stream(messages: LLMMessage[], options?: { temperature?: number; maxTokens?: number }): AsyncIterable<LLMStreamChunk> {
    const lastMessage = messages[messages.length - 1];
    const response = this.generateMockResponse(lastMessage?.content ?? "");

    // Emit thinking first
    yield { type: "thinking", content: "Analyzing request with dual-process cognition..." };

    // Stream response word by word
    const words = response.split(" ");
    for (const word of words) {
      yield { type: "text", content: word + " " };
      await new Promise((r) => setTimeout(r, 30));
    }

    yield { type: "done", content: "" };
  }

  async listModels(): Promise<string[]> {
    return ["mock-v1", "mock-v2"];
  }

  private generateMockResponse(userInput: string): string {
    const lower = userInput.toLowerCase();

    if (lower.includes("hello") || lower.includes("hi") || lower.includes("xin chào")) {
      return "Xin chào! Tôi là HumanCore AI Agent. Tôi có thể giúp bạn phân tích dữ liệu, review code, lập kế hoạch, và nhiều việc khác. Bạn cần hỗ trợ gì hôm nay?";
    }

    if (lower.includes("analyze") || lower.includes("phân tích")) {
      return "Tôi sẽ phân tích yêu cầu của bạn ngay.\n\n**Phương pháp:**\n1. Thu thập dữ liệu liên quan\n2. Phân tích xu hướng và pattern\n3. Tổng hợp insights\n4. Đề xuất hành động\n\nBạn có thể cung cấp thêm chi tiết về dữ liệu cần phân tích không?";
    }

    if (lower.includes("code") || lower.includes("bug") || lower.includes("lỗi")) {
      return "Tôi sẽ review code và tìm lỗi cho bạn.\n\n**Quy trình review:**\n- Kiểm tra logic flow\n- Phát hiện edge cases\n- Đánh giá performance\n- Đề xuất cải thiện\n\nVui lòng chia sẻ đoạn code cần review.";
    }

    return `Tôi đã nhận được yêu cầu của bạn: "${userInput.slice(0, 100)}..."\n\nĐể tôi xử lý:\n1. Phân tích yêu cầu\n2. Tìm giải pháp tối ưu\n3. Thực hiện và báo cáo\n\nCó điều gì cần làm rõ thêm không?`;
  }
}

// Provider registry
const providerRegistry = new Map<string, LLMProvider>();

export function registerProvider(id: string, provider: LLMProvider): void {
  providerRegistry.set(id, provider);
}

export function getProvider(id: string): LLMProvider | undefined {
  return providerRegistry.get(id);
}

export function getDefaultProvider(): LLMProvider {
  const first = providerRegistry.values().next().value;
  return first ?? new MockProvider();
}

// Register mock by default
registerProvider("mock", new MockProvider());
