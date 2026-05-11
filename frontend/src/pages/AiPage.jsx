import { useEffect, useState, useRef } from 'react';
import { Send, ThumbsUp, ThumbsDown } from 'lucide-react';
import Layout from '../components/Layout.jsx';
import { PageHeader, Loader } from '../components/UI.jsx';
import { chat, getChatHistory, submitFeedback } from '../api/ai.js';
import { fmtDt } from '../utils/format.js';

export default function AiPage() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    getChatHistory({ limit: 50 })
      .then(({ data }) => {
        const hist = (data.data?.data || []).reverse();
        const flat = hist.flatMap((h) => [
          { id: h.id + '-q', role: 'user', content: h.question, createdAt: h.createdAt },
          { id: h.id + '-a', role: 'assistant', content: h.answer, createdAt: h.createdAt, histId: h.id, feedback: h.feedback },
        ]);
        setMessages(flat);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || sending) return;
    const question = input.trim();
    setInput('');
    setMessages((p) => [...p, { id: Date.now() + '-q', role: 'user', content: question }]);
    setSending(true);
    try {
      const { data } = await chat({ question });
      setMessages((p) => [...p, {
        id: data.data?.id + '-a',
        role: 'assistant',
        content: data.data?.answer || 'No response.',
        histId: data.data?.id,
        feedback: null,
      }]);
    } catch {
      setMessages((p) => [...p, { id: Date.now() + '-err', role: 'assistant', content: 'Error getting response. Please try again.' }]);
    }
    setSending(false);
  };

  const handleFeedback = async (histId, fb) => {
    await submitFeedback(histId, { feedback: fb });
    setMessages((p) => p.map((m) => m.histId === histId ? { ...m, feedback: fb } : m));
  };

  return (
    <Layout title="AI Assistant">
      <PageHeader title="AI Assistant" subtitle="Factory intelligence at your fingertips" />

      <div className="card card-pad chat-wrap">
        {loading ? <Loader /> : (
          <div className="chat-messages">
            {messages.length === 0 && (
              <div style={{ textAlign:'center', color:'var(--text-secondary)', padding:'40px 0' }}>
                <p style={{ fontSize:32, marginBottom:12 }}>🤖</p>
                <p>Ask me anything about your factory — production status, KPIs, inventory, and more.</p>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`msg ${msg.role}`}>
                <div className="msg-avatar" style={{ background: msg.role === 'user' ? 'var(--accent)' : 'var(--bg-card)', border:'1px solid var(--border)' }}>
                  {msg.role === 'user' ? 'U' : '🤖'}
                </div>
                <div>
                  <div className="msg-bubble">{msg.content}</div>
                  {msg.role === 'assistant' && msg.histId && (
                    <div className="flex gap-2 mt-1">
                      <button className="btn-icon" style={{ background:'none', border:'none' }} onClick={() => handleFeedback(msg.histId, 'POSITIVE')}>
                        <ThumbsUp size={13} color={msg.feedback === 'POSITIVE' ? 'var(--success)' : 'var(--text-muted)'} />
                      </button>
                      <button className="btn-icon" style={{ background:'none', border:'none' }} onClick={() => handleFeedback(msg.histId, 'NEGATIVE')}>
                        <ThumbsDown size={13} color={msg.feedback === 'NEGATIVE' ? 'var(--danger)' : 'var(--text-muted)'} />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {sending && (
              <div className="msg assistant">
                <div className="msg-avatar" style={{ background:'var(--bg-card)', border:'1px solid var(--border)' }}>🤖</div>
                <div className="msg-bubble" style={{ color:'var(--text-secondary)' }}>Thinking…</div>
              </div>
            )}
            <div ref={bottomRef} />
          </div>
        )}

        <div className="chat-input-row">
          <input
            id="ai-chat-input"
            className="form-input"
            placeholder="Ask about production, KPIs, inventory…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
          />
          <button id="ai-send-btn" className="btn btn-primary" onClick={send} disabled={sending || !input.trim()}>
            <Send size={15} />
          </button>
        </div>
      </div>
    </Layout>
  );
}
