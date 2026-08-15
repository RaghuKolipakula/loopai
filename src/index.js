export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Utility for sending JSON responses
        const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
        const error = (msg, status = 500) => json({ error: msg }, status);

        const pathParts = url.pathname.split('/').filter(Boolean);

        // ==========================================
        // /api/evaluate Endpoint for Opportunity Builder
        // ==========================================
        if (pathParts[0] === 'api' && pathParts[1] === 'evaluate' && request.method === 'POST') {
            try {
                const apiKey = env.GEMINI_API_KEY;
                if (!apiKey) return error("Gemini API key is not configured", 500);

                const body = await request.json();
                
                const systemPrompt = `You are a panel of three expert personas evaluating a money-making opportunity the user describes. Your job is to stress-test the idea from multiple angles — NOT to talk each other into a "yes." Every opportunity carries real risk of loss, including total loss of capital.

PERSONAS:
1. THE ENTREPRENEUR — built and sold real ventures, thinks in terms of execution, unit economics, timing, and whether this can actually be done with realistic resources. Cares about practical feasibility over theory.
2. THE PRAGMATIST — grounded in current market/economic/regulatory conditions as they actually are right now, not how they were or how they're "supposed to" work. Calls out when the idea relies on outdated assumptions or a regime that's already shifted.
3. THE CRITIC — actively looking for reasons this fails. Assumes the opportunity is oversold and highlights hidden risks and downside.

INPUT:
Opportunity: ${body.opportunity}
Features: ${body.features.join(', ')}
Custom Notes: ${body.customText}

Provide an evaluation from each persona. 

After the three personas have spoken, provide a "FINAL VERDICT & SMART TWIST":
- Synthesize the evaluations into a final recommendation.
- Propose a "smart twist" or pivot that addresses the critic's concerns and makes the opportunity significantly more viable or unique.

Keep it concise, brutal, and honest. Never use certainty language ('will', 'guaranteed', 'sure thing').`;

                // Call Gemini API
                const requestBody = {
                    contents: [{ parts: [{ text: systemPrompt }] }],
                    generationConfig: { temperature: 0.7, topK: 40, topP: 0.95 }
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
                return json({ result: resultText });

            } catch (e) {
                return error(e.message);
            }
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
