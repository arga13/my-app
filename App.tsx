import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { Header } from './components/Header';
import { InputPanel, InputValues } from './components/InputPanel';
import { OutputPanel, ParsedCode } from './components/OutputPanel';
import { translateToArduinoStream, explainArduinoCode } from './services/geminiService';

// Declare hljs to TypeScript since it's loaded from CDN
declare const hljs: any;

const initialInputs: InputValues = {
  libraries: '',
  declarations: '',
  setup: '',
  loop: '',
  functions: '',
};

const exampleInputs: InputValues = {
  libraries: '',
  declarations: 'pin ledUtama = 13\nkonstanta jeda = 1000',
  setup: 'atur ledUtama sebagai output',
  loop: 'kedipkanLed(ledUtama, jeda)\ntunggu 500 ms',
  functions: 'fungsi kedipkanLed(int pinLampu, int durasi)\n  nyalakan pinLampu\n  tunggu durasi ms\n  matikan pinLampu\n  tunggu durasi ms\nakhir fungsi',
};

const exampleArduinoCodeWithMarkers = `//<URUTAN:2>
// Mendefinisikan pin untuk LED utama di pin 13
int ledUtama = 13;
// Mendefinisikan konstanta untuk durasi jeda dalam milidetik
const int jeda = 1000;
//</URUTAN:2>
//<URUTAN:5>
// Fungsi kustom untuk mengedipkan LED
void kedipkanLed(int pinLampu, int durasi) {
  digitalWrite(pinLampu, HIGH); // Menyalakan LED pada pin yang ditentukan
  delay(durasi);                // Menunggu selama durasi yang ditentukan
  digitalWrite(pinLampu, LOW);  // Mematikan LED
  delay(durasi);                // Menunggu lagi selama durasi yang ditentukan
}
//</URUTAN:5>
//<URUTAN:3>
void setup() {
  // Mengatur pin ledUtama sebagai output
  pinMode(ledUtama, OUTPUT);
}
//</URUTAN:3>
//<URUTAN:4>
void loop() {
  // Memanggil fungsi untuk mengedipkan LED dengan parameter yang ditentukan
  kedipkanLed(ledUtama, jeda);
  // Menunggu selama 500 milidetik sebelum loop berikutnya
  delay(500);
}
//</URUTAN:4>`;

const parseArduinoCode = (rawCode: string): ParsedCode => {
    if (!rawCode.trim()) return [];

    const segments: ParsedCode = [];
    const regex = /\/\/<URUTAN:(\d+)>([\s\S]*?)\/\/<\/URUTAN:\1>/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(rawCode)) !== null) {
        // Capture text before the current match
        if (match.index > lastIndex) {
            segments.push({
                urutan: null,
                code: rawCode.substring(lastIndex, match.index),
            });
        }
        
        // Capture the matched group
        segments.push({
            urutan: parseInt(match[1], 10),
            code: match[2],
        });

        lastIndex = regex.lastIndex;
    }

    // Capture any remaining text after the last match
    if (lastIndex < rawCode.length) {
        segments.push({
            urutan: null,
            code: rawCode.substring(lastIndex),
        });
    }

    // Filter out empty segments that are just whitespace
    return segments.filter(s => s.code.trim().length > 0);
};

