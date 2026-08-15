export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Utility for sending JSON responses
        const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
        const error = (msg, status = 500) => json({ error: msg }, status);

        const pathParts = url.pathname.split('/').filter(Boolean);

        // ==========================================
        // /api/marketdata Endpoint for Historical Data
        // ==========================================
        if (pathParts[0] === 'api' && pathParts[1] === 'marketdata') {
            if (request.method === 'GET') {
                try {
                    const symbol = new URL(request.url).searchParams.get('symbol') || 'SPY';
                    const yfUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=10y&interval=1d`;
                    const yfRes = await fetch(yfUrl, {
                        headers: {
                            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
                        }
                    });
                    
                    if (!yfRes.ok) {
                        return error(`Yahoo Finance error: ${yfRes.statusText}`, 502);
                    }
                    
                    const data = await yfRes.json();
                    
                    // Extract close prices and timestamps
                    const result = data.chart.result[0];
                    const timestamps = result.timestamp;
                    const closes = result.indicators.quote[0].close;
                    
                    // Filter out nulls
                    const validData = [];
                    for(let i=0; i<closes.length; i++) {
                        if (closes[i] !== null) {
                            validData.push({
                                time: timestamps[i],
                                close: closes[i]
                            });
                        }
                    }
                    
                    return json({ symbol, data: validData });
                } catch (e) {
                    return error(e.message);
                }
            }
            return error("Method not allowed", 405);
        }

        // ==========================================
        // /api/opportunities Endpoint for History
        // ==========================================
        if (pathParts[0] === 'api' && pathParts[1] === 'opportunities') {
            // POST /api/opportunities (Evaluate and Return Statelessly)
            if (request.method === 'POST' && pathParts.length === 2) {
                try {
                    const apiKey = env.GEMINI_API_KEY;
                    if (!apiKey) return error("Gemini API key is not configured", 500);

                    const body = await request.json();
                    const { opportunityType, niche, realityInputs } = body;
                    
                    const systemPrompt = `You are a panel of four expert personas evaluating a money-making opportunity the user describes. Your job is to stress-test the idea from multiple angles — NOT to talk each other into a "yes." Every opportunity carries real risk of loss, including total loss of capital.
You have access to Google Search. You MUST search for the niche's market size, typical pricing, challenges, and regulations before evaluating. Use the facts you find to ground your evaluation.

INPUT:
Opportunity Type: ${opportunityType}
Niche: ${niche || 'General'}
Reality Inputs:
- Capital: $${realityInputs.capital}
- Hours/week: ${realityInputs.hoursPerWeek}
- Skills: ${realityInputs.skills}
- Audience Size: ${realityInputs.audienceSize}
- Monetization Model: ${realityInputs.monetization}
- Timeline: ${realityInputs.timeline}
- Geography: ${realityInputs.geography || 'N/A'}

PERSONAS:
1. THE ENTREPRENEUR — CAC/LTV, sales motion, realistic customer acquisition given the person's actual audience/capital.
2. THE PRAGMATIST — macro conditions, regulatory/legal exposure, timing. Focuses on the facts found via search.
3. THE CRITIC — credibility gap, why generic playbooks fail in this niche, whether the person's actual skills match what the niche needs.
4. THE OPERATOR — if the opportunity passes, what the first 30/60/90 days should look like.

EVALUATION FORMAT:
Provide the evaluation for each persona, clearly labeled.
Distinguish verified facts (from search) from reasoned inference.

After the personas, provide a VERDICT BLOCK in this exact JSON format (do not wrap in markdown code blocks, just raw JSON at the very end of your response after the text):
{"score": [1-10], "risks": ["risk 1", "risk 2", "risk 3"], "nextStep": "concrete micro-step"}
`;

                    // Call Gemini API with Google Search grounding
                    const requestBody = {
                        contents: [{ parts: [{ text: systemPrompt }] }],
                        generationConfig: { temperature: 0.7, topK: 40, topP: 0.95 },
                        tools: [{ googleSearch: {} }] // Enable Google Search
                    };

                    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;
                    const aiRes = await fetch(geminiUrl, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(requestBody)
                    });

                    if (!aiRes.ok) {
                        const errText = await aiRes.text();
                        return error("Gemini API Error: " + errText, 502);
                    }

                    const aiData = await aiRes.json();
                    if (!aiData.candidates || aiData.candidates.length === 0) {
                        return error("Gemini API returned no content.", 500);
                    }

                    const resultText = aiData.candidates[0].content.parts[0].text;
                    
                    // Parse the JSON block at the end
                    let score = 0, risks = [], nextStep = "";
                    let panelOutput = resultText;
                    
                    const jsonMatch = resultText.match(/\{[\s\S]*"score"[\s\S]*\}/);
                    if (jsonMatch) {
                        try {
                            const parsed = JSON.parse(jsonMatch[0]);
                            score = parsed.score || 0;
                            risks = parsed.risks || [];
                            nextStep = parsed.nextStep || "";
                            // Remove the JSON from the text
                            panelOutput = resultText.replace(jsonMatch[0], '').trim();
                        } catch (e) {
                            console.error("Failed to parse verdict JSON", e);
                        }
                    }

                    const id = crypto.randomUUID();
                    const now = new Date().toISOString();
                    
                    return json({
                        id,
                        opportunityType,
                        niche,
                        realityInputs,
                        panelOutput,
                        score,
                        risks,
                        nextStep,
                        createdAt: now
                    });

                } catch (e) {
                    return error(e.message);
                }
            }
            return error("Method not allowed", 405);
        }

        // ==========================================
        // Static Asset Fallback
        // ==========================================
        if (env.ASSETS) {
            // For root, explicitly serve index.html to ensure it doesn't try to look up empty path
            if (url.pathname === '/') {
                return env.ASSETS.fetch(new Request(new URL('/index.html', request.url), request));
            }
            return env.ASSETS.fetch(request);
        }

        return new Response("Not found", { status: 404 });
    }
}
