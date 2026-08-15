import React, { useState, useEffect } from 'react';

const OPPORTUNITIES = [
  'Affiliate Marketing',
  'Digital Products',
  'Freelancing',
  'Print on Demand',
  'Dropshipping',
  'SaaS / Micro-SaaS',
  'Content Creation',
  'Consulting / Coaching',
  'Stock Photography',
  'Local Service Business',
  'Custom'
];

const MONETIZATION_MODELS = [
  'One-time purchase',
  'Subscription (recurring)',
  'Commission / Affiliate',
  'Retainer (services)',
  'Ad revenue / Sponsorships'
];

const TIMELINES = [
  'Need income in < 3 months',
  'Can invest 6-12 months',
  'Long-term bet (1-3 years)'
];

type RealityInputs = {
  capital: number | string;
  hoursPerWeek: number | string;
  skills: string;
  audienceSize: number | string;
  monetization: string;
  timeline: string;
  geography: string;
};

type Submission = {
  id: string;
  opportunityType: string;
  niche: string;
  realityInputs: RealityInputs;
  panelOutput: string;
  score: number;
  risks: string[];
  nextStep: string;
  createdAt: string;
};

export default function OpportunityValidator() {
  const [history, setHistory] = useState<Submission[]>([]);
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null);

  const [oppType, setOppType] = useState('Consulting / Coaching');
  const [customOpp, setCustomOpp] = useState('');
  const [niche, setNiche] = useState('');
  const [inputs, setInputs] = useState<RealityInputs>({
    capital: '',
    hoursPerWeek: '',
    skills: '',
    audienceSize: '',
    monetization: MONETIZATION_MODELS[0],
    timeline: TIMELINES[0],
    geography: ''
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const res = await fetch('/api/opportunities');
      if (res.ok) {
        const data = await res.json();
        setHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch history", e);
    }
  };

  const loadSubmission = async (id: string) => {
    try {
      const res = await fetch(`/api/opportunities/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedSubmission(data);
      }
    } catch (e) {
      console.error("Failed to load submission", e);
    }
  };

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSelectedSubmission(null);

    const typeToSubmit = oppType === 'Custom' ? customOpp : oppType;

    try {
      const res = await fetch('/api/opportunities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunityType: typeToSubmit,
          niche,
          realityInputs: inputs
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to evaluate');

      setSelectedSubmission(data);
      setHistory([data, ...history]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const populateFromHistory = (sub: Submission) => {
    setOppType(OPPORTUNITIES.includes(sub.opportunityType) ? sub.opportunityType : 'Custom');
    if (!OPPORTUNITIES.includes(sub.opportunityType)) {
      setCustomOpp(sub.opportunityType);
    }
    setNiche(sub.niche || '');
    setInputs(sub.realityInputs);
    setSelectedSubmission(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row font-sans">
      
      {/* Sidebar: History */}
      <div className="w-full md:w-80 bg-white border-r border-gray-200 overflow-y-auto h-auto md:h-screen p-4 shrink-0">
        <h2 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
          <span className="mr-2">📚</span> History
        </h2>
        {history.length === 0 ? (
          <p className="text-sm text-gray-500 italic">No past evaluations yet.</p>
        ) : (
          <div className="space-y-3">
            {history.map(item => (
              <div 
                key={item.id} 
                onClick={() => loadSubmission(item.id)}
                className={`p-3 rounded-md cursor-pointer transition-colors border ${selectedSubmission?.id === item.id ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
              >
                <div className="flex justify-between items-start mb-1">
                  <h3 className="text-sm font-bold text-gray-800 line-clamp-1">{item.opportunityType}</h3>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${item.score >= 7 ? 'bg-green-100 text-green-800' : item.score >= 4 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}`}>
                    {item.score}/10
                  </span>
                </div>
                <p className="text-xs text-gray-500 line-clamp-1">{item.niche || 'General'}</p>
                <div className="mt-2 text-xs text-blue-600 font-medium flex items-center">
                  View Verdict &rarr;
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto h-screen p-6 md:p-10">
        
        {/* Results View */}
        {selectedSubmission ? (
          <div className="max-w-4xl mx-auto">
            <button 
              onClick={() => setSelectedSubmission(null)}
              className="text-sm text-gray-500 hover:text-gray-800 mb-6 flex items-center transition-colors"
            >
              &larr; Back to Input Form
            </button>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Verdict Header */}
              <div className="bg-slate-900 text-white p-6 md:p-8 flex flex-col md:flex-row justify-between items-start md:items-center">
                <div>
                  <h1 className="text-2xl font-bold mb-1">{selectedSubmission.opportunityType}</h1>
                  <p className="text-slate-300">Niche: {selectedSubmission.niche || 'General'}</p>
                </div>
                <div className="mt-4 md:mt-0 flex flex-col items-end">
                  <span className="text-sm uppercase tracking-wider text-slate-400 font-bold mb-1">Viability Score</span>
                  <div className={`text-4xl font-extrabold ${selectedSubmission.score >= 7 ? 'text-green-400' : selectedSubmission.score >= 4 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {selectedSubmission.score}/10
                  </div>
                </div>
              </div>

              <div className="p-6 md:p-8 space-y-8">
                {/* Verdict Block */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-red-50 border border-red-100 rounded-lg p-5">
                    <h3 className="text-red-800 font-bold uppercase tracking-wider text-sm mb-3 flex items-center">
                      <span className="mr-2">⚠️</span> Top Risks
                    </h3>
                    <ul className="space-y-2">
                      {selectedSubmission.risks.map((risk, i) => (
                        <li key={i} className="text-red-900 text-sm flex items-start">
                          <span className="mr-2">&bull;</span>
                          <span>{risk}</span>
                        </li>
                      ))}
                      {selectedSubmission.risks.length === 0 && <li className="text-red-900 text-sm italic">None identified in structured output. See panel notes.</li>}
                    </ul>
                  </div>

                  <div className="bg-green-50 border border-green-100 rounded-lg p-5">
                    <h3 className="text-green-800 font-bold uppercase tracking-wider text-sm mb-3 flex items-center">
                      <span className="mr-2">🎯</span> Recommended Next Micro-Step
                    </h3>
                    <p className="text-green-900 text-sm font-medium leading-relaxed">
                      {selectedSubmission.nextStep || 'No specific next step parsed. See panel notes.'}
                    </p>
                  </div>
                </div>

                <hr className="border-gray-200" />

                {/* Panel Output */}
                <div>
                  <h3 className="text-lg font-bold text-gray-900 mb-4">Detailed Panel Evaluation</h3>
                  <div className="prose prose-sm md:prose-base prose-blue max-w-none text-gray-700 whitespace-pre-wrap">
                    {selectedSubmission.panelOutput}
                  </div>
                </div>

                <div className="pt-6 flex justify-end">
                  <button 
                    onClick={() => populateFromHistory(selectedSubmission)}
                    className="px-6 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm transition-colors"
                  >
                    Clone & Re-Run with Changes
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          
          /* Input Form View */
          <div className="max-w-3xl mx-auto">
            <h1 className="text-3xl font-extrabold text-slate-900 mb-2">Opportunity Validator</h1>
            <p className="text-slate-600 mb-8 font-medium">Stress-test your idea against a panel of AI experts before you invest time or money.</p>
            
            <form onSubmit={handleRunEvaluation} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 md:p-8">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                {/* Opp Type */}
                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Opportunity Type</label>
                  <select
                    value={oppType}
                    onChange={(e) => setOppType(e.target.value)}
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {OPPORTUNITIES.map(opp => (
                      <option key={opp} value={opp}>{opp}</option>
                    ))}
                  </select>
                </div>

                {oppType === 'Custom' && (
                  <div className="col-span-1 md:col-span-2">
                    <label className="block text-sm font-bold text-gray-700 mb-1">Custom Opportunity Name</label>
                    <input
                      required
                      type="text"
                      value={customOpp}
                      onChange={(e) => setCustomOpp(e.target.value)}
                      placeholder="e.g. AI-powered pet portraits"
                      className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                )}

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Target Customer / Niche</label>
                  <input
                    required
                    type="text"
                    value={niche}
                    onChange={(e) => setNiche(e.target.value)}
                    placeholder="e.g. Moving truck companies, SaaS founders, New parents"
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Crucial for live web search context.</p>
                </div>
              </div>

              <hr className="border-gray-200 mb-8" />
              <h2 className="text-xl font-bold text-gray-900 mb-4">Reality Inputs</h2>
              <p className="text-sm text-gray-600 mb-6">These constraints determine whether this idea works for <span className="font-semibold italic">you</span>, not just in theory.</p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Available Starting Capital ($)</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={inputs.capital}
                    onChange={(e) => setInputs({...inputs, capital: e.target.value})}
                    placeholder="e.g. 500"
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Hours Available per Week</label>
                  <input
                    required
                    type="number"
                    min="1"
                    value={inputs.hoursPerWeek}
                    onChange={(e) => setInputs({...inputs, hoursPerWeek: e.target.value})}
                    placeholder="e.g. 10"
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div className="col-span-1 md:col-span-2">
                  <label className="block text-sm font-bold text-gray-700 mb-1">Existing Skills / Experience</label>
                  <textarea
                    required
                    rows={2}
                    value={inputs.skills}
                    onChange={(e) => setInputs({...inputs, skills: e.target.value})}
                    placeholder="e.g. 5 years B2B software sales, know how to run FB ads, can write basic Python..."
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Existing Audience/Network Size</label>
                  <input
                    required
                    type="number"
                    min="0"
                    value={inputs.audienceSize}
                    onChange={(e) => setInputs({...inputs, audienceSize: e.target.value})}
                    placeholder="e.g. 0 or 5000"
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Geography (If local)</label>
                  <input
                    type="text"
                    value={inputs.geography}
                    onChange={(e) => setInputs({...inputs, geography: e.target.value})}
                    placeholder="e.g. Austin, TX (Leave blank if global)"
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Monetization Model</label>
                  <select
                    value={inputs.monetization}
                    onChange={(e) => setInputs({...inputs, monetization: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {MONETIZATION_MODELS.map(m => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-1">Income Timeline</label>
                  <select
                    value={inputs.timeline}
                    onChange={(e) => setInputs({...inputs, timeline: e.target.value})}
                    className="w-full bg-slate-50 border border-gray-300 rounded-md py-2.5 px-3 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {TIMELINES.map(t => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-800 rounded-md text-sm">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-3.5 px-4 rounded-lg font-bold text-white uppercase tracking-wider transition-all shadow-md
                  ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'}
                `}
              >
                {isLoading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Searching Web & Evaluating...
                  </span>
                ) : 'Validate Opportunity'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
