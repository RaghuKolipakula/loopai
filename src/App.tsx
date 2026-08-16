import React, { useState } from 'react';
import OpportunityValidator from './OpportunityValidator';
import ZeroDTEDashboard from './ZeroDTEDashboard';
import EdSeykotaSimulator from './EdSeykotaSimulator';
import Plan1 from './Plan1';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'home' | 'validator' | '0dte' | 'seykota' | 'plan1'>('home');

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

  if (currentPage === 'seykota') {
    return (
      <div className="relative">
        <button 
          onClick={() => setCurrentPage('home')}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full shadow-sm text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-all hover:bg-slate-800"
        >
          ⬅️ Exit Simulator
        </button>
        <EdSeykotaSimulator />
      </div>
    );
  }

  if (currentPage === 'plan1') {
    return (
      <div className="relative">
        <button 
          onClick={() => setCurrentPage('home')}
          className="absolute top-4 left-4 z-50 flex items-center gap-2 bg-white/10 backdrop-blur px-4 py-1.5 rounded-full shadow-sm text-xs font-semibold text-slate-300 hover:text-white border border-slate-700 transition-all hover:bg-slate-800"
        >
          ⬅️ Exit Engine
        </button>
        <Plan1 />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      <div className="max-w-5xl w-full">
        <h1 className="text-4xl md:text-5xl font-extrabold text-slate-900 mb-4 text-center tracking-tight">
          LoopAI Tool Hub
        </h1>
        <p className="text-lg text-slate-600 mb-12 text-center max-w-2xl mx-auto">
          Select a tool below to stress-test your ideas or simulate market mechanics.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
          
          {/* Opportunity Validator Card */}
          <div 
            onClick={() => setCurrentPage('validator')}
            className="group cursor-pointer bg-white rounded-2xl p-6 shadow-sm border border-slate-200 hover:shadow-xl hover:border-blue-200 transition-all duration-300 flex flex-col"
          >
            <div className="bg-blue-50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform duration-300">
              📋
            </div>
            <h2 className="text-lg font-bold text-slate-900 mb-2">Opportunity Validator</h2>
            <p className="text-sm text-slate-600 mb-4 flex-1">
              Stress-test business ideas with real-world constraints via AI panel.
            </p>
            <div className="text-xs font-bold text-blue-600 flex items-center group-hover:translate-x-1 transition-transform">
              Launch Tool &rarr;
            </div>
          </div>

          {/* 0DTE Dashboard Card */}
          <div 
            onClick={() => setCurrentPage('0dte')}
            className="group cursor-pointer bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-800 hover:shadow-2xl hover:border-indigo-500 transition-all duration-300 flex flex-col"
          >
            <div className="bg-indigo-900/50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform duration-300">
              📈
            </div>
            <h2 className="text-lg font-bold text-white mb-2">0DTE Options Cockpit</h2>
            <p className="text-sm text-slate-400 mb-4 flex-1">
              High-frequency simulated SPY dashboard tracking GEX and Theta.
            </p>
            <div className="text-xs font-bold text-indigo-400 flex items-center group-hover:translate-x-1 transition-transform">
              Enter Cockpit &rarr;
            </div>
          </div>

          {/* Ed Seykota Simulator Card */}
          <div 
            onClick={() => setCurrentPage('seykota')}
            className="group cursor-pointer bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-800 hover:shadow-2xl hover:border-amber-500 transition-all duration-300 flex flex-col"
          >
            <div className="bg-amber-900/50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform duration-300">
              🐢
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Trend Regime Simulator</h2>
            <p className="text-sm text-slate-400 mb-4 flex-1">
              Test Seykota-style mechanics on live historical market data.
            </p>
            <div className="text-xs font-bold text-amber-400 flex items-center group-hover:translate-x-1 transition-transform">
              Run Simulator &rarr;
            </div>
          </div>

          {/* Plan 1 Card */}
          <div 
            onClick={() => setCurrentPage('plan1')}
            className="group cursor-pointer bg-slate-900 rounded-2xl p-6 shadow-sm border border-slate-800 hover:shadow-2xl hover:border-emerald-500 transition-all duration-300 flex flex-col"
          >
            <div className="bg-emerald-900/50 w-12 h-12 rounded-xl flex items-center justify-center mb-4 text-xl group-hover:scale-110 transition-transform duration-300">
              ⚡
            </div>
            <h2 className="text-lg font-bold text-white mb-2">Plan1 Options Engine</h2>
            <p className="text-sm text-slate-400 mb-4 flex-1">
              Rolling Campaign & Vega Tent options engine implementation.
            </p>
            <div className="text-xs font-bold text-emerald-400 flex items-center group-hover:translate-x-1 transition-transform">
              Execute Engine &rarr;
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
