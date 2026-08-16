// ---------------------------------------------------------
// Core Interfaces & State Management
// ---------------------------------------------------------

export type CampaignStatus = 'OPEN' | 'DEFENDING' | 'CLOSED';

export interface CampaignState {
  campaign_id: string;
  status: CampaignStatus;
  total_credit_collected: number; // Stored in CENTS
  current_short_strike: number;   // Stored in CENTS
  current_long_strike: number;    // Stored in CENTS
  current_expiration: string;     // YYYY-MM-DD
  hedge_strike: number;           // Stored in CENTS
  hedge_expiration: string;       // YYYY-MM-DD
  hedge_debit: number;            // Stored in CENTS
}

export interface OptionContract {
  strike: number;      // in CENTS
  expiration: string;  // YYYY-MM-DD
  type: 'call' | 'put';
  bid: number;         // in CENTS
  ask: number;         // in CENTS
  delta: number;
  dte: number;         // Days to expiration
}

export interface OptionChain {
  spotPrice: number;   // in CENTS
  contracts: OptionContract[];
}

export interface DataProvider {
  fetchOptionChain(symbol: string): Promise<OptionChain>;
}

// ---------------------------------------------------------
// Engine Math Logic
// ---------------------------------------------------------

/**
 * 2. The Income Engine (Entry Math)
 */
export function findEntrySpread(optionChain: OptionChain) {
  // Filter timeframe: 14-21 DTE
  const validExpirations = optionChain.contracts.filter(c => c.dte >= 14 && c.dte <= 21 && c.type === 'put');
  
  // Find Short Put: delta closest to -0.20 to -0.25
  let bestShortPut: OptionContract | null = null;
  let minDeltaDiff = Infinity;

  for (const contract of validExpirations) {
    if (contract.delta <= -0.20 && contract.delta >= -0.25) {
      const diff = Math.abs(contract.delta - (-0.225)); // center of range
      if (diff < minDeltaDiff) {
        minDeltaDiff = diff;
        bestShortPut = contract;
      }
    }
  }

  // Fallback if none in exact range
  if (!bestShortPut) {
    for (const contract of validExpirations) {
      const diff = Math.min(Math.abs(contract.delta - (-0.20)), Math.abs(contract.delta - (-0.25)));
      if (diff < minDeltaDiff) {
        minDeltaDiff = diff;
        bestShortPut = contract;
      }
    }
  }

  if (!bestShortPut) return null;

  // Long put: exactly $10 below short put (1000 cents)
  const targetLongStrike = bestShortPut.strike - 1000;
  const longPut = validExpirations.find(c => 
    c.expiration === bestShortPut!.expiration && 
    c.strike === targetLongStrike
  );

  if (!longPut) return null;

  // Credit validation
  const spreadWidth = bestShortPut.strike - longPut.strike; // Should be 1000
  if (spreadWidth !== 1000) return null;

  const netCredit = bestShortPut.bid - longPut.ask;
  const targetCredit = Math.floor(0.30 * spreadWidth); // >= 300 cents

  if (netCredit < targetCredit) return null;

  const maxRisk = spreadWidth - netCredit;
  const breakeven = bestShortPut.strike - netCredit;

  return {
    shortPut: bestShortPut,
    longPut,
    netCredit,
    maxRisk,
    breakeven,
    spreadWidth
  };
}

/**
 * 3. The Vega Tent (Hedge Math)
 */
export function findTailHedge(optionChain: OptionChain, entryNetCredit: number) {
  // Timeframe: 90-120 DTE
  const validHedges = optionChain.contracts.filter(c => 
    c.dte >= 90 && c.dte <= 120 && 
    c.type === 'put' &&
    c.delta <= -0.05 && c.delta >= -0.10
  );

  const maxHedgeBudget = Math.floor(entryNetCredit * 0.20);

  // Lowest strike that satisfies the budget condition
  let bestHedge: OptionContract | null = null;
  let minStrike = Infinity;

  for (const contract of validHedges) {
    if (contract.ask <= maxHedgeBudget) {
      if (contract.strike < minStrike) {
        minStrike = contract.strike;
        bestHedge = contract;
      }
    }
  }

  return bestHedge;
}

/**
 * 4. The Defense & Roll Engine (Recovery Math)
 */
