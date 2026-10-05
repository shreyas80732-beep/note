import { useState, useCallback } from 'react';

export const API = import.meta.env.VITE_API_URL || 'http://localhost:5000';

// Random ID kept in this browser. It links saved notes to this device (there are no accounts).
export function getDeviceId() {
  let id = localStorage.getItem('nc_device');
  if (!id) { id = crypto.randomUUID(); localStorage.setItem('nc_device', id); }
  return id;
}

export function useGenerateStream() {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Returns true when the whole guide was received
  const start = useCallback(async (title, uploadedText, proof) => {
    setText(''); setError(''); setLoading(true);
    try {
      const res = await fetch(`${API}/api/notes/generate-stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-device-id': getDeviceId() },
        body: JSON.stringify({ title, uploadedText, ...proof }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).message || 'Something went wrong.');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      for (;;) {
        const { value, done } = await reader.read();
        if (done) return false;
        buffer += decoder.decode(value, { stream: true });
        const events = buffer.split('\n\n');
        buffer = events.pop();
        for (const ev of events) {
          if (!ev.startsWith('data: ')) continue;
          const data = ev.slice(6);
          if (data === '[DONE]') return true;
          const msg = JSON.parse(data);
          if (msg.error) throw new Error(msg.error);
          setText((t) => t + msg.text);
        }
      }
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  return { text, loading, error, start };
}
