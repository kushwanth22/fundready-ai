import { useEffect, useRef } from 'react'

const STEPS = [
  { label: 'Research', icon: '🔍', keyword: 'researching' },
  { label: 'Analyze',  icon: '🧠', keyword: 'analyzing' },
  { label: 'Generate', icon: '📝', keyword: 'generating' },
  { label: 'Upload',   icon: '📁', keyword: 'uploading' },
]

export default function AgentProgress({ logs }) {
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs])

  const currentStep = logs.some(l => l.includes('uploading')) ? 3
    : logs.some(l => l.includes('generating') || l.includes('📝')) ? 2
    : logs.some(l => l.includes('analyzing') || l.includes('🧠')) ? 1
    : 0

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Step indicators */}
      <div className="flex items-center justify-between">
        {STEPS.map((step, i) => (
          <div key={step.label} className="flex items-center gap-2">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold transition-all ${
              i < currentStep ? 'bg-[#00C2A8] text-[#0A1628]'
              : i === currentStep ? 'bg-[#00C2A8]/20 border-2 border-[#00C2A8] text-[#00C2A8] animate-pulse'
              : 'bg-[#0F2040] border border-[#1a3355] text-[#4a6a80]'
            }`}>
              {i < currentStep ? '✓' : step.icon}
            </div>
            <span className={`text-sm font-semibold ${i <= currentStep ? 'text-white' : 'text-[#4a6a80]'}`}>
              {step.label}
            </span>
            {i < STEPS.length - 1 && (
              <div className={`w-12 h-0.5 mx-2 ${i < currentStep ? 'bg-[#00C2A8]' : 'bg-[#1a3355]'}`} />
            )}
          </div>
        ))}
      </div>

      {/* Live log */}
      <div className="bg-[#0F2040] rounded-2xl border border-[#1a3355] p-6 min-h-64 max-h-96 overflow-y-auto font-mono text-sm space-y-1.5">
        {logs.length === 0 && (
          <span className="text-[#4a6a80]">Starting agent...</span>
        )}
        {logs.map((log, i) => (
          <div key={i} className={`${
            log.startsWith('✅') ? 'text-[#00C2A8]'
            : log.startsWith('❌') ? 'text-red-400'
            : log.startsWith('  ') ? 'text-[#8BA8B5] pl-4'
            : 'text-white'
          }`}>
            {log}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <p className="text-center text-[#4a6a80] text-sm animate-pulse">
        Hang tight — scraping live market data and generating your deal room...
      </p>
    </div>
  )
}