export function calculateRoll(currentCampaign: CampaignState, liveOptionChain: OptionChain) {
  const spotPrice = liveOptionChain.spotPrice;
  
  // Trigger condition: spot <= short_strike * 1.01
  const triggerPrice = Math.floor(currentCampaign.current_short_strike * 1.01);
  if (spotPrice > triggerPrice) {
    return { action: 'HOLD', reason: 'Spot price is above trigger threshold.' };
  }

  // Find current spread to close it
  const currentShortPut = liveOptionChain.contracts.find(c => 
    c.expiration === currentCampaign.current_expiration && 
    c.strike === currentCampaign.current_short_strike &&
    c.type === 'put'
  );
  
  const currentLongPut = liveOptionChain.contracts.find(c => 
    c.expiration === currentCampaign.current_expiration && 
    c.strike === currentCampaign.current_long_strike &&
    c.type === 'put'
  );

  if (!currentShortPut || !currentLongPut) {
    return { action: 'ERROR', reason: 'Could not price current positions.' };
  }

  // Close debit = Buy back short put (Ask) - Sell long put (Bid)
  const closeDebit = currentShortPut.ask - currentLongPut.bid;
  const realizedPnL = currentCampaign.total_credit_collected - closeDebit;

  // Look forward 14 to 21 days from current expiration
  const currentExpDate = new Date(currentCampaign.current_expiration);
  const minTargetDate = new Date(currentExpDate);
  minTargetDate.setDate(minTargetDate.getDate() + 14);
  const maxTargetDate = new Date(currentExpDate);
  maxTargetDate.setDate(maxTargetDate.getDate() + 21);

  const candidateContracts = liveOptionChain.contracts.filter(c => {
    const exp = new Date(c.expiration);
    return exp >= minTargetDate && exp <= maxTargetDate && c.type === 'put';
  });

  // Iterate downwards in strike price
  // Sort by expiration then by strike descending
  candidateContracts.sort((a, b) => b.strike - a.strike);

  let bestRoll: any = null;

  for (const shortCand of candidateContracts) {
    if (shortCand.strike >= currentCampaign.current_short_strike) continue;

    const targetLongCandStrike = shortCand.strike - 1000; // $10 width
    const longCand = candidateContracts.find(c => 
      c.expiration === shortCand.expiration && 
      c.strike === targetLongCandStrike
    );

    if (!longCand) continue;

    const newSpreadCredit = shortCand.bid - longCand.ask;
    
    // STRICT ROLL CONDITION
    if (newSpreadCredit - closeDebit > 0) {
      bestRoll = {
        shortCand,
        longCand,
        newSpreadCredit
      };
      // We found the highest strike below current that gives a net credit. Break early to maximize strike.
      break; 
    }
  }

  if (!bestRoll) {
    return { action: 'MANUAL_REVIEW', reason: 'No credit-positive roll available at a lower strike with $10 width.', closeDebit, realizedPnL };
  }

  const newTotalCredit = currentCampaign.total_credit_collected - closeDebit + bestRoll.newSpreadCredit;
  const newBreakeven = bestRoll.shortCand.strike - newTotalCredit;

  return {
    action: 'ROLL',
    closeDebit,
    realizedPnL,
    newShortStrike: bestRoll.shortCand.strike,
    newLongStrike: bestRoll.longCand.strike,
    newExpiration: bestRoll.shortCand.expiration,
    newSpreadCredit: bestRoll.newSpreadCredit,
    newTotalCredit,
    newBreakeven
  };
}

// ---------------------------------------------------------
// Mock Data Provider
// ---------------------------------------------------------
export class MockDataProvider implements DataProvider {
  async fetchOptionChain(symbol: string): Promise<OptionChain> {
    // Generate synthetic option chain for testing
    const spotPrice = 50000; // $500.00
    const contracts: OptionContract[] = [];
    
    const expirations = [
      { days: 0, date: '2026-08-15' },
      { days: 14, date: '2026-08-29' },
      { days: 21, date: '2026-09-05' },
      { days: 35, date: '2026-09-19' },
      { days: 100, date: '2026-11-23' }
    ];

    for (const exp of expirations) {
      // Strikes from 450 to 520
      for (let strike = 45000; strike <= 52000; strike += 1000) {
        // Mock pricing logic based on distance from spot and time
        const dist = spotPrice - strike;
        const timePremium = exp.days * 20; // 20 cents per day
        
        let delta = 0;
        if (strike > spotPrice) delta = -0.05; // OTM puts have small negative delta
        else delta = -0.5 + (dist / 10000); // ATM is ~-0.5, deep ITM approaches -1.0

        // Cap delta between -1.0 and 0
        delta = Math.max(-1.0, Math.min(0, delta));

        // Intrinsic value
        const intrinsic = Math.max(0, strike - spotPrice);
        const fairValue = intrinsic + timePremium + (Math.abs(delta) * 1000);

        contracts.push({
          strike,
          expiration: exp.date,
          type: 'put',
          bid: Math.floor(fairValue * 0.95), // 5% bid-ask spread
          ask: Math.ceil(fairValue * 1.05),
          delta: Number(delta.toFixed(3)),
          dte: exp.days
        });
      }
    }

    return { spotPrice, contracts };
  }
}
