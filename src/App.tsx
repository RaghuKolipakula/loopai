import React, { useState } from 'react';

type Opportunity = {
  id: string;
  label: string;
  defaultFeatures: string[];
};

const OPPORTUNITIES: Opportunity[] = [
  {
    id: 'affiliate-marketing',
    label: 'Affiliate Marketing',
    defaultFeatures: ['Product Review Pages', 'Comparison Tables', 'Email Autoresponder Sequence', 'Link Tracking Dashboard']
  },
  {
    id: 'digital-products',
    label: 'Digital Products (ebooks, templates, courses)',
    defaultFeatures: ['Sales Landing Page', 'Checkout Integration', 'Digital Delivery System', 'Customer Support Portal']
  },
  {
    id: 'freelancing',
    label: 'Freelancing / Productized Services',
    defaultFeatures: ['Service Packages Catalog', 'Booking/Scheduling Calendar', 'Client Onboarding Questionnaire', 'Payment Processing']
  },
  {
    id: 'print-on-demand',
    label: 'Print on Demand',
    defaultFeatures: ['Storefront Product Gallery', 'Custom Design Uploader', 'Order Tracking', 'FAQ / Returns Policy']
  },
  {
    id: 'dropshipping',
    label: 'Dropshipping / E-commerce',
    defaultFeatures: ['Product Category Navigation', 'Shopping Cart', 'Trust Badges & Reviews', 'Abandoned Cart Recovery']
  },
  {
    id: 'saas',
    label: 'SaaS / Micro-SaaS',
    defaultFeatures: ['Pricing Page', 'Waitlist Form', 'Stripe Checkout Stub', 'Onboarding Flow', 'Usage Dashboard']
  },
  {
    id: 'content-creation',
    label: 'Content Creation & Ad Revenue (YouTube, blog, newsletter)',
    defaultFeatures: ['Content Feed/Blog', 'Newsletter Subscribe Form', 'About the Creator Page', 'Sponsorship Contact Form']
  },
  {
    id: 'consulting',
    label: 'Consulting / Coaching',
    defaultFeatures: ['Discovery Call Booking', 'Client Testimonials', 'Service Breakdown', 'Intake Form']
  },
  {
    id: 'stock-photography',
    label: 'Stock Photography / Creative Licensing',
    defaultFeatures: ['Image Portfolio Grid', 'Search & Filtering', 'Licensing Terms Page', 'Direct Download/Purchase']
  },
  {
    id: 'local-service',
    label: 'Local Service Business (via online booking)',
    defaultFeatures: ['Service Area Map', 'Quote Request Form', 'Before & After Gallery', 'Online Booking System']
  },
  {
    id: 'custom',
    label: 'Custom Opportunity...',
    defaultFeatures: []
  }
];

type PreviewData = {
  opportunityLabel: string;
  features: string[];
  customText: string;
};

