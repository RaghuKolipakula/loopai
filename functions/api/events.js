export async function onRequest(context) {
    try {
        const apiKey = context.env.GEMINI_API_KEY;
        if (!apiKey) {
            return new Response(JSON.stringify({ error: "Gemini API key is not configured" }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }

        // Loop AI Prompting technique: give a strong persona, clear criteria, and exact JSON schema.
        const systemPrompt = `You are a highly reliable and selective local event curator for the Dallas-Fort Worth (DFW) area, specializing in family-friendly activities. 
Your goal is to provide a list of 4 to 6 of the most trending, proven, reliable, and high-quality events happening currently or in the near future in DFW. 
You must ONLY select events organized by reputable and high-class organizers.
Output the response EXACTLY as a JSON object with an 'events' array containing objects with:
- 'title' (string)
- 'date' (string, e.g., 'This Weekend', 'Oct 15 - 20', 'Ongoing')
- 'location' (string, e.g., 'Fort Worth Museum of Science', 'Klyde Warren Park')
- 'description' (string, 2-3 sentences max, engaging and descriptive)
- 'category' (string, e.g., 'STEM', 'Outdoors', 'Arts', 'Festival')
- 'organizer' (string, name of the reputable organizer)

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
                responseMimeType: "application/json" // Force JSON response if supported
            }
        };

        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

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
            return new Response(JSON.stringify({ error: "Failed to fetch from Gemini API" }), {
                status: 502,
                headers: { "Content-Type": "application/json" }
            });
        }

        const data = await response.json();
        const generatedText = data.candidates[0].content.parts[0].text;
        
        // Ensure it parses correctly
        const parsedEvents = JSON.parse(generatedText);

        return new Response(JSON.stringify(parsedEvents), {
            status: 200,
            headers: { 
                "Content-Type": "application/json",
                "Cache-Control": "max-age=300" // Cache for 5 minutes
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
