import React, { useState } from 'react';
import { 
  findEntrySpread, 
  findTailHedge, 
  calculateRoll, 
  MockDataProvider, 
  CampaignState 
} from './Plan1Engine';

export default function Plan1() {
  const [loading, setLoading] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [campaign, setCampaign] = useState<CampaignState | null>(null);

  const addLog = (msg: string) => {
    setLog(prev => [...prev, msg]);
  };

  const runSimulation = async () => {
    setLoading(true);
    setLog([]);
    setCampaign(null);
    try {
      const provider = new MockDataProvider();
      
      addLog('Fetching option chain from MockDataProvider...');
      const chain = await provider.fetchOptionChain('SPY');
      addLog(`Spot price: $${(chain.spotPrice / 100).toFixed(2)}`);

      addLog('--- Running Entry Engine ---');
      const entry = findEntrySpread(chain);
      if (!entry) {
        addLog('❌ Could not find valid entry spread meeting strict 14-21 DTE and credit criteria.');
        return;
      }
      addLog(`✅ Found Entry Spread: Sell ${entry.shortPut.strike/100}P, Buy ${entry.longPut.strike/100}P (Exp: ${entry.shortPut.expiration})`);
      addLog(`Net Credit: $${(entry.netCredit/100).toFixed(2)} | Max Risk: $${(entry.maxRisk/100).toFixed(2)} | Breakeven: $${(entry.breakeven/100).toFixed(2)}`);

      addLog('--- Running Vega Tent (Hedge) Engine ---');
      const hedge = findTailHedge(chain, entry.netCredit);
      let hedgeState = { strike: 0, expiration: '', debit: 0 };
      if (hedge) {
        addLog(`✅ Found Hedge: Buy ${hedge.strike/100}P (Exp: ${hedge.expiration}) for $${(hedge.ask/100).toFixed(2)}`);
        hedgeState = { strike: hedge.strike, expiration: hedge.expiration, debit: hedge.ask };
      } else {
        addLog('⚠️ Could not find hedge within 20% budget constraint.');
      }

      // Initialize Campaign State
      const initialState: CampaignState = {
        campaign_id: crypto.randomUUID(),
        status: 'OPEN',
        total_credit_collected: entry.netCredit,
        current_short_strike: entry.shortPut.strike,
        current_long_strike: entry.longPut.strike,
        current_expiration: entry.shortPut.expiration,
        hedge_strike: hedgeState.strike,
        hedge_expiration: hedgeState.expiration,
        hedge_debit: hedgeState.debit
      };
      setCampaign(initialState);

      addLog('--- Running Defense & Roll Engine ---');
      // To test the roll, we manually mock a drop in spot price to trigger it.
      const simulatedDropChain = {
        ...chain,
        spotPrice: initialState.current_short_strike * 1.00 // Force trigger (<= 1.01)
      };
      addLog(`📉 Simulating market crash to $${(simulatedDropChain.spotPrice/100).toFixed(2)} to test roll mechanics...`);
      
      const roll = calculateRoll(initialState, simulatedDropChain);
      if (roll.action === 'HOLD') {
        addLog('Hold: Spot price is above trigger threshold.');
      } else if (roll.action === 'ERROR') {
        addLog(`Error: ${roll.reason}`);
      } else if (roll.action === 'MANUAL_REVIEW') {
        addLog(`⚠️ MANUAL REVIEW: ${roll.reason}`);
        addLog(`Would cost $${(roll.closeDebit! / 100).toFixed(2)} to close. PnL: $${(roll.realizedPnL! / 100).toFixed(2)}`);
      } else if (roll.action === 'ROLL') {
        addLog('🔄 SUCCESSFUL ROLL FOUND:');
        addLog(`Closed old spread for $${(roll.closeDebit! / 100).toFixed(2)} debit.`);
        addLog(`Opened new spread at ${roll.newShortStrike!/100}P / ${roll.newLongStrike!/100}P (Exp: ${roll.newExpiration}) for $${(roll.newSpreadCredit! / 100).toFixed(2)} credit.`);
        addLog(`New Total Campaign Credit: $${(roll.newTotalCredit! / 100).toFixed(2)} | New Breakeven: $${(roll.newBreakeven! / 100).toFixed(2)}`);
      }

    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-300 p-8 font-mono">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-white mb-2">Rolling Campaign & Vega Tent Engine</h1>
        <p className="text-slate-400 mb-8 text-sm">
          A quantitative options architect that filters chains, prices strict 14-21 DTE $10-wide put credit spreads, calculates 20% budget 90-120 DTE tail hedges, and enforces strict credit-positive rolling rules.
        </p>

        <div className="flex gap-4 mb-8">
          <button 
            onClick={runSimulation}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2 px-6 rounded-md disabled:opacity-50"
          >
            {loading ? 'Running Engine...' : 'Execute Campaign Scanner'}
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 font-mono text-sm shadow-xl">
          <h2 className="text-indigo-400 font-bold mb-4 uppercase tracking-wider">Engine Execution Log</h2>
          {log.length === 0 ? (
            <div className="text-slate-600 italic">No output yet. Click execute to run the engine logic against mock data.</div>
          ) : (
            <div className="space-y-2">
              {log.map((entry, idx) => (
                <div key={idx} className={entry.startsWith('---') ? 'text-indigo-300 font-bold mt-4' : 'text-slate-300'}>
                  {entry}
                </div>
              ))}
            </div>
          )}
        </div>

        {campaign && (
          <div className="mt-8 bg-slate-900 border border-slate-800 rounded-lg p-6">
            <h2 className="text-emerald-400 font-bold mb-4 uppercase tracking-wider">D1 Campaign State Object</h2>
            <pre className="text-xs text-slate-400 overflow-x-auto">
              {JSON.stringify(campaign, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
}
