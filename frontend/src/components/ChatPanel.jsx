import { useState, useRef, useEffect } from 'react'

const SUGGESTIONS = [
  "What investors should I target first?",
  "How can I improve my one-pager?",
  "What objections will investors raise?",
  "Draft a follow-up email after a meeting",
]

export default function ChatPanel({ docs, dealRoom }) {
  const [messages, setMessages] = useState([
    { role: 'assistant', content: "Your deal room is ready! Ask me anything about your documents, how to improve them, or investor strategy. 🚀" }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const send = async (text) => {
    const msg = text || input
    if (!msg.trim()) return

    setInput('')
    setMessages(prev => [...prev, { role: 'user', content: msg }])
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: msg, context: { docs, deal_room: dealRoom } }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: `Sorry, error: ${err.message}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="bg-[#0F2040] rounded-2xl border border-[#1a3355] overflow-hidden">
      <div className="px-6 py-4 border-b border-[#1a3355] flex items-center gap-2">
        <span className="text-lg">💬</span>
        <span className="font-bold text-white">Chat with your deal room</span>
        <span className="ml-auto text-xs text-[#4a6a80]">Ask follow-up questions</span>
      </div>

      {/* Messages */}
      <div className="p-6 space-y-4 max-h-80 overflow-y-auto">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
              m.role === 'user'
                ? 'bg-[#00C2A8] text-[#0A1628] font-medium'
                : 'bg-[#0A1628] text-[#E8F4F2] border border-[#1a3355]'
            }`}>
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-[#0A1628] border border-[#1a3355] px-4 py-2.5 rounded-2xl text-[#4a6a80] text-sm animate-pulse">
              Thinking...
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Suggestions */}
      {messages.length <= 1 && (
        <div className="px-6 pb-4 flex flex-wrap gap-2">
          {SUGGESTIONS.map(s => (
            <button
              key={s}
              onClick={() => send(s)}
              className="text-xs bg-[#0A1628] border border-[#1a3355] hover:border-[#00C2A8] text-[#8BA8B5] hover:text-white px-3 py-1.5 rounded-full transition-colors"
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-6 pb-6 flex gap-3">
        <input
          className="flex-1 bg-[#0A1628] border border-[#1a3355] rounded-xl px-4 py-2.5 text-white placeholder-[#4a6a80] focus:outline-none focus:border-[#00C2A8] text-sm"
          placeholder="Ask anything about your deal room..."
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
        />
        <button
          onClick={() => send()}
          disabled={!input.trim() || loading}
          className="bg-[#00C2A8] hover:bg-[#00a892] disabled:opacity-40 text-[#0A1628] font-bold px-5 rounded-xl transition-colors"
        >
          →
        </button>
      </div>
    </div>
  )
}
