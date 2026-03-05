import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, Scissors } from 'lucide-react'
import { cn } from '@/lib/utils'
import { versionHistory } from '@/data/versionHistory'

function VersionHistoryPage() {
  const [selectedVersion, setSelectedVersion] = useState(versionHistory[0]?.version)

  const selected = versionHistory.find((v) => v.version === selectedVersion) || versionHistory[0]

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 flex-shrink-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Scissors className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-gray-900">Salon ERP</span>
            <span className="text-sm text-gray-400 ml-1">Version History</span>
          </div>
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-primary transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to app
          </Link>
        </div>
      </header>

      {/* Content */}
      <div className="flex-1 flex flex-col md:flex-row max-w-7xl mx-auto w-full">
        {/* Left pane — version list */}
        <div className="md:w-72 lg:w-80 flex-shrink-0 border-b md:border-b-0 md:border-r border-gray-200 bg-white overflow-y-auto">
          <div className="p-4 space-y-2">
            {versionHistory.map((v) => (
              <button
                key={v.version}
                onClick={() => setSelectedVersion(v.version)}
                className={cn(
                  'w-full text-left px-4 py-3 rounded-lg transition-colors border',
                  selectedVersion === v.version
                    ? 'bg-primary/5 border-primary/30 ring-1 ring-primary/20'
                    : 'border-transparent hover:bg-gray-50'
                )}
              >
                <div className="flex items-baseline justify-between">
                  <span
                    className={cn(
                      'font-semibold text-sm',
                      selectedVersion === v.version ? 'text-primary' : 'text-gray-900'
                    )}
                  >
                    {v.version}
                  </span>
                  <span className="text-xs text-gray-400">{v.date}</span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{v.title}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Right pane — version details */}
        <div className="flex-1 overflow-y-auto p-6 md:p-8">
          <div className="max-w-2xl">
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-gray-900">{selected.version}</h1>
              <p className="text-sm text-gray-500 mt-1">
                {selected.date} — {selected.title}
              </p>
            </div>

            {/* Highlights */}
            <div className="mb-8">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
                Highlights
              </h2>
              <ul className="space-y-1.5">
                {selected.highlights.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
                    <span className="text-primary mt-1 flex-shrink-0">&#8226;</span>
                    {h}
                  </li>
                ))}
              </ul>
            </div>

            {/* Detailed sections */}
            <div className="space-y-6">
              {selected.details.map((section, i) => (
                <div key={i}>
                  <h3 className="text-base font-semibold text-gray-800 mb-2">{section.section}</h3>
                  <ul className="space-y-1.5 ml-1">
                    {section.items.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-gray-600">
                        <span className="text-gray-400 mt-1 flex-shrink-0">&#8212;</span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default VersionHistoryPage
