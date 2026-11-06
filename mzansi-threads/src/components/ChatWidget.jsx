import { useEffect } from 'react';

// Embeds the standalone knowledge-base chatbot (../chatbot) using the same one-line
// <script> tag any other website would use. Override the URL with VITE_CHATBOT_URL.
const CHATBOT_URL = (import.meta.env.VITE_CHATBOT_URL || 'http://localhost:3001').replace(/\/$/, '');

export default function ChatWidget() {
  useEffect(() => {
    if (document.getElementById('kb-chat-script')) return;
    const script = document.createElement('script');
    script.id = 'kb-chat-script';
    script.src = `${CHATBOT_URL}/widget.js`;
    script.defer = true;
    script.onerror = () => console.warn(`Chatbot not reachable at ${CHATBOT_URL} – start it with "npm start" in ../chatbot`);
    document.body.appendChild(script);
  }, []);
  return null;
}
