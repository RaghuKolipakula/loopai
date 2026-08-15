export default {
    async fetch(request, env, ctx) {
        const url = new URL(request.url);

        // Utility for sending JSON responses
        const json = (data, status = 200) => new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
        const error = (msg, status = 500) => json({ error: msg }, status);

        if (!env.LOOPAI_STORE) {
            return error("KV LOOPAI_STORE is not bound.", 500);
        }

        const pathParts = url.pathname.split('/').filter(Boolean);

        // ==========================================
        // /api/forms Endpoints
        // ==========================================
        if (pathParts[0] === 'api' && pathParts[1] === 'forms') {
            const formId = pathParts[2];
            const action = pathParts[3];

            // --- GET /api/forms (List all forms) ---
            if (!formId && request.method === 'GET') {
                try {
                    const formsListRaw = await env.LOOPAI_STORE.get("forms_list");
                    const formsList = formsListRaw ? JSON.parse(formsListRaw) : [];
                    return json(formsList);
                } catch (e) {
                    return error(e.message);
                }
            }

            // --- POST /api/forms (Create new form) ---
            if (!formId && request.method === 'POST') {
                try {
                    const body = await request.json();
                    const id = Math.random().toString(36).substring(2, 9);
                    const newForm = { formId: id, ...body };
                    
                    await env.LOOPAI_STORE.put(`form:${id}`, JSON.stringify(newForm));
                    
                    const formsListRaw = await env.LOOPAI_STORE.get("forms_list");
                    const formsList = formsListRaw ? JSON.parse(formsListRaw) : [];
                    formsList.push({ id, title: body.title || "Untitled Form" });
                    await env.LOOPAI_STORE.put("forms_list", JSON.stringify(formsList));

                    return json(newForm, 201);
                } catch (e) {
                    return error(e.message);
                }
            }

            // --- GET /api/forms/:id (Get form config) ---
            if (formId && !action && request.method === 'GET') {
                try {
                    const formStr = await env.LOOPAI_STORE.get(`form:${formId}`);
                    if (!formStr) return error("Form not found", 404);
                    return json(JSON.parse(formStr));
                } catch (e) {
                    return error(e.message);
                }
            }

            // --- PUT /api/forms/:id (Update form config) ---
            if (formId && !action && request.method === 'PUT') {
                try {
                    const body = await request.json();
                    body.formId = formId; // Ensure ID remains the same
                    await env.LOOPAI_STORE.put(`form:${formId}`, JSON.stringify(body));

                    const formsListRaw = await env.LOOPAI_STORE.get("forms_list");
                    let formsList = formsListRaw ? JSON.parse(formsListRaw) : [];
                    const index = formsList.findIndex(f => f.id === formId);
                    if (index !== -1) {
                        formsList[index].title = body.title || "Untitled Form";
                    } else {
                        formsList.push({ id: formId, title: body.title || "Untitled Form" });
                    }
                    await env.LOOPAI_STORE.put("forms_list", JSON.stringify(formsList));

                    return json(body);
                } catch (e) {
                    return error(e.message);
                }
            }

            // --- DELETE /api/forms/:id (Delete form config) ---
            if (formId && !action && request.method === 'DELETE') {
                try {
                    await env.LOOPAI_STORE.delete(`form:${formId}`);
                    
                    const formsListRaw = await env.LOOPAI_STORE.get("forms_list");
                    let formsList = formsListRaw ? JSON.parse(formsListRaw) : [];
                    formsList = formsList.filter(f => f.id !== formId);
                    await env.LOOPAI_STORE.put("forms_list", JSON.stringify(formsList));

                    return json({ success: true });
                } catch (e) {
                    return error(e.message);
                }
            }

            // --- POST /api/forms/:id/submit (Execute Prompt) ---
            if (formId && action === 'submit' && request.method === 'POST') {
                try {
                    const apiKey = env.GEMINI_API_KEY;
                    if (!apiKey) return error("Gemini API key is not configured", 500);

                    const formStr = await env.LOOPAI_STORE.get(`form:${formId}`);
                    if (!formStr) return error("Form not found", 404);
                    const formConfig = JSON.parse(formStr);

                    const userInputs = await request.json(); // e.g. { tone: "Formal", product_name: "Apple" }

                    // Construct prompt
                    let finalPrompt = formConfig.promptTemplate || "";
                    for (const field of formConfig.fields) {
                        const val = userInputs[field.key] || field.default || "";
                        // Replace all occurrences of {{key}}
                        const regex = new RegExp(`\\{\\{${field.key}\\}\\}`, 'g');
                        finalPrompt = finalPrompt.replace(regex, val);
                    }

                    // Call Gemini API
                    const requestBody = {
                        contents: [{ parts: [{ text: finalPrompt }] }],
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
                    return json({ result: resultText, finalPrompt: finalPrompt });

                } catch (e) {
                    return error(e.message);
                }
            }

            return error("Not found", 404);
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
