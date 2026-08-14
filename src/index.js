export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // --- GET /api/topic ---
        // Returns the currently active topic
        if (url.pathname === '/api/topic' && request.method === 'GET') {
            try {
                let topic = "DFW Family Events"; // Default
                if (env.LOOPAI_STORE) {
                    const storedTopic = await env.LOOPAI_STORE.get("CURRENT_TOPIC");
                    if (storedTopic) topic = storedTopic;
                }
                return new Response(JSON.stringify({ topic }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }

        // --- POST /api/topic ---
        // Saves a new topic (protected by ADMIN_PASSWORD)
        if (url.pathname === '/api/topic' && request.method === 'POST') {
            try {
                const body = await request.json();
                const { topic, password } = body;

                // Check Admin Password
                const adminPassword = env.ADMIN_PASSWORD;
                if (!adminPassword) {
                    return new Response(JSON.stringify({ error: "ADMIN_PASSWORD is not configured in Cloudflare." }), { status: 500 });
                }
                if (password !== adminPassword) {
                    return new Response(JSON.stringify({ error: "Invalid admin password." }), { status: 401 });
                }
                if (!topic || topic.trim() === "") {
                    return new Response(JSON.stringify({ error: "Topic cannot be empty." }), { status: 400 });
                }

                if (!env.LOOPAI_STORE) {
                    return new Response(JSON.stringify({ error: "LOOPAI_STORE KV namespace is not bound in Cloudflare." }), { status: 500 });
                }

                await env.LOOPAI_STORE.put("CURRENT_TOPIC", topic.trim());

                return new Response(JSON.stringify({ success: true, topic: topic.trim() }), {
                    status: 200,
                    headers: { "Content-Type": "application/json" }
                });
            } catch (error) {
                return new Response(JSON.stringify({ error: error.message }), { status: 500 });
            }
        }

        // --- GET /api/events ---
        // Generates events based on the dynamic topic
        if (url.pathname === '/api/events' && request.method === 'GET') {
            try {
                const apiKey = env.GEMINI_API_KEY;
                if (!apiKey) {
                    return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), {
                        status: 500,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Fetch dynamic topic from KV
                let topic = "Top Family Events in DFW";
                if (env.LOOPAI_STORE) {
                    const storedTopic = await env.LOOPAI_STORE.get("CURRENT_TOPIC");
                    if (storedTopic) topic = storedTopic;
                }

                const systemPrompt = `You are a highly reliable AI curator.
The user has provided the following prompt/topic: "${topic}"

Your goal is to provide a list of 4 to 6 high-quality results that perfectly match the user's prompt.
Output the response EXACTLY as a JSON object with an 'items' array containing objects with:
- 'title' (string, the name of the item/event/place/idea)
- 'subtitle' (string, e.g., a date, a price, or a short sub-label)
- 'detail' (string, e.g., a location, an author, or a specific detail)
- 'description' (string, 2-3 sentences max, engaging and descriptive)
- 'category' (string, e.g., a tag or genre)
- 'footer' (string, e.g., an organizer, a rating, or an extra note)

Do NOT include markdown formatting like \`\`\`json or \`\`\`. Just return the raw JSON object.`;

                const requestBody = {
                    contents: [{
                        parts: [{
                            text: systemPrompt
                        }]
                    }],
                    generationConfig: {
                        temperature: 0.4,
                        topK: 40,
                        topP: 0.95,
                        responseMimeType: "application/json"
                    }
                };

                const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

                const response = await fetch(geminiUrl, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(requestBody)
                });

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error("Gemini API Error:", errorData);
                    return new Response(JSON.stringify({ error: "Failed to fetch from Gemini API: " + errorData }), {
                        status: 502,
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const data = await response.json();
                let generatedText = data.candidates[0].content.parts[0].text;
                
                // Strip markdown formatting if Gemini mistakenly included it
                generatedText = generatedText.replace(/^```json/mi, '').replace(/```$/mi, '').trim();
                
                const parsedData = JSON.parse(generatedText);

                return new Response(JSON.stringify(parsedData), {
                    status: 200,
                    headers: { 
                        "Content-Type": "application/json",
                        "Cache-Control": "no-cache, no-store, must-revalidate"
                    }
                });

            } catch (error) {
                console.error("Worker error:", error);
                return new Response(JSON.stringify({ error: error.message }), {
                    status: 500,
                    headers: { "Content-Type": "application/json" }
                });
            }
        }

        // Static Assets fallback
        return new Response("Not found", { status: 404 });
    }
}
