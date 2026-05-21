export class AgentEngineClient {
  constructor(config: any) {}

  async *streamChat(params: any): AsyncGenerator<any, void, unknown> {
    yield {
      content: {
        parts: [{ text: "Mock response from Vertex Agent Engine." }]
      }
    };
  }
}
