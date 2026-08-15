import React, { useState } from 'react';
import OpportunityValidator from './OpportunityValidator';
import ZeroDTEDashboard from './ZeroDTEDashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'validator' | '0dte'>('home');

  if (currentPage === 'validator') {
    return (
      <div className="relative">
        <button 
          onClick={() => setCurrentPage('home')}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white/90 backdrop-blur px-4 py-2 rounded-full shadow-sm text-sm font-semibold text-slate-700 hover:text-slate-900 border border-slate-200 transition-all hover:shadow-md"
        >
          ⬅️ Back to Hub
        </button>
        <OpportunityValidator />
      </div>
    );
  }

  if (currentPage === '0dte') {
    return (
      <div className="relative h-screen overflow-hidden bg-slate-950 text-slate-200 font-mono">
        <button 
          onClick={() => setCurrentPage('home')}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-slate-900/80 backdrop-blur px-4 py-1.5 rounded-full shadow-sm text-xs font-semibold text-slate-400 hover:text-slate-200 border border-slate-700 transition-all hover:bg-slate-800"
        >
          ⬅️ Exit Cockpit
        </button>
        <ZeroDTEDashboard />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-4xl w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 text-center tracking-tight">
          LoopAI Tool Hub
        </h1>
        <p className="text-lg text-slate-600 mb-12 text-center max-w-2xl mx-auto">
          Select a tool below. Validate long-term business ideas or jump into the high-frequency 0DTE options cockpit.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
          
          {/* Opportunity Validator Card */}
          <div 
            onClick={() => setCurrentPage('validator')}
            className="group cursor-pointer bg-white rounded-2xl p-8 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col"
          >
            <div className="bg-blue-50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform duration-300">
              📋
            </div>
            <h2 className="text-2xl font-bold text-slate-900 mb-3">Opportunity Validator</h2>
            <p className="text-slate-600 mb-6 flex-1">
              Stress-test business ideas with real-world constraints. Powered by a panel of AI experts and live web search grounding.
            </p>
            <div className="text-sm font-bold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
              Launch Tool &rarr;
            </div>
          </div>

          {/* 0DTE Dashboard Card */}
          <div 
            onClick={() => setCurrentPage('0dte')}
            className="group cursor-pointer bg-slate-900 rounded-2xl p-8 shadow-sm border border-slate-800 hover:shadow-2xl hover:border-indigo-500 transition-all duration-300 flex flex-col"
          >
            <div className="bg-indigo-900/50 w-16 h-16 rounded-2xl flex items-center justify-center mb-6 text-2xl group-hover:scale-110 transition-transform duration-300">
              📈
            </div>
            <h2 className="text-2xl font-bold text-white mb-3">0DTE Options Cockpit</h2>
            <p className="text-slate-400 mb-6 flex-1">
              High-frequency simulated SPY dashboard tracking Gamma Exposure (GEX), continuous Theta decay, and real-time expected moves.
            </p>
            <div className="text-sm font-bold text-indigo-400 flex items-center group-hover:translate-x-1 transition-transform">
              Enter Cockpit &rarr;
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
