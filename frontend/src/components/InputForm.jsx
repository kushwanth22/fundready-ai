import { useState } from 'react'

const STAGES = ['pre-seed', 'seed', 'series-a']

const PRESETS = [
  {
    label: 'Legal Tech',
    name: 'ContractIQ',
    description: 'AI-powered contract review and risk detection for small law firms. Reduces review time by 80%.',
    stage: 'pre-seed',
    industry: 'Legal Tech',
    target_market: 'Small law firms with 5-50 attorneys',
  },
  {
    label: 'FinTech',
    name: 'ExpenseBot',
    description: 'Automated expense management and reimbursement for remote-first startups using AI receipt scanning.',
    stage: 'seed',
    industry: 'FinTech',
    target_market: 'Startups with 10-200 remote employees',
  },
  {
    label: 'HealthTech',
    name: 'CareSync',
    description: 'Patient appointment scheduling and follow-up automation for independent medical clinics.',
    stage: 'pre-seed',
    industry: 'HealthTech',
    target_market: 'Independent clinics with 2-10 doctors',
  },
  {
    label: 'DevTools',
    name: 'ReviewAI',
    description: 'Automated code review and bug detection tool that integrates with GitHub PRs using LLMs.',
    stage: 'seed',
    industry: 'DevTools',
    target_market: 'Engineering teams of 5-50 developers',
  },
  {
    label: 'E-commerce',
    name: 'ReturnZero',
    description: 'AI-powered returns reduction platform for e-commerce brands using predictive sizing.',
    stage: 'pre-seed',
    industry: 'E-commerce',
    target_market: 'DTC brands doing $1M-$10M annual revenue',
  },
]

export default function InputForm({ onSubmit }) {
  const [form, setForm] = useState({
    name: '',
    description: '',
    stage: 'pre-seed',
    industry: '',
    target_market: '',
  })
  const [activePreset, setActivePreset] = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const applyPreset = (preset) => {
    const { label, ...fields } = preset
    setForm(fields)
    setActivePreset(preset.label)
  }

  const handleSubmit = () => {
    if (!form.name || !form.description) return
    onSubmit(form)
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="text-center mb-10">
        <h1 className="text-4xl font-bold mb-3">
          Turn your idea into an{' '}
          <span className="text-[#00C2A8]">investor-ready deal room</span>
        </h1>
        <p className="text-[#8BA8B5] text-lg">
          Powered by live market data from Apify → Claude AI → Box storage
        </p>
      </div>

      {/* Preset pills */}
      <div className="mb-5">
        <p className="text-xs text-[#4a6a80] mb-2 font-semibold uppercase tracking-wider">
          Try an example
        </p>
        <div className="flex flex-wrap gap-2">
          {PRESETS.map(preset => (
            <button
              key={preset.label}
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-colors ${
                activePreset === preset.label
                  ? 'bg-[#00C2A8] text-[#0A1628] border-[#00C2A8]'
                  : 'bg-transparent text-[#8BA8B5] border-[#1a3355] hover:border-[#00C2A8] hover:text-[#00C2A8]'
              }`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0F2040] rounded-2xl p-8 space-y-5 border border-[#1a3355]">
        <div>
          <label className="block text-sm font-semibold text-[#00C2A8] mb-1">
            Startup Name *
          </label>
          <input
            className="w-full bg-[#0A1628] border border-[#1a3355] rounded-lg px-4 py-2.5 text-white placeholder-[#4a6a80] focus:outline-none focus:border-[#00C2A8]"
            placeholder="e.g. DataFlow AI"
            value={form.name}
            onChange={e => set('name', e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#00C2A8] mb-1">
            What does your startup do? *
          </label>
          <textarea
            className="w-full bg-[#0A1628] border border-[#1a3355] rounded-lg px-4 py-2.5 text-white placeholder-[#4a6a80] focus:outline-none focus:border-[#00C2A8] resize-none h-28"
            placeholder="e.g. AI-powered document automation for legal teams. We reduce contract review time by 80% using LLMs..."
            value={form.description}
            onChange={e => set('description', e.target.value)}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#00C2A8] mb-1">
              Stage
            </label>
            <select
              className="w-full bg-[#0A1628] border border-[#1a3355] rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-[#00C2A8]"
              value={form.stage}
              onChange={e => set('stage', e.target.value)}
            >
              {STAGES.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#00C2A8] mb-1">
              Industry
            </label>
            <input
              className="w-full bg-[#0A1628] border border-[#1a3355] rounded-lg px-4 py-2.5 text-white placeholder-[#4a6a80] focus:outline-none focus:border-[#00C2A8]"
              placeholder="e.g. Legal Tech, FinTech"
              value={form.industry}
              onChange={e => set('industry', e.target.value)}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#00C2A8] mb-1">
            Target Market
          </label>
          <input
            className="w-full bg-[#0A1628] border border-[#1a3355] rounded-lg px-4 py-2.5 text-white placeholder-[#4a6a80] focus:outline-none focus:border-[#00C2A8]"
            placeholder="e.g. Mid-market law firms, 50-500 employees"
            value={form.target_market}
            onChange={e => set('target_market', e.target.value)}
          />
        </div>

        <button
          onClick={handleSubmit}
          disabled={!form.name || !form.description}
          className="w-full bg-[#00C2A8] hover:bg-[#00a892] disabled:opacity-40 disabled:cursor-not-allowed text-[#0A1628] font-bold py-3.5 rounded-xl text-lg transition-colors"
        >
          🚀 Generate Deal Room
        </button>

        <p className="text-center text-xs text-[#4a6a80]">
          Scrapes live data → Analyzes with Claude → Saves to Box (~2-5 min)
        </p>
      </div>
    </div>
  )
}
