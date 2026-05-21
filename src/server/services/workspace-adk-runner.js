import { GoogleGenAI } from '@google/genai';

export const handleWorkspaceStream = async ({
  principal,
  userMessage,
  systemInstruction,
  res,
  firebaseClaims
}) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      res.write(`\n\n> [!ERROR]\n> **Missing Gemini API Key**\n> Configure GEMINI_API_KEY to enable workspace delegation.\n`);
      return;
    }
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const ai = (project && project !== 'gen-lang-client-0281999829') ? 
        new GoogleGenAI({ enterprise: true, project, location: process.env.GOOGLE_CLOUD_LOCATION || 'us-west2' }) :
        new GoogleGenAI({ apiKey });
    
    const chat = ai.chats.create({
      model: 'gemini-2.5-flash',
      config: {
        systemInstruction: systemInstruction,
        temperature: 0.2
      }
    });

    const result = await chat.sendMessage({ 
      message: `User Request: ${userMessage}
Please perform the requested workspace operation.`
    });
    
    res.write(result.text || '');
  } catch (error) {
    res.write(`\n\n> [!WARNING]\n> **Workspace Agent Unavailable**\n> Fault: ${error.message}\n`);
  }
};
