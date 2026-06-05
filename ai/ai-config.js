// In a real application, consider a secure way to manage API keys.
// For this environment demo, we use a placeholder or read from env.

export const AI_CONFIG = {
  provider: "gemini",
  model: "gemini-2.5-flash",
  apiKey: import.meta.env.VITE_GEMINI_API_KEY || process.env.GEMINI_API_KEY || "PASTE_YOUR_API_KEY_HERE", // Set your key here or via env
  enabled: true
};