export default function App() {
  const [selectedOppId, setSelectedOppId] = useState<string>('');
  const [customOppName, setCustomOppName] = useState<string>('');
  const [checkedFeatures, setCheckedFeatures] = useState<Set<string>>(new Set());
  const [customText, setCustomText] = useState<string>('');
  const [preview, setPreview] = useState<PreviewData | null>({
    opportunityLabel: '{{OPPORTUNITY}}',
    features: ['{{FEATURES}}'],
    customText: '{{CUSTOM_SENTENCE}}'
  });
  
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [evaluationResult, setEvaluationResult] = useState<string | null>(null);

  const handleOppChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const oppId = e.target.value;
    setSelectedOppId(oppId);
    
    if (oppId) {
      const opp = OPPORTUNITIES.find(o => o.id === oppId);
      if (opp) {
        setCheckedFeatures(new Set(opp.defaultFeatures));
      } else {
        setCheckedFeatures(new Set());
      }
    } else {
      setCheckedFeatures(new Set());
    }
  };

  const handleFeatureToggle = (feature: string) => {
    const newSet = new Set(checkedFeatures);
    if (newSet.has(feature)) {
      newSet.delete(feature);
    } else {
      newSet.add(feature);
    }
    setCheckedFeatures(newSet);
  };

  const handleGenerate = () => {
    let oppLabel = '';
    if (selectedOppId === 'custom') {
      oppLabel = customOppName || 'Custom Opportunity';
    } else {
      const opp = OPPORTUNITIES.find(o => o.id === selectedOppId);
      if (opp) oppLabel = opp.label;
    }

    if (!oppLabel) return;

    // Momentarily clear preview to make the update feel more responsive if they click multiple times
    setPreview(null);
    setEvaluationResult(null); // Clear previous evaluation
    
    setTimeout(() => {
      setPreview({
        opportunityLabel: oppLabel,
        features: Array.from(checkedFeatures),
        customText: customText
      });
    }, 50);
  };

  const handleSubmitToGemini = async () => {
    if (!preview) return;
    
    setIsEvaluating(true);
    setEvaluationResult(null);
    
    try {
      const res = await fetch('/api/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          opportunity: preview.opportunityLabel,
          features: preview.features,
          customText: preview.customText
        })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch evaluation');
      
      setEvaluationResult(data.result);
    } catch (err: any) {
      setEvaluationResult('Error: ' + err.message);
    } finally {
      setIsEvaluating(false);
    }
  };

  const selectedOpp = OPPORTUNITIES.find(o => o.id === selectedOppId);

  return (
    <div className="min-h-screen p-6 md:p-12 flex flex-col items-center">
      <div className="max-w-3xl w-full bg-white rounded-lg shadow-sm border border-gray-200 p-6 md:p-8 mb-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Opportunity Builder</h1>
        
        <div className="space-y-6">
          {/* 1. Opportunity Dropdown */}
          <div>
            <label htmlFor="opportunity" className="block text-sm font-medium text-gray-700 mb-2">
              Select an Opportunity
            </label>
            <select
              id="opportunity"
              value={selectedOppId}
              onChange={handleOppChange}
              className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="" disabled>-- Choose an opportunity --</option>
              {OPPORTUNITIES.map(opp => (
                <option key={opp.id} value={opp.id}>
                  {opp.label}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Opportunity Input */}
          {selectedOppId === 'custom' && (
             <div>
               <label htmlFor="custom-opp" className="block text-sm font-medium text-gray-700 mb-2">
                 Custom Opportunity Name
               </label>
               <input
                 type="text"
                 id="custom-opp"
                 value={customOppName}
                 onChange={(e) => setCustomOppName(e.target.value)}
                 placeholder="Enter your custom idea..."
                 className="w-full bg-white border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
               />
             </div>
          )}

          {/* 2. Feature Checklist */}
          {selectedOpp && selectedOpp.id !== 'custom' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Features & Modules
              </label>
              <div className="space-y-2 border border-gray-200 rounded-md p-4 bg-gray-50">
                {selectedOpp.defaultFeatures.map(feature => (
                  <label key={feature} className="flex items-center space-x-3 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={checkedFeatures.has(feature)}
                      onChange={() => handleFeatureToggle(feature)}
                      className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-800 text-sm">{feature}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* 3. Custom Instruction Field */}
          <div>
            <label htmlFor="custom-instruction" className="block text-sm font-medium text-gray-700 mb-2">
              Anything else to include?
            </label>
            <textarea
              id="custom-instruction"
              rows={4}
              value={customText}
              onChange={(e) => setCustomText(e.target.value)}
              placeholder="e.g. Must have a mobile-first design and dark mode..."
              className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-y"
            ></textarea>
          </div>

          {/* 4. Generate Button */}
          <div>
            <button
              onClick={handleGenerate}
              disabled={!selectedOppId || (selectedOppId === 'custom' && !customOppName)}
              className={`w-full py-3 px-4 rounded-md font-semibold text-white transition-colors
                ${(!selectedOppId || (selectedOppId === 'custom' && !customOppName)) ? 'bg-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}
              `}
            >
              Generate Preview
            </button>
          </div>
        </div>
      </div>

      {/* Preview Panel */}
      {preview && (
        <div className="max-w-3xl w-full bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden mb-8">
          <div className="bg-gray-50 px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900">Live Preview</h2>
            <button 
              onClick={handleSubmitToGemini}
              disabled={isEvaluating}
              className={`py-1.5 px-4 rounded-md text-sm font-semibold text-white transition-colors
                ${isEvaluating ? 'bg-gray-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}
              `}
            >
              {isEvaluating ? 'Evaluating...' : 'Submit to Gemini (Agents Panel)'}
            </button>
          </div>
          <div className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Opportunity Selection</h3>
              <p className="text-xl font-bold text-gray-900">{preview.opportunityLabel}</p>
            </div>

            {preview.features.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Included Features</h3>
                <ul className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {preview.features.map(feature => (
                    <li key={feature} className="flex items-start text-gray-700 text-sm">
                      <svg className="h-5 w-5 text-green-500 mr-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {preview.customText && (
              <div>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Custom Requirements</h3>
                <div className="bg-blue-50 rounded-md p-4 text-sm text-blue-900 border border-blue-100 whitespace-pre-wrap">
                  {preview.customText}
                </div>
              </div>
            )}
            
            {/* Gemini Evaluation Result */}
            {evaluationResult && (
               <div className="mt-8 border-t border-gray-200 pt-6">
                 <h3 className="text-sm font-bold text-gray-800 uppercase tracking-wider mb-4 flex items-center">
                    <span className="mr-2">🤖</span> Gemini Expert Panel Evaluation
                 </h3>
                 <div className="prose prose-sm max-w-none text-gray-700 bg-gray-50 p-6 rounded-md border border-gray-200 whitespace-pre-wrap">
                    {evaluationResult}
                 </div>
               </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
