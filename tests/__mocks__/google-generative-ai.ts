// tests/__mocks__/google-generative-ai.ts
// Mock for @google/generative-ai package when not installed

export class GoogleGenerativeAI {
  constructor(_apiKey: string) {}

  getGenerativeModel(_options: { model: string }) {
    return {
      generateContent: async (_parts: any[]) => ({
        response: {
          text: () =>
            JSON.stringify({
              components: [],
              brandObservations: 'Mock response',
            }),
        },
      }),
    };
  }
}
