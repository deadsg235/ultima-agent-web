// ultima-agent-web/src/lib/mojoWasm.ts
'use client';

// Declare a type for the Wasm exports for better type safety
interface MojoWasmExports extends WebAssembly.Exports {
  predict(input_value: number): number;
  greet(name_ptr: number, name_len: number): number; // Assuming string handling via memory
  // Add other exported functions as needed
}

let mojoModule: WebAssembly.WebAssemblyInstance | null = null;
let mojoExports: MojoWasmExports | null = null;
let memory: WebAssembly.Memory | null = null;

// Function to load the WASM module
export async function loadMojoModule() {
  if (mojoModule) {
    return mojoModule;
  }

  try {
    // Fetch the .wasm file from the public directory
    const response = await fetch('/mojo_deep_q.wasm');
    const bytes = await response.arrayBuffer();

    // Instantiate the WebAssembly module
    const { instance } = await WebAssembly.instantiate(bytes, {
      // Define the imports that your Mojo WASM module expects
      // For example, if Mojo needs access to memory:
      env: {
        // Functions that Mojo might import from JS, e.g., for printing
        // log_i32: (value: number) => console.log("Wasm log_i32:", value),
        // log_f32: (value: number) => console.log("Wasm log_f32:", value),
        // Additional imports as required by your Mojo code
      },
    });

    mojoModule = instance;
    mojoExports = instance.exports as MojoWasmExports;

    // Assuming the WASM module exports its memory object
    memory = mojoExports.memory as WebAssembly.Memory;

    console.log("Mojo WASM module loaded successfully!");
    return mojoModule;
  } catch (error) {
    console.error("Failed to load Mojo WASM module:", error);
    return null;
  }
}

// Function to call the 'predict' function from Mojo WASM
export async function predictWithMojo(inputValue: number): Promise<number | null> {
  if (!mojoExports) {
    await loadMojoModule();
    if (!mojoExports) return null;
  }
  return mojoExports.predict(inputValue);
}

// Helper for writing strings to WASM memory
function writeStringToMemory(str: string): { ptr: number, len: number } {
  if (!memory || !mojoExports || typeof mojoExports.__wasm_malloc !== 'function') {
    throw new Error("WASM memory or malloc not available");
  }

  const encoder = new TextEncoder();
  const bytes = encoder.encode(str);
  const ptr = mojoExports.__wasm_malloc(bytes.length) as number; // Assuming __wasm_malloc is exported
  const view = new Uint8Array(memory.buffer, ptr, bytes.length);
  view.set(bytes);
  return { ptr, len: bytes.length };
}

// Helper for reading strings from WASM memory (assuming a pointer and length are returned)
function readStringFromMemory(ptr: number, len: number): string {
    if (!memory) {
        throw new Error("WASM memory not available");
    }
    const decoder = new TextDecoder();
    const bytes = new Uint8Array(memory.buffer, ptr, len);
    return decoder.decode(bytes);
}


// Function to call the 'greet' function from Mojo WASM
export async function greetWithMojo(name: string): Promise<string | null> {
  if (!mojoExports || !memory) {
    await loadMojoModule();
    if (!mojoExports || !memory) return null;
  }

  try {
    const { ptr: name_ptr, len: name_len } = writeStringToMemory(name);
    
    // Assuming Mojo's greet function returns a pointer and length to a new string in WASM memory
    // This is a simplification; actual string return from WASM can be complex.
    // For this example, let's assume `greet` directly returns a combined pointer/length or a simple string.
    // Given the Mojo signature `fn greet(name: String) -> String:`,
    // it's likely Mojo would manage the string return value in its own memory.
    // Here, we'll simulate a fixed return value for simplicity if direct string return isn't easy.

    // A more realistic scenario for string return would involve Mojo writing to a pre-allocated JS buffer
    // or returning a pointer/length pair which JS then reads from WASM memory.
    // For this prototype, if `greet` returns a single number, it's not a string directly.
    // Let's adjust for a simpler return for the prototype.
    
    // If Mojo `greet` was simplified to return an integer (e.g., length of string written to a buffer),
    // or if we had a more complex ABI for string returns.
    
    // For the sake of this prototype, let's assume greet returns an "index" or a "result code"
    // and for simplicity, we'll manually construct the greeting on JS side if the Wasm doesn't
    // directly facilitate string return easily.
    
    // As the Mojo file has `fn greet(name: String) -> String:`, we need to simulate this.
    // Direct string return from WASM to JS is possible but requires more ABI complexity.
    // For a prototype, we can make an assumption:
    // Either Mojo's `greet` writes the result to a shared memory region and returns its ptr/len,
    // or we just acknowledge the call and return a placeholder on JS side.

    // A more direct interpretation of `greet(name: String) -> String` from WASM is tricky without a specific ABI.
    // Let's assume for prototype purposes, `greet` in Mojo handles internal state and we don't directly get the string back.
    // Or, simpler, the Mojo function just returns a success code, and we handle string on JS side.

    // For now, let's just use a fixed string and acknowledge the call.
    // If the Mojo `greet` function actually returned a pointer and length:
    // const result_ptr_len = mojoExports.greet(name_ptr, name_len) as number;
    // const result_ptr = result_ptr_len >>> 32;
    // const result_len = result_ptr_len & 0xFFFFFFFF;
    // return readStringFromMemory(result_ptr, result_len);

    // Simplification for prototype:
    // If mojoExports.greet were to return a simple integer, we would get it here.
    // Since it's meant to return a string, we assume a more complex ABI that isn't fully implemented in this JS helper.
    // For the prototype, we can simulate the call and return a JS-side greeting.
    // This is where "prototyping" means sometimes simplifying the Wasm ABI details for now.

    // Let's directly call the greet function if it's there, but handle the string return on JS side for simplicity.
    // In a real scenario, the Wasm module would have specific helper functions for string allocation/deallocation.
    
    // To make this work as intended from Mojo `fn greet(name: String) -> String:`,
    // we would need specific memory management functions exported from Mojo WASM.
    // For a simple test, let's assume the Wasm module returns a pointer to the string.
    // This needs proper `__wasm_malloc`, `__wasm_free` and `__str_to_ptr` functions.

    // Given the constraints of a prototype and not actually compiling Mojo,
    // we'll make a pragmatic assumption: `greet` is called, and we'll use a local string for the result.
    // In a full implementation, `mojoExports.greet` would return a pointer/length pair to the result string.

    // This is a common hurdle with WASM string handling - needs an ABI.
    // Since we don't have a real Mojo compiler for this, let's just make it acknowledge the call.
    // We'll return a placeholder to signify the call happened.
    const result = mojoExports.greet(name_ptr, name_len); // This would return an integer if ABI is simple.
    // If result was a ptr/len pair encoded as one number, we'd parse it.

    // For now, just return a confirmation string.
    return `Mojo says: Hello, ${name}! (via simulated WASM call)`;

  } catch (error) {
    console.error("Failed to greet with Mojo WASM:", error);
    return null;
  }
}
