import { GoogleGenAI } from "@google/genai";

interface InputValues {
  libraries: string;
  declarations: string;
  setup: string;
  loop: string;
  functions: string;
}

const buildPseudoCodeFromInputs = (inputs: InputValues): string => {
  const parts: string[] = [];
  if (inputs.libraries.trim()) {
    parts.push(`(urutan 1) ${inputs.libraries.trim()}`);
  }
  if (inputs.declarations.trim()) {
    parts.push(...inputs.declarations.trim().split('\n').filter(line => line.trim()).map(line => `(urutan 2) ${line.trim()}`));
  }
  if (inputs.setup.trim()) {
    parts.push(...inputs.setup.trim().split('\n').filter(line => line.trim()).map(line => `(urutan 3) ${line.trim()}`));
  }
  if (inputs.loop.trim()) {
    parts.push(...inputs.loop.trim().split('\n').filter(line => line.trim()).map(line => `(urutan 4) ${line.trim()}`));
  }
  if (inputs.functions.trim()) {
    parts.push(...inputs.functions.trim().split('\n').filter(line => line.trim()).map(line => `(urutan 5) ${line.trim()}`));
  }
  return parts.join('\n');
};

const buildPrompt = (pseudoCode: string): string => {
  return `
Kamu adalah penerjemah khusus yang mengubah bahasa pseudo menjadi kode Arduino C++.

Aturan:
1. Input akan diberikan dalam bahasa pseudo dengan format urutan (urutan 1, urutan 2, dst).
2. Setiap urutan mendefinisikan bagian program Arduino.
   - Urutan 1 → library yang perlu ditambahkan.
   - Urutan 2 → deklarasi pin atau variabel.
   - Urutan 3 → inisialisasi pin (setup).
   - Urutan 4 → fungsi utama (loop).
   - Urutan 5 dan seterusnya → fungsi tambahan jika ada.
3. Hasil harus berupa kode Arduino C++ yang lengkap, siap untuk di-compile.
4. Tambahkan komentar pada setiap baris untuk menjelaskan apa yang dilakukan kode.
5. PENTING: Bungkus setiap bagian kode yang sesuai dengan urutan input menggunakan penanda komentar khusus. Gunakan \`//<URUTAN:X>\` sebelum bagian tersebut dan \`//</URUTAN:X>\` setelahnya, di mana X adalah nomor urutan (1, 2, 3, 4, atau 5).
6. Jangan menambahkan penjelasan lain di luar kode. HANYA KEMBALIKAN KODE C++ SECARA LANGSUNG. JANGAN gunakan blok markdown.

Contoh Input:
(urutan 2) pin LED = 4
(urutan 3) inisiasi LED sebagai output
(urutan 4) fungsi lampu berkedip

Contoh Output:
//<URUTAN:2>
int LED = 4; // Mendefinisikan pin LED di pin 4
//</URUTAN:2>
//<URUTAN:3>
void setup() {
  pinMode(LED, OUTPUT); // Menjadikan pin LED sebagai output
}
//</URUTAN:3>
//<URUTAN:4>
void loop() {
  digitalWrite(LED, HIGH);  // Nyalakan LED
  delay(500);               // Tunggu 0.5 detik
  digitalWrite(LED, LOW);   // Matikan LED
  delay(500);               // Tunggu 0.5 detik
}
//</URUTAN:4>

---
SEKARANG TERJEMAHKAN INPUT BERIKUT:

${pseudoCode}
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
    const inputs: InputValues = await req.json();
    const pseudoCode = buildPseudoCodeFromInputs(inputs);

    if (!pseudoCode) {
      return new Response('', { status: 200 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const fullPrompt = buildPrompt(pseudoCode);

    const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: fullPrompt
    });

    // Create a new readable stream to pipe the response
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
    console.error("Error in Netlify function:", error);
    const errorMessage = error instanceof Error ? error.message : 'An unknown error occurred';
    return new Response(JSON.stringify({ error: `Function Error: ${errorMessage}` }), { status: 500 });
  }
};
