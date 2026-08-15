import React, { useState, useEffect, useRef } from 'react';
import './EdSeykotaSimulator.css';

// Type declarations to avoid TS errors for Chart from window
declare global {
  interface Window {
    Chart: any;
  }
}

// Math helpers
function sma(arr: number[], period: number, idx: number) {
  if (idx < period - 1) return null;
  let s = 0;
  for (let i = idx - period + 1; i <= idx; i++) s += arr[i];
  return s / period;
}
function fmt(n: number) {
  return '$' + n.toLocaleString('en-US', { maximumFractionDigits: 0 });
}
function fmtSigned(n: number) {
  const s = n >= 0 ? '+' : '-';
  return s + '$' + Math.abs(n).toLocaleString('en-US', { maximumFractionDigits: 0 });
}

export default function EdSeykotaSimulator() {
  const [isChartLoaded, setIsChartLoaded] = useState(false);
  const [ticker, setTicker] = useState('SPY');
  const [capital, setCapital] = useState(5000);
  const [riskPct, setRiskPct] = useState(1.0);
  const [fastMA, setFastMA] = useState(20);
  const [slowMA, setSlowMA] = useState(55);
  const [atrPeriod, setAtrPeriod] = useState(14);
  const [atrMult, setAtrMult] = useState(2.5);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);

  const eqChartRef = useRef<HTMLCanvasElement>(null);
  const pxChartRef = useRef<HTMLCanvasElement>(null);
  const eqChartInstance = useRef<any>(null);
  const pxChartInstance = useRef<any>(null);

  // Load Chart.js dynamically to avoid extra dependencies
  useEffect(() => {
    if (window.Chart) {
      setIsChartLoaded(true);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js';
    script.onload = () => setIsChartLoaded(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (results && isChartLoaded) {
      renderCharts(results);
    }
  }, [results, isChartLoaded]);

  const renderCharts = (d: any) => {
    const { prices, equityCurve, trades, regime } = d;
    
    // Eq Chart
    if (eqChartRef.current && window.Chart) {
      if (eqChartInstance.current) eqChartInstance.current.destroy();
      const ctxEq = eqChartRef.current.getContext('2d');
      eqChartInstance.current = new window.Chart(ctxEq, {
        type: 'line',
        data: {
          labels: equityCurve.map((_: any, i: number) => i),
          datasets: [{
            data: equityCurve,
            borderColor: '#E8A33D',
            backgroundColor: 'rgba(232,163,61,0.08)',
            fill: true,
            pointRadius: 0,
            borderWidth: 1.5,
            tension: 0.05
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          scales: {
            x: { ticks: { color: '#9AA4B5', maxTicksLimit: 8 }, grid: { color: '#1E2A3F' } },
            y: { ticks: { color: '#9AA4B5', callback: (v: number) => '$' + v.toLocaleString() }, grid: { color: '#1E2A3F' } }
          }
        }
      });
    }

    // Px Chart
    if (pxChartRef.current && window.Chart) {
      if (pxChartInstance.current) pxChartInstance.current.destroy();
      const ctxPx = pxChartRef.current.getContext('2d');
      const entryPts = trades.map((t: any) => ({ x: t.entryIdx, y: t.entryPrice }));
      const exitPts = trades.map((t: any) => ({ x: t.exitIdx, y: t.exitPrice }));
      
      pxChartInstance.current = new window.Chart(ctxPx, {
        type: 'line',
        data: {
          labels: prices.map((_: any, i: number) => i),
          datasets: [
            {
              label: 'Price',
              data: prices,
              borderColor: '#3FA796',
              pointRadius: 0,
              borderWidth: 1.2,
              tension: 0.05
            },
            {
              label: 'Entries',
              data: entryPts,
              type: 'scatter',
              backgroundColor: '#E8A33D',
              pointStyle: 'triangle',
              rotation: 0,
              pointRadius: 6,
              showLine: false
            },
            {
              label: 'Exits',
              data: exitPts,
              type: 'scatter',
              backgroundColor: '#C4574A',
              pointStyle: 'triangle',
              rotation: 180,
              pointRadius: 6,
              showLine: false
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { labels: { color: '#9AA4B5', font: { family: 'IBM Plex Mono', size: 10.5 } } } },
          scales: {
            x: { ticks: { color: '#9AA4B5', maxTicksLimit: 8 }, grid: { color: '#1E2A3F' } },
            y: { ticks: { color: '#9AA4B5', callback: (v: number) => '$' + v.toFixed(0) }, grid: { color: '#1E2A3F' } }
          }
        }
      });
    }
  };

  const runSim = async () => {
    setIsLoading(true);
    setError(null);
    setResults(null);

    try {
      // Fetch REAL Data from our backend proxy
      const res = await fetch('/api/marketdata?symbol=' + ticker.toUpperCase());
      if (!res.ok) throw new Error('Failed to fetch data for ticker: ' + ticker);
      const dataJson = await res.json();
      
      if (!dataJson.data || dataJson.data.length === 0) {
        throw new Error('No historical data found for ' + ticker);
      }

      const rawData = dataJson.data;
      const prices = rawData.map((d: any) => d.close);
      const days = prices.length;

      // Run Simulation Mechanics
      const tr = prices.map((p: number, i: number) => i === 0 ? 0 : Math.abs(p - prices[i - 1]));
      const atr = prices.map((p: number, i: number) => sma(tr, atrPeriod, i));
      const fma = prices.map((p: number, i: number) => sma(prices, fastMA, i));
      const sma_ = prices.map((p: number, i: number) => sma(prices, slowMA, i));

      let equity = capital;
      const equityCurve = [equity];
      let position = 0; // shares, +long -short(not used, flat/long only)
      let entryPrice = 0, entryATR = 0, highSinceEntry = 0, entryIdx = 0;
      const trades: any[] = [];
      const regime: string[] = []; 

      for (let i = 1; i < days; i++) {
        const f = fma[i], s = sma_[i], a = atr[i];
        const inTrend = (f !== null && s !== null);
        let dayRegime = 'flat';

        if (inTrend) {
          dayRegime = f > s ? 'up' : 'down';
        }
        regime.push(dayRegime);

        if (position === 0) {
          // look for entry: fast crosses above slow
          if (inTrend && fma[i - 1] !== null && sma_[i - 1] !== null) {
            const crossUp = fma[i - 1]! <= sma_[i - 1]! && f > s;
            if (crossUp && a > 0) {
              const riskDollars = equity * (riskPct / 100);
              const stopDist = atrMult * a;
              let shares = Math.floor(riskDollars / stopDist);
              const maxAffordable = Math.floor(equity / prices[i]);
              shares = Math.min(shares, maxAffordable);
              if (shares > 0) {
                position = shares;
                entryPrice = prices[i];
                entryATR = a;
                entryIdx = i;
                highSinceEntry = prices[i];
              }
            }
          }
        } else {
          highSinceEntry = Math.max(highSinceEntry, prices[i]);
          const stopPrice = highSinceEntry - atrMult * entryATR;
          const crossDown = inTrend && fma[i - 1] !== null && sma_[i - 1] !== null && fma[i - 1]! >= sma_[i - 1]! && f < s;
          const stopped = prices[i] <= stopPrice;

          if (crossDown || stopped) {
            const exitPrice = stopped ? Math.min(prices[i], stopPrice) : prices[i];
            const pnl = (exitPrice - entryPrice) * position;
            equity += pnl;
            trades.push({
              entryIdx, exitIdx: i,
              entryPrice, exitPrice,
              shares: position, pnl,
              reason: stopped ? 'Trailing stop' : 'Trend exit'
            });
            position = 0;
          }
        }

        const markPos = position > 0 ? position * (prices[i] - entryPrice) : 0;
        equityCurve.push(equity + markPos);
      }
      
      // close any open position at end
      if (position > 0) {
        const exitPrice = prices[days - 1];
        const pnl = (exitPrice - entryPrice) * position;
        equity += pnl;
        trades.push({ entryIdx, exitIdx: days - 1, entryPrice, exitPrice, shares: position, pnl, reason: 'End of period' });
        position = 0;
      }

      setResults({
        prices,
        equityCurve,
        trades,
        regime,
        capital0: capital,
        finalEquity: equity,
        days
      });

    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const renderStats = () => {
    if (!results) return null;
    const { trades, capital0, finalEquity } = results;
    const wins = trades.filter((t: any) => t.pnl > 0);
    const losses = trades.filter((t: any) => t.pnl <= 0);
    const winRate = trades.length ? (wins.length / trades.length * 100) : 0;
    const avgWin = wins.length ? wins.reduce((a: number, t: any) => a + t.pnl, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((a: number, t: any) => a + t.pnl, 0) / losses.length : 0;
    let peak = -Infinity, maxDD = 0;
    results.equityCurve.forEach((e: number) => {
      peak = Math.max(peak, e);
      maxDD = Math.max(maxDD, (peak - e) / peak * 100);
    });
    const totalReturn = (finalEquity - capital0) / capital0 * 100;

    return (
      <div className="stats">
        <div className="stat"><div className="label">Final equity</div><div className={`value ${finalEquity >= capital0 ? 'pos' : 'neg'}`}>{fmt(finalEquity)}</div></div>
        <div className="stat"><div className="label">Total return</div><div className={`value ${totalReturn >= 0 ? 'pos' : 'neg'}`}>{totalReturn >= 0 ? '+' : ''}{totalReturn.toFixed(1)}%</div></div>
        <div className="stat"><div className="label">Trades</div><div className="value">{trades.length}</div></div>
        <div className="stat"><div className="label">Win rate</div><div className="value">{winRate.toFixed(0)}%</div></div>
        <div className="stat"><div className="label">Avg win</div><div className="value pos">{fmtSigned(avgWin)}</div></div>
        <div className="stat"><div className="label">Avg loss</div><div className="value neg">{fmtSigned(avgLoss)}</div></div>
        <div className="stat"><div className="label">Max drawdown</div><div className="value neg">-{maxDD.toFixed(1)}%</div></div>
      </div>
    );
  };

  const renderStrip = () => {
    if (!results) return <div className="flat" style={{ flex: 1 }}></div>;
    const { regime } = results;
    const sampleEvery = Math.max(1, Math.floor(regime.length / 220));
    const blocks = [];
    for (let i = 0; i < regime.length; i += sampleEvery) {
      blocks.push(<div key={i} className={regime[i]}></div>);
    }
    return blocks;
  };

  return (
    <div className="seykota-wrap">
      <header>
        <h1>Trend <em>Regime</em></h1>
        <div className="sub">A real-market simulator for MA-crossover trend-following — the Seykota/Turtle mechanics (ATR sizing, trailing stops) applied to live historical data.</div>
      </header>

      <div className="strip-label">Regime tape — Historical run</div>
      <div className="strip" id="strip">
        {renderStrip()}
      </div>

      <div className="grid">
        <div className="panel">
          <h2>Simulation Setup</h2>

          <label>Ticker Symbol (Real Data)</label>
          <input type="text" value={ticker} onChange={e => setTicker(e.target.value.toUpperCase())} placeholder="e.g. SPY, QQQ, AAPL" />

          <label>Starting capital ($)</label>
          <input type="number" value={capital} onChange={e => setCapital(Number(e.target.value))} min="500" step="100" />

          <label>Risk per trade (%)</label>
          <input type="number" value={riskPct} onChange={e => setRiskPct(Number(e.target.value))} min="0.1" max="10" step="0.1" />

          <div className="row2">
            <div>
              <label>Fast MA (days)</label>
              <input type="number" value={fastMA} onChange={e => setFastMA(Number(e.target.value))} min="2" max="100" />
            </div>
            <div>
              <label>Slow MA (days)</label>
              <input type="number" value={slowMA} onChange={e => setSlowMA(Number(e.target.value))} min="5" max="250" />
            </div>
          </div>

          <div className="row2">
            <div>
              <label>ATR period</label>
              <input type="number" value={atrPeriod} onChange={e => setAtrPeriod(Number(e.target.value))} min="2" max="60" />
            </div>
            <div>
              <label>Stop × ATR</label>
              <input type="number" value={atrMult} onChange={e => setAtrMult(Number(e.target.value))} min="0.5" max="6" step="0.1" />
            </div>
          </div>

          <button onClick={runSim} disabled={isLoading || !isChartLoaded}>
            {isLoading ? 'Fetching Data...' : 'Run simulation'}
          </button>
          
          {error && <div style={{ color: 'var(--red)', marginTop: '10px', fontSize: '12px' }}>{error}</div>}
        </div>

        <div id="results">
          {!results ? (
            <div className="empty">Set your parameters and run a simulation to see the equity curve, trade log, and regime tape.</div>
          ) : (
            <>
              {renderStats()}

              <div className="chart-box">
                <h3>Equity curve</h3>
                <div style={{ height: '280px', position: 'relative' }}>
                  <canvas ref={eqChartRef}></canvas>
                </div>
              </div>

              <div className="chart-box">
                <h3>Price path &amp; signals</h3>
                <div style={{ height: '280px', position: 'relative' }}>
                  <canvas ref={pxChartRef}></canvas>
                </div>
              </div>

              <div className="chart-box">
                <h3>Trade log</h3>
                <div className="table-wrap">
                  <table>
                    <thead><tr><th>#</th><th>Entry day</th><th>Entry px</th><th>Exit day</th><th>Exit px</th><th>Shares</th><th>P&amp;L</th><th>Reason</th></tr></thead>
                    <tbody>
                      {results.trades.length ? results.trades.map((t: any, i: number) => (
                        <tr key={i}>
                          <td>{i + 1}</td>
                          <td>{t.entryIdx}</td>
                          <td>${t.entryPrice.toFixed(2)}</td>
                          <td>{t.exitIdx}</td>
                          <td>${t.exitPrice.toFixed(2)}</td>
                          <td>{t.shares}</td>
                          <td className={t.pnl >= 0 ? 'pos' : 'neg'}>{fmtSigned(t.pnl)}</td>
                          <td>{t.reason}</td>
                        </tr>
                      )) : <tr><td colSpan={8}>No trades triggered — try a longer period or shorter MAs.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="overlay">
        <h3>Translating signals into an options overlay</h3>
        <p>This simulator trades the underlying directly. A real Seykota-style system trades futures; the nearest options approximation looks like this — understand it as a translation, not a plug-and-play rule:</p>
        <ul>
          <li><strong>On a long entry signal:</strong> buy a slightly ITM or ATM call, 30–60 days out, sized so the option's delta-adjusted exposure matches your ATR-based share-equivalent from the panel above — not one contract regardless of size.</li>
          <li><strong>On exit or trailing-stop hit:</strong> close the call outright rather than letting it expire, same as you'd exit the underlying position.</li>
          <li><strong>On a short/flat signal:</strong> either go to cash or mirror with a put — puts carry richer implied vol (skew), which quietly worsens the reward side of this trade versus the raw underlying.</li>
          <li><strong>What breaks in translation:</strong> options add time decay the underlying doesn't have, so a choppy, signal-flipping market (this system's main loss mode) bleeds theta on top of whipsaw losses. Real trend-following historically uses futures partly to avoid this.</li>
        </ul>
      </div>

      <div className="disclaimer">
        Prices here are fetched using up to 10 years of REAL historical daily data for the selected ticker. This tool is for building intuition about trend-following mechanics, not a signal to trade on. Not financial advice.
      </div>
    </div>
  );
}
