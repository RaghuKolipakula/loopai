import { calculateBlackScholes } from './blackScholes';

export type OptionChainStrike = {
  strike: number;
  type: 'call' | 'put';
  bid: number;
  ask: number;
  last: number;
  volume: number;
  oi: number;
  iv: number;
  delta: number;
  gamma: number;
  thetaDay: number;
  thetaHour: number;
  vega: number;
  gex: number;
};

export type MarketDataState = {
  spot: number;
  timestamp: number;
  timeToExpiryYears: number;
  vix9d: number;
  ivRank: number;
  chain: OptionChainStrike[];
};

// Initial state parameters
let currentSpot = 550.25;
const r = 0.053; // 5.3% risk free
const q = 0.013; // 1.3% div yield
let baseVol = 0.12; // 12% IV
// 0DTE = 6.5 hours of trading. Let's start with 4 hours left.
let hoursLeft = 4.0; 

// Generate strikes from -20 to +20 points away
const STRIKES = Array.from({length: 41}, (_, i) => Math.floor(currentSpot) - 20 + i);

// Random starting OI to simulate dealer positioning
const mockOIMap: Record<string, number> = {};
STRIKES.forEach(strike => {
  // Magnet strikes have huge OI (e.g. 550, 555)
  const isMajor = strike % 5 === 0;
  mockOIMap[`${strike}_call`] = isMajor ? 20000 + Math.random() * 10000 : 2000 + Math.random() * 5000;
  mockOIMap[`${strike}_put`] = isMajor ? 22000 + Math.random() * 10000 : 2500 + Math.random() * 5000;
});

function generateChain(spot: number, tteYears: number): OptionChainStrike[] {
  const chain: OptionChainStrike[] = [];
  
  STRIKES.forEach(strike => {
    // Calls
    const callGreeks = calculateBlackScholes(spot, strike, tteYears, r, q, baseVol, 'call');
    const callOI = mockOIMap[`${strike}_call`];
    // Dealer assumed short call (short gamma)
    const callGex = callOI * callGreeks.gamma * 100 * spot * -1;
    
    chain.push({
      strike,
      type: 'call',
      bid: callGreeks.price * 0.99,
      ask: callGreeks.price * 1.01,
      last: callGreeks.price,
      volume: Math.floor(Math.random() * 1000),
      oi: callOI,
      iv: baseVol,
      delta: callGreeks.delta,
      gamma: callGreeks.gamma,
      thetaDay: callGreeks.thetaDay,
      thetaHour: callGreeks.thetaHour,
      vega: callGreeks.vega,
      gex: callGex
    });

    // Puts
    const putGreeks = calculateBlackScholes(spot, strike, tteYears, r, q, baseVol, 'put');
    const putOI = mockOIMap[`${strike}_put`];
    // Dealer assumed short put (long gamma as price falls towards it, but strictly speaking short put = long gamma profile for dealer? Wait, short put means dealer is long delta, long price risk. Standard assumption: dealer long put = long gamma. Dealer short put = short gamma. Actually, usually clients buy puts, so dealers are short puts -> short gamma. Let's assume negative GEX for puts.)
    const putGex = putOI * putGreeks.gamma * 100 * spot * -1;
    
    chain.push({
      strike,
      type: 'put',
      bid: putGreeks.price * 0.99,
      ask: putGreeks.price * 1.01,
      last: putGreeks.price,
      volume: Math.floor(Math.random() * 1000),
      oi: putOI,
      iv: baseVol,
      delta: putGreeks.delta,
      gamma: putGreeks.gamma,
      thetaDay: putGreeks.thetaDay,
      thetaHour: putGreeks.thetaHour,
      vega: putGreeks.vega,
      gex: putGex
    });
  });

  return chain;
}

/**
 * Hook or class to subscribe to the mock high frequency data
 */
export class MockDataStream {
  private intervalId: any;
  private listeners: ((data: MarketDataState) => void)[] = [];

  start() {
    this.intervalId = setInterval(() => {
      // Simulate random walk for spot
      const change = (Math.random() - 0.5) * 0.5; // +/- 0.25c
      currentSpot += change;
      
      // Simulate time passing (theta decay accelerated for demo)
      // 1 real second = 1 min in simulation
      hoursLeft -= (1 / 60); 
      if (hoursLeft <= 0.001) hoursLeft = 0.001; // prevent div by zero
      
      const tteYears = hoursLeft / (24 * 365); 

      const data: MarketDataState = {
        spot: currentSpot,
        timestamp: Date.now(),
        timeToExpiryYears: tteYears,
        vix9d: 14.2 + (Math.random() - 0.5) * 0.2,
        ivRank: 35.5,
        chain: generateChain(currentSpot, tteYears)
      };

      this.listeners.forEach(l => l(data));
    }, 1000); // 1 tick per second
  }

  stop() {
    clearInterval(this.intervalId);
  }

  subscribe(listener: (data: MarketDataState) => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }
}

export const mockStream = new MockDataStream();
