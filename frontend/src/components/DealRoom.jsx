import { useState } from 'react'

const DOC_LABELS = {
  market_research: '📊 Market Research',
  competitor_analysis: '⚔️ Competitor Analysis',
  tam_sam_som: '📈 TAM / SAM / SOM',
  icp_profile: '👤 ICP Profile',
  one_pager: '📄 One-Pager',
  investor_emails: '✉️ Investor Emails',
}

export default function DealRoom({ dealRoom, startupName, docs }) {
  const [activeDoc, setActiveDoc] = useState(null)

  return (
    <div className="space-y-6">
      {/* Success banner */}
      <div className="bg-[#00C2A8]/10 border border-[#00C2A8]/30 rounded-2xl p-6 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">🎉</span>
            <span className="text-xl font-bold text-white">Deal Room Ready!</span>
          </div>
          <p className="text-[#8BA8B5] text-sm">
            {dealRoom.files?.length || 6} documents generated and saved to Box
          </p>
        </div>
        <a
          href={dealRoom.folder_url}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#1264A3] hover:bg-[#0f5290] text-white font-bold px-5 py-2.5 rounded-xl flex items-center gap-2 transition-colors"
        >
          📁 Open in Box
        </a>
      </div>

      {/* Doc cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {Object.entries(DOC_LABELS).map(([key, label]) => {
          const fileInfo = dealRoom.files?.find(f => f.filename?.includes(key.replace(/_/g, '_')))
          return (
            <div
              key={key}
              onClick={() => setActiveDoc(activeDoc === key ? null : key)}
              className={`bg-[#0F2040] border rounded-xl p-4 cursor-pointer transition-all hover:border-[#00C2A8]/50 ${
                activeDoc === key ? 'border-[#00C2A8]' : 'border-[#1a3355]'
              }`}
            >
              <div className="text-2xl mb-2">{label.split(' ')[0]}</div>
              <div className="text-sm font-semibold text-white">{label.slice(3)}</div>
              <div className="text-xs text-[#4a6a80] mt-1">Click to preview</div>
            </div>
          )
        })}
      </div>

      {/* Doc preview */}
      {activeDoc && docs?.[activeDoc] && (
        <div className="bg-[#0F2040] border border-[#00C2A8]/30 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#00C2A8]">{DOC_LABELS[activeDoc]}</h3>
            <button
              onClick={() => setActiveDoc(null)}
              className="text-[#4a6a80] hover:text-white text-xl leading-none"
            >×</button>
          </div>
          <pre className="text-sm text-[#E8F4F2] whitespace-pre-wrap leading-relaxed font-mono max-h-96 overflow-y-auto">
            {docs[activeDoc]}
          </pre>
        </div>
      )}
    </div>
  )
}
