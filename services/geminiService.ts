interface InputValues {
  libraries: string;
  declarations: string;
  setup: string;
  loop: string;
  functions: string;
}

// Helper function to decode stream chunks into structured text
async function* streamToAsyncIterator(stream: ReadableStream<Uint8Array>) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) return;
      // The response from the serverless function is just the text,
      // so we wrap it in the expected object structure.
      yield { text: decoder.decode(value) };
    }
  } finally {
    reader.releaseLock();
  }
}

export const translateToArduinoStream = async (inputs: InputValues) => {
  const hasInput = Object.values(inputs).some(v => v.trim() !== '');
  if (!hasInput) {
    return (async function* () {})();
  }
  
  try {
    const response = await fetch('/.netlify/functions/translate-arduino', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(inputs),
    });

    if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(`Serverless function failed: ${response.status} ${errorBody}`);
    }
    
    if (!response.body) {
        return (async function* () {})();
    }

    return streamToAsyncIterator(response.body);

  } catch (error: unknown) {
    console.error("Error calling translate-arduino function:", error);
    if (error instanceof Error) {
        throw new Error(`Function Call Error: ${error.message}`);
    }
    throw new Error("An unknown error occurred while calling the translation function.");
  }
};

export const explainArduinoCode = async (code: string) => {
    try {
        const response = await fetch('/.netlify/functions/explain-arduino', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ code }),
        });
        
        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`Serverless function failed: ${response.status} ${errorBody}`);
        }
        
        if (!response.body) {
            return (async function* () {})();
        }

        return streamToAsyncIterator(response.body);

    } catch(error: unknown) {
        console.error("Error calling explain-arduino function:", error);
        if (error instanceof Error) {
            throw new Error(`Function Call Error: ${error.message}`);
        }
        throw new Error("An unknown error occurred while calling the explanation function.");
    }
};
