import { GoogleGenAI } from "@google/genai";

interface RequestBody {
    code: string;
}

const buildPrompt = (code: string): string => {
    return `
Anda adalah seorang ahli Arduino yang sangat baik dalam mengajar pemula.
Jelaskan secara singkat dan umum apa yang dilakukan oleh kode Arduino berikut.
Fokus pada gambaran besar dan tujuan utamanya, HINDARI penjelasan rinci baris per baris.
Gunakan bahasa Indonesia yang jelas dan mudah dipahami.
PENTING: Gunakan markdown untuk menandai referensi kode. Gunakan backtick tunggal (\`code\`) untuk kode inline dan triple backtick dengan 'cpp' (\`\`\`cpp... \`\`\`) untuk blok kode.

Berikut adalah kodenya:
\`\`\`cpp
${code}
\`\`\`
    `;
};

// Netlify function handler
export default async (req: Request) => {
    if (req.method !== 'POST') {
        return new Response('Method Not Allowed', { status: 405 });
    }

    const apiKey = process.env.API_KEY;
    if (!apiKey) {
        return new Response('API key is not configured', { status: 500 });
    }
    
    try {
        const { code }: RequestBody = await req.json();
        if (!code) {
             return new Response('Code is required', { status: 400 });
        }

        const ai = new GoogleGenAI({ apiKey });
        const prompt = buildPrompt(code);

        const stream = await ai.models.generateContentStream({
            model: 'gemini-2.5-flash',
            contents: prompt
        });

        const readableStream = new ReadableStream({
            async start(controller) {
                for await (const chunk of stream) {
                    const text = chunk.text;
                    if (typeof text === 'string') {
                        controller.enqueue(new TextEncoder().encode(text));
                    }
                }
                controller.close();
            },
        });

        return new Response(readableStream, {
            headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        });

    } catch (error) {
        console.error("Error in Netlify explain function:", error);
        const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
        return new Response(JSON.stringify({ error: `Function Error: ${errorMessage}` }), { status: 500 });
    }
};
