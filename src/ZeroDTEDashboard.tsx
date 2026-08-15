import React, { useEffect, useState, useRef } from 'react';
import { mockStream, MarketDataState } from './utils/mockDataStream';

export default function ZeroDTEDashboard() {
  const [data, setData] = useState<MarketDataState | null>(null);
  
  // Keep history of spot prices for our simple SVG chart
  const [priceHistory, setPriceHistory] = useState<number[]>([]);

  // Position Simulator State
  const [openPositions, setOpenPositions] = useState<any[]>([]);

  // Scenario State
  const [scenarioMove, setScenarioMove] = useState(0);

  useEffect(() => {
    // Start stream
    mockStream.start();
    const unsubscribe = mockStream.subscribe((newData) => {
      setData(newData);
      setPriceHistory(prev => {
        const next = [...prev, newData.spot];
        if (next.length > 50) return next.slice(next.length - 50); // Keep last 50 points
        return next;
      });
    });

    return () => {
      unsubscribe();
      mockStream.stop();
    };
  }, []);

  if (!data) return <div className="p-10 text-white font-mono flex items-center gap-2">Connecting to licensed feed...</div>;

  // Calculate Expected Move (ATM Straddle)
  // Find ATM strike
  const atmStrike = data.chain.reduce((prev, curr) => 
    Math.abs(curr.strike - data.spot) < Math.abs(prev.strike - data.spot) ? curr : prev
  ).strike;

  const atmCall = data.chain.find(c => c.strike === atmStrike && c.type === 'call');
  const atmPut = data.chain.find(c => c.strike === atmStrike && c.type === 'put');
  const expectedMove = (atmCall?.last || 0) + (atmPut?.last || 0);
  const emUpper = data.spot + expectedMove;
  const emLower = data.spot - expectedMove;

  // Calculate Net GEX per strike
  const gexByStrike: Record<number, number> = {};
  data.chain.forEach(opt => {
    if (!gexByStrike[opt.strike]) gexByStrike[opt.strike] = 0;
    gexByStrike[opt.strike] += opt.gex;
  });

  const sortedStrikes = Object.keys(gexByStrike).map(Number).sort((a,b) => b - a);
  const maxGex = Math.max(...Object.values(gexByStrike).map(Math.abs));

  // Determine Flip Point (Zero GEX)
  // Simplified: find strike where cumulative GEX flips, or just visually look at the transition
  
  return (
    <div className="h-full flex flex-col p-4 pt-16 gap-4 overflow-y-auto">
      
      {/* 1. Market Context Panel */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
          <span className="text-xs text-slate-400 font-bold tracking-wider mb-1 uppercase">SPY Spot</span>
          <span className="text-3xl font-extrabold text-white">{data.spot.toFixed(2)}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
          <span className="text-xs text-slate-400 font-bold tracking-wider mb-1 uppercase text-blue-400">Expected Move</span>
          <span className="text-3xl font-extrabold text-blue-400">±{expectedMove.toFixed(2)}</span>
          <span className="text-xs text-slate-500 mt-1">[{emLower.toFixed(0)} - {emUpper.toFixed(0)}]</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
          <span className="text-xs text-slate-400 font-bold tracking-wider mb-1 uppercase text-amber-400">Time Left</span>
          <span className="text-3xl font-extrabold text-amber-400">{(data.timeToExpiryYears * 365 * 24).toFixed(2)}h</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
          <span className="text-xs text-slate-400 font-bold tracking-wider mb-1 uppercase">VIX9D</span>
          <span className="text-3xl font-extrabold text-white">{data.vix9d.toFixed(2)}</span>
        </div>
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl shadow-lg flex flex-col">
          <span className="text-xs text-slate-400 font-bold tracking-wider mb-1 uppercase">IV Rank</span>
          <span className="text-3xl font-extrabold text-white">{data.ivRank.toFixed(1)}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        
        {/* Left Column: Charts and GEX */}
        <div className="col-span-2 flex flex-col gap-4">
          
          {/* Price Chart */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg shrink-0">
            <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">📈 Live Price Action</h3>
            <div className="w-full h-[200px] border border-slate-800 rounded bg-slate-950 relative overflow-hidden">
               {/* Simple SVG Chart */}
               <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
                 {priceHistory.length > 1 && (
                   <polyline
                     fill="none"
                     stroke="#3b82f6"
                     strokeWidth="2"
                     points={priceHistory.map((p, i) => {
                       const min = Math.min(...priceHistory);
                       const max = Math.max(...priceHistory);
                       const range = max === min ? 1 : max - min;
                       const x = (i / (priceHistory.length - 1)) * 500;
                       const y = 200 - (((p - min) / range) * 160 + 20); // 20px padding
                       return `${x},${y}`;
                     }).join(' ')}
                   />
                 )}
               </svg>
            </div>
          </div>

          {/* GEX Map */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex-1 overflow-y-auto">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">📊 Gamma Exposure (GEX) Map</h3>
            <div className="flex flex-col gap-1 text-xs">
              {sortedStrikes.map(strike => {
                const gex = gexByStrike[strike];
                const widthPct = Math.min(100, (Math.abs(gex) / maxGex) * 100);
                const isPositive = gex > 0;
                const isATM = strike === atmStrike;
                return (
                  <div key={strike} className={`flex items-center gap-2 py-0.5 ${isATM ? 'bg-slate-800/50' : ''}`}>
                    <div className="w-12 text-right font-bold text-slate-300">{strike}</div>
                    <div className="flex-1 flex items-center">
                      {/* Left Side (Negative GEX) */}
                      <div className="flex-1 flex justify-end">
                        {!isPositive && (
                          <div 
                            className="bg-red-500 h-4 rounded-l-sm" 
                            style={{ width: `${widthPct}%` }}
                          />
                        )}
                      </div>
                      {/* Center Line */}
                      <div className="w-px h-4 bg-slate-600 mx-1 relative">
                        {isATM && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full z-10" />}
                      </div>
                      {/* Right Side (Positive GEX) */}
                      <div className="flex-1 flex justify-start">
                        {isPositive && (
                          <div 
                            className="bg-emerald-500 h-4 rounded-r-sm" 
                            style={{ width: `${widthPct}%` }}
                          />
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Chain & Risk */}
        <div className="col-span-1 flex flex-col gap-4">
          
          {/* Position & Risk */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg shrink-0">
            <h3 className="text-sm font-bold text-slate-300 mb-4 flex items-center gap-2">🛡️ Position Risk</h3>
            {openPositions.length === 0 ? (
              <div className="text-sm text-slate-500 italic p-4 bg-slate-950 rounded border border-dashed border-slate-700 text-center">
                No active positions. Open trades from the chain below.
              </div>
            ) : (
              <div className="space-y-2">
                 {openPositions.map((pos, i) => {
                   // Find live option
                   const liveOpt = data.chain.find(c => c.strike === pos.strike && c.type === pos.type);
                   const currentPrice = liveOpt?.last || pos.entryPrice;
                   const pnl = (currentPrice - pos.entryPrice) * pos.qty * 100 * (pos.side === 'buy' ? 1 : -1);
                   return (
                     <div key={i} className="flex justify-between items-center text-xs p-2 bg-slate-950 border border-slate-800 rounded">
                       <div>
                         <span className={`font-bold uppercase ${pos.side === 'buy' ? 'text-green-400' : 'text-red-400'}`}>{pos.side}</span>
                         <span className="text-slate-300 ml-2">{pos.qty}x {pos.strike} {pos.type.toUpperCase()}</span>
                       </div>
                       <div className={`font-bold ${pnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                         {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                       </div>
                       <button onClick={() => setOpenPositions(openPositions.filter((_, idx) => idx !== i))} className="text-slate-600 hover:text-slate-300">✕</button>
                     </div>
                   );
                 })}
              </div>
            )}
            
            <div className="mt-4 p-3 bg-slate-950 rounded border border-slate-800 text-xs text-slate-400">
              <span className="block font-bold mb-1 text-slate-300">Guardrails</span>
              <div className="flex justify-between py-1"><span>Account Risk:</span> <span className="text-emerald-400">0.00%</span></div>
              <div className="flex justify-between py-1"><span>Max Loss:</span> <span className="text-white">$0.00</span></div>
            </div>
          </div>

          {/* Scenario Simulator */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg shrink-0">
             <h3 className="text-sm font-bold text-slate-300 mb-2 flex items-center gap-2">🧮 Scenario Simulator</h3>
             <div className="flex gap-2 mb-2">
               {[-1, -0.5, 0, 0.5, 1].map(pct => (
                 <button 
                  key={pct}
                  onClick={() => setScenarioMove(pct)}
                  className={`flex-1 py-1 rounded text-xs font-bold ${scenarioMove === pct ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                 >
                   {pct > 0 ? '+' : ''}{pct}%
                 </button>
               ))}
             </div>
             <div className="text-xs text-slate-500 text-center">
               Projects P&L under SPY move in 30 mins.
             </div>
          </div>

          {/* Mini Chain */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg flex-1 overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-300 flex items-center gap-2">⏱️ 0DTE Chain (Live Theta)</h3>
            </div>
            
            <table className="w-full text-xs text-right">
              <thead>
                <tr className="text-slate-500 border-b border-slate-800">
                  <th className="pb-2 text-left font-normal">Call</th>
                  <th className="pb-2 font-normal text-amber-500">Θ/hr</th>
                  <th className="pb-2 font-bold text-center">Strike</th>
                  <th className="pb-2 font-normal text-amber-500">Θ/hr</th>
                  <th className="pb-2 font-normal">Put</th>
                </tr>
              </thead>
              <tbody className="font-mono">
                {sortedStrikes.slice(Math.floor(sortedStrikes.length/2) - 10, Math.floor(sortedStrikes.length/2) + 10).map(strike => {
                  const call = data.chain.find(c => c.strike === strike && c.type === 'call');
                  const put = data.chain.find(c => c.strike === strike && c.type === 'put');
                  const isATM = strike === atmStrike;
                  const inEM = strike <= emUpper && strike >= emLower;
                  
                  return (
                    <tr key={strike} className={`border-b border-slate-800/50 hover:bg-slate-800/30 ${isATM ? 'bg-slate-800/50' : ''}`}>
                      <td 
                        className="py-1.5 text-left text-slate-300 cursor-pointer hover:text-blue-400"
                        onClick={() => call && setOpenPositions([...openPositions, { side: 'buy', qty: 1, type: 'call', strike, entryPrice: call.last }])}
                      >
                        {call?.last.toFixed(2)}
                      </td>
                      <td className="py-1.5 text-amber-500/80">{call?.thetaHour.toFixed(3)}</td>
                      <td className={`py-1.5 font-bold text-center ${inEM ? 'text-blue-400' : 'text-slate-500'}`}>{strike}</td>
                      <td className="py-1.5 text-amber-500/80">{put?.thetaHour.toFixed(3)}</td>
                      <td 
                        className="py-1.5 text-slate-300 cursor-pointer hover:text-blue-400"
                        onClick={() => put && setOpenPositions([...openPositions, { side: 'buy', qty: 1, type: 'put', strike, entryPrice: put.last }])}
                      >
                        {put?.last.toFixed(2)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

        </div>
      </div>
    </div>
  );
}