const escapeHtml = (unsafe: string) => {
    return unsafe
         .replace(/&/g, "&amp;")
         .replace(/</g, "&lt;")
         .replace(/>/g, "&gt;")
         .replace(/"/g, "&quot;")
         .replace(/'/g, "&#039;");
}


const App: React.FC = () => {
  const [inputs, setInputs] = useState<InputValues>(initialInputs);
  const [arduinoCode, setArduinoCode] = useState<ParsedCode>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [explanation, setExplanation] = useState<string>('');
  const [isExplaining, setIsExplaining] = useState<boolean>(false);
  const [explanationError, setExplanationError] = useState<string | null>(null);

  const latestRequestRef = useRef<number | null>(null);
  const explanationContainerRef = useRef<HTMLDivElement>(null);
  const [shareNotification, setShareNotification] = useState<string>('');

  const clearOutputs = () => {
    setArduinoCode([]);
    setError(null);
    setExplanation('');
    setExplanationError(null);
  }

  // Effect to load code from URL on initial mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const encodedCode = params.get('code');
    if (encodedCode) {
      try {
        const decodedString = atob(encodedCode);
        const parsedInputs: InputValues = JSON.parse(decodedString);
        // Basic validation
        if (typeof parsedInputs === 'object' && parsedInputs !== null) {
          setInputs({
            libraries: parsedInputs.libraries || '',
            declarations: parsedInputs.declarations || '',
            setup: parsedInputs.setup || '',
            loop: parsedInputs.loop || '',
            functions: parsedInputs.functions || '',
          });
        }
      } catch (e) {
        console.error("Failed to parse code from URL", e);
      }
    }
  }, []);


  const handleInputChange = useCallback((event: React.ChangeEvent<HTMLTextAreaElement>) => {
    const { name, value } = event.target;
    setInputs(prev => ({ ...prev, [name as keyof InputValues]: value }));
  }, []);
  
  const handleClearInput = useCallback((fieldName: keyof InputValues) => {
    setInputs(prev => ({ ...prev, [fieldName]: '' }));
  }, []);

  const handleClearAllInputs = useCallback(() => {
    setInputs(initialInputs);
  }, []);

  const handleLoadExample = useCallback(() => {
    latestRequestRef.current = Date.now();
    setInputs(exampleInputs);
    setArduinoCode(parseArduinoCode(exampleArduinoCodeWithMarkers));
    setError(null);
    setIsLoading(false);
    setExplanation('');
    setExplanationError(null);
  }, []);
  
  const handleShare = useCallback(() => {
    try {
      const jsonString = JSON.stringify(inputs);
      const encodedString = btoa(jsonString);
      const url = `${window.location.origin}${window.location.pathname}?code=${encodedString}`;
      navigator.clipboard.writeText(url);
      setShareNotification('Tautan disalin ke clipboard!');
      setTimeout(() => setShareNotification(''), 3000);
    } catch (e) {
      setShareNotification('Gagal menyalin tautan.');
      setTimeout(() => setShareNotification(''), 3000);
      console.error("Failed to create share link", e);
    }
  }, [inputs]);

  const triggerTranslation = useCallback(async (currentInputs: InputValues) => {
    const requestId = Date.now();
    latestRequestRef.current = requestId;

    const hasInput = Object.values(currentInputs).some(v => v.trim() !== '');
    if (!hasInput) {
      clearOutputs();
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    clearOutputs();
    
    let fullText = '';
    try {
      const stream = await translateToArduinoStream(currentInputs);
      for await (const chunk of stream) {
        if (latestRequestRef.current !== requestId) return;
        const textChunk = chunk.text;
        if (typeof textChunk === 'string') {
          fullText += textChunk;
        }
      }
      if (latestRequestRef.current === requestId) {
          const parsed = parseArduinoCode(fullText);
          setArduinoCode(parsed);
      }
    } catch (err: unknown) {
      if (latestRequestRef.current !== requestId) return;
      if (err instanceof Error) {
        setError(`Translation failed: ${err.message}`);
      } else {
        setError('An unknown error occurred during translation.');
      }
    } finally {
      if (latestRequestRef.current === requestId) {
        setIsLoading(false);
      }
    }
  }, []);

  const handleExplainCode = useCallback(async () => {
    const plainCode = arduinoCode.map(segment => segment.code).join('');
    if (!plainCode) return;
    
    setIsExplaining(true);
    setExplanation('');
    setExplanationError(null);
    
    let fullExplanation = '';
    try {
        const stream = await explainArduinoCode(plainCode);
        for await (const chunk of stream) {
             const textChunk = chunk.text;
             if (typeof textChunk === 'string') {
                fullExplanation += textChunk;
             }
        }
        setExplanation(fullExplanation);
    } catch(err: unknown) {
        if (err instanceof Error) {
            setExplanationError(`Failed to get explanation: ${err.message}`);
        } else {
            setExplanationError('An unknown error occurred while getting explanation.');
        }
    } finally {
        setIsExplaining(false);
    }
  }, [arduinoCode]);

  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      triggerTranslation(inputs);
    }, 750);

    return () => clearTimeout(debounceTimer);
  }, [inputs, triggerTranslation]);

  const formattedExplanation = useMemo(() => {
    if (!explanation) return '';

    const parts: string[] = [];
    let lastIndex = 0;
    const regex = /```cpp\n([\s\S]*?)\n```/g;
    let match;

    while ((match = regex.exec(explanation)) !== null) {
      // Process text before the match
      const textBefore = explanation.substring(lastIndex, match.index);
      let inlineProcessed = escapeHtml(textBefore)
        .replace(/`([^`]+?)`/g, `<code>${'$1'}</code>`)
        .replace(/\n/g, '<br />');
      parts.push(inlineProcessed);

      // Process the matched code block
      const code = match[1];
      parts.push(`<pre><code class="language-cpp">${escapeHtml(code)}</code></pre>`);
      
      lastIndex = regex.lastIndex;
    }

    // Process text after the last match
    const textAfter = explanation.substring(lastIndex);
    let finalPartProcessed = escapeHtml(textAfter)
      .replace(/`([^`]+?)`/g, `<code>${'$1'}</code>`)
      .replace(/\n/g, '<br />');
    parts.push(finalPartProcessed);

    return parts.join('');
  }, [explanation]);

  useEffect(() => {
    if (explanationContainerRef.current) {
      explanationContainerRef.current.querySelectorAll('pre code').forEach((block) => {
        try {
          hljs.highlightElement(block as HTMLElement);
        } catch (e) {
          console.error("Highlight.js error:", e);
        }
      });
    }
  }, [formattedExplanation]);

  return (
    <div className="relative min-h-screen bg-slate-950 text-slate-200 font-sans p-4 sm:p-6 lg:p-8 overflow-hidden">
       <div className="absolute top-0 left-0 -translate-x-1/4 -translate-y-1/2 w-[200%] h-[200%] bg-gradient-to-br from-cyan-500/10 via-transparent to-blue-500/10 blur-3xl opacity-50 pointer-events-none"></div>
      
      <div className="relative max-w-7xl mx-auto z-10">
        <Header onShare={handleShare} shareNotification={shareNotification} />
        <main className="mt-8 grid grid-cols-1 lg:grid-cols-2 lg:gap-8 items-start">
          <InputPanel
            values={inputs}
            onChange={handleInputChange}
            onLoadExample={handleLoadExample}
            onClearInput={handleClearInput}
            onClearAll={handleClearAllInputs}
          />
          <div className="flex flex-col gap-8">
            <OutputPanel
              code={arduinoCode}
              isLoading={isLoading}
              error={error}
              onExplain={handleExplainCode}
              isExplaining={isExplaining}
            />
             {(explanation || isExplaining || explanationError) && (
              <div className="bg-slate-800/30 p-6 rounded-xl shadow-2xl border border-slate-700/50 backdrop-blur-sm">
                <h3 className="text-xl font-bold text-slate-100 mb-4 bg-clip-text text-transparent bg-gradient-to-r from-slate-200 to-slate-400">
                    Penjelasan Kode
                </h3>
                {isExplaining && !explanation && (
                  <div className="flex items-center justify-center text-slate-400 py-8">
                     <div className="w-8 h-8 border-4 border-cyan-400 border-t-transparent rounded-full animate-spin mr-3"></div>
                     AI sedang menganalisis...
                  </div>
                )}
                {explanationError && (
                    <div className="text-red-300 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
                        <p className="font-semibold">Terjadi Kesalahan</p>
                        <p className="text-sm">{explanationError}</p>
                    </div>
                )}
                {explanation && (
                    <div
                      ref={explanationContainerRef}
                      className="prose prose-invert prose-sm max-w-none text-slate-300 prose-code:bg-slate-700/50 prose-code:rounded prose-code:px-1.5 prose-code:py-1 prose-code:text-sm prose-code:font-mono prose-pre:bg-slate-900/70 prose-pre:border prose-pre:border-slate-700 prose-pre:rounded-lg"
                      dangerouslySetInnerHTML={{ __html: formattedExplanation }}
                    />
                )}
              </div>
            )}
          </div>
        </main>
        <footer className="text-center mt-12 text-slate-500 text-sm">
          <p>Created by ARGA. Designed for educational purposes.</p>
        </footer>
      </div>
    </div>
  );
};

export default App;