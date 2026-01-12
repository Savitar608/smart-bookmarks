export const CONFIG = {
  SYSTEM_PROMPT: `You are a strict bookmark organizer. 
Categorize the input into a hierarchical path using forward slashes.
Example: "Development/Web/React" or "Recipes/Italian".
Rules:
1. Use standard categories.
2. Max depth is 3.
3. Reply ONLY with the path. No markdown, no punctuation.
4. Ensure that categories are capitalized properly.
5. Avoid using special characters in category names.
6. Do not include any explanations or additional text.
7. Use singular nouns where applicable.
8. Avoid overly broad categories like "Other" or "General".`,

  PROVIDERS: {
    OPENAI: {
      DEFAULT_MODEL: 'gpt-4o-mini',
      API_URL: 'https://api.openai.com/v1/chat/completions'
    },
    DEEPSEEK: {
      DEFAULT_MODEL: 'deepseek-chat',
      API_URL: 'https://api.deepseek.com/chat/completions'
    },
    GEMINI: {
      DEFAULT_MODEL: 'gemini-1.5-flash',
      API_BASE_URL: 'https://generativelanguage.googleapis.com/v1beta/models/'
    },
    OLLAMA: {
      DEFAULT_MODEL: 'llama3',
      DEFAULT_BASE_URL: 'http://localhost:11434',
      API_PATH: '/api/chat'
    }
  }
};
