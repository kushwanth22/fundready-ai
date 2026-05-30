import { useState } from 'react'
import InputForm from './components/InputForm'
import AgentProgress from './components/AgentProgress'
import DealRoom from './components/DealRoom'
import ChatPanel from './components/ChatPanel'

export default function App() {
  const [phase, setPhase] = useState('input')   // input | running | complete
  const [logs, setLogs] = useState([])
  const [result, setResult] = useState(null)
  const [startupInput, setStartupInput] = useState(null)

  const handleGenerate = async (formData) => {
    setStartupInput(formData)
    setLogs([])
    setPhase('running')

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // hold incomplete last line for next chunk

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          try {
            const data = JSON.parse(line.slice(6))
            if (data.type === 'log') {
              setLogs(prev => [...prev, data.message])
            } else if (data.type === 'complete') {
              setResult(data)
              setPhase('complete')
            } else if (data.type === 'error') {
              setLogs(prev => [...prev, `❌ Error: ${data.message}`])
            }
          } catch (_) {}
        }
      }
    } catch (err) {
      setLogs(prev => [...prev, `❌ Connection error: ${err.message}`])
    }
  }

  return (
    <div className="min-h-screen bg-[#0A1628] text-white font-sans">
      {/* Header */}
      <header className="border-b border-[#1a2f4a] px-6 py-4 flex items-center gap-3">
        <span className="text-2xl">🚀</span>
        <span className="text-xl font-bold text-white">FundReady AI</span>
        <span className="ml-2 text-xs bg-[#00C2A8]/20 text-[#00C2A8] px-2 py-0.5 rounded-full">
          Cascadia JS Hackathon
        </span>
        <div className="ml-auto flex gap-2 text-xs">
          {['Box', 'Apify', 'AWS'].map((s, i) => (
            <span key={s} className={`px-2 py-0.5 rounded text-white font-semibold ${
              ['bg-[#1264A3]','bg-[#FF6B2B]','bg-[#FF9900]'][i]
            }`}>{s}</span>
          ))}
        </div>
      </header>

      {/* Main */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        {phase === 'input' && (
          <InputForm onSubmit={handleGenerate} />
        )}
        {phase === 'running' && (
          <AgentProgress logs={logs} />
        )}
        {phase === 'complete' && result && (
          <div className="space-y-8">
            <DealRoom dealRoom={result.deal_room} startupName={startupInput?.name} />
            <ChatPanel docs={result.docs} dealRoom={result.deal_room} />
          </div>
        )}
      </main>
    </div>
  )
}
