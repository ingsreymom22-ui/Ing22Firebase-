// URL-Safe Base64 encoder and decoder with full Unicode/UTF-8 support

export const encodeToURLSafeBase64 = (obj: any): string => {
  try {
    const str = JSON.stringify(obj);
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch (err) {
    console.error("Base64 Encoding Error:", err);
    return '';
  }
};

export const decodeFromURLSafeBase64 = (base64: string): any => {
  try {
    let binary = base64.replace(/-/g, '+').replace(/_/g, '/');
    while (binary.length % 4) {
      binary += '=';
    }
    const str = atob(binary);
    const len = str.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = str.charCodeAt(i);
    }
    const decodedStr = new TextDecoder().decode(bytes);
    return JSON.parse(decodedStr);
  } catch (err) {
    console.error("Base64 Decoding Error:", err);
    return null;
  }
};

/**
 * Compresses an object using browser native gzip CompressionStream when available.
 * Falls back to raw stringified JSON if unsupported or failed.
 */
export const compressObject = async (obj: any): Promise<{ compressed: string; isCompressed: boolean }> => {
  const jsonStr = safeJsonStringify(obj);
  
  // Optimization: If the content is small (< 100KB), compression overhead and potential hangs 
  // aren't justified. Firestore limit is 1MB.
  if (jsonStr.length < 100000) {
    return { compressed: jsonStr, isCompressed: false };
  }

  try {
    if (typeof CompressionStream === 'undefined') {
      console.warn("CompressionStream not supported in this client. Saving uncompressed.");
      return { compressed: jsonStr, isCompressed: false };
    }

    // Add a 5 second timeout to the compression process to prevent persistent spinning UI
    const compressionWorker = async () => {
      const stream = new Blob([jsonStr]).stream();
      const compressedStream = stream.pipeThrough(new CompressionStream("gzip"));
      
      // Use Response to read the entire stream as an ArrayBuffer - more robust than manual reader loops
      const arrayBuffer = await new Response(compressedStream).arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      let binary = '';
      const len = bytes.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return btoa(binary);
    };

    const timeout = (ms: number) => new Promise<null>((_, reject) => setTimeout(() => reject(new Error("Compression timeout")), ms));

    const base64Str = await Promise.race([
      compressionWorker(),
      timeout(15000)
    ]);

    if (base64Str && base64Str.length < jsonStr.length) {
      return { compressed: base64Str, isCompressed: true };
    }
    
    return { compressed: jsonStr, isCompressed: false };
  } catch (err) {
    console.warn("Compression failed or timed out, using uncompressed:", err);
    return { compressed: jsonStr, isCompressed: false };
  }
};

/**
 * Decompresses a compressed base64 string using DecompressionStream,
 * or parses it as raw JSON if not compressed.
 */
export const decompressObject = async (dataStr: string, isCompressed: boolean): Promise<any> => {
  if (!isCompressed) {
    try {
      return JSON.parse(dataStr);
    } catch (err) {
      console.error("JSON parse failed for uncompressed shared note:", err);
      return {};
    }
  }

  if (typeof DecompressionStream === 'undefined') {
    throw new Error("DecompressionStream is not supported in this client. Cannot decode compressed notes.");
  }

  try {
    const binary = atob(dataStr);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binary.charCodeAt(i);
    }

    const stream = new Blob([bytes]).stream();
    const decompressedStream = stream.pipeThrough(new DecompressionStream("gzip"));
    const text = await new Response(decompressedStream).text();
    return JSON.parse(text);
  } catch (err) {
    console.error("Decompression failed:", err);
    throw err;
  }
};

/**
 * Circular-safe stringifer to prevent infinite recursion on self-referencing objects.
 */
export const safeJsonStringify = (obj: any): string => {
  const seen = new WeakSet();
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === "object" && value !== null) {
      if (seen.has(value)) {
        return undefined; // Prune circularity
      }
      seen.add(value);
    }
    return value;
  });
};
