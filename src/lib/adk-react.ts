import { useState, useCallback } from 'react';

export function useAgentSession(config: any) {
  const [messages, setMessages] = useState<any[]>([]);

  const sendMessage = useCallback(async (text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, mode: 'sports_market' })
      });
      // Mock stream consumption
      const textResponse = "Operator: Here is the live data.";
      setMessages(prev => [...prev, { role: 'agent', content: textResponse }]);
    } catch (e) {
      console.error(e);
    }
  }, []);

  return { messages, sendMessage };
}
