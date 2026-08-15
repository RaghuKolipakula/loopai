/**
 * Normal cumulative distribution function
 */
function CND(x: number): number {
  const a1 = 0.31938153;
  const a2 = -0.356563782;
  const a3 = 1.781477937;
  const a4 = -1.821255978;
  const a5 = 1.330274429;
  const L = Math.abs(x);
  const K = 1.0 / (1.0 + 0.2316419 * L);
  let res =
    1.0 -
    (1.0 / Math.sqrt(2 * Math.PI)) *
      Math.exp(-L * L / 2.0) *
      (a1 * K + a2 * K * K + a3 * Math.pow(K, 3) + a4 * Math.pow(K, 4) + a5 * Math.pow(K, 5));
  if (x < 0) {
    res = 1.0 - res;
  }
  return res;
}

/**
 * Normal probability density function
 */
function ND(x: number): number {
  return (1.0 / Math.sqrt(2 * Math.PI)) * Math.exp(-x * x / 2.0);
}

export type Greeks = {
  price: number;
  delta: number;
  gamma: number;
  thetaDay: number;
  thetaHour: number;
  vega: number;
};

/**
 * Black-Scholes pricing and Greeks with dividend yield
 * @param S Spot price
 * @param K Strike price
 * @param T Time to maturity (in years)
 * @param r Risk-free rate (e.g. 0.05 for 5%)
 * @param q Dividend yield (e.g. 0.015 for 1.5%)
 * @param v Volatility (e.g. 0.20 for 20%)
 * @param type 'call' or 'put'
 */
export function calculateBlackScholes(
  S: number,
  K: number,
  T: number,
  r: number,
  q: number,
  v: number,
  type: 'call' | 'put'
): Greeks {
  // If extremely close to expiration, manually handle to prevent divide by zero
  if (T <= 0.00001) {
    const intrinsic = type === 'call' ? Math.max(0, S - K) : Math.max(0, K - S);
    return { price: intrinsic, delta: S > K ? (type === 'call' ? 1 : 0) : (type === 'call' ? 0 : -1), gamma: 0, thetaDay: 0, thetaHour: 0, vega: 0 };
  }

  const d1 = (Math.log(S / K) + (r - q + (v * v) / 2.0) * T) / (v * Math.sqrt(T));
  const d2 = d1 - v * Math.sqrt(T);

  let price = 0;
  let delta = 0;
  let thetaDay = 0;

  const commonGammaVega = ND(d1);
  
  // Gamma is same for calls and puts
  const gamma = (Math.exp(-q * T) * commonGammaVega) / (S * v * Math.sqrt(T));
  
  // Vega is same for calls and puts
  const vega = S * Math.exp(-q * T) * commonGammaVega * Math.sqrt(T) / 100;

  if (type === 'call') {
    price = S * Math.exp(-q * T) * CND(d1) - K * Math.exp(-r * T) * CND(d2);
    delta = Math.exp(-q * T) * CND(d1);
    
    // Theta per year
    const term1 = -(S * v * Math.exp(-q * T) * commonGammaVega) / (2 * Math.sqrt(T));
    const term2 = r * K * Math.exp(-r * T) * CND(d2);
    const term3 = q * S * Math.exp(-q * T) * CND(d1);
    const thetaYear = term1 - term2 + term3;
    
    thetaDay = thetaYear / 365;
  } else {
    price = K * Math.exp(-r * T) * CND(-d2) - S * Math.exp(-q * T) * CND(-d1);
    delta = Math.exp(-q * T) * (CND(d1) - 1);
    
    // Theta per year
    const term1 = -(S * v * Math.exp(-q * T) * commonGammaVega) / (2 * Math.sqrt(T));
    const term2 = r * K * Math.exp(-r * T) * CND(-d2);
    const term3 = q * S * Math.exp(-q * T) * CND(-d1);
    const thetaYear = term1 + term2 - term3;
    
    thetaDay = thetaYear / 365;
  }

  // 0DTE specific: For intraday, active trading hours are 6.5h per day.
  // 1 day = 6.5 trading hours for purely active theta, or 24h for calendar.
  // We'll approximate an hourly theta based on 24h to be standard, but users care about rapid decay.
  const thetaHour = thetaDay / 24;

  return {
    price,
    delta,
    gamma,
    thetaDay,
    thetaHour,
    vega
  };
}
