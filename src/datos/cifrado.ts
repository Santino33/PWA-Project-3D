/** Formato autocontenido: la sal y los parámetros sobreviven a cada recarga. */
export interface SobreCifrado {
  version: 1;
  salt: Uint8Array<ArrayBuffer>;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: ArrayBuffer;
  iterations: number;
}

const ITERACIONES = 210_000;
const codificador = new TextEncoder();
const decodificador = new TextDecoder("utf-8", { fatal: true });

async function derivarClave(password: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<CryptoKey> {
  if (!password) throw new Error("Introduce una contraseña");
  const base = await crypto.subtle.importKey("raw", codificador.encode(password), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    base,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function cifrarTexto(modeloId: string, texto: string, password: string): Promise<SobreCifrado> {
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("WebCrypto requiere un contexto seguro");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const clave = await derivarClave(password, salt, ITERACIONES);
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv, additionalData: codificador.encode(modeloId) },
    clave, codificador.encode(texto),
  );
  return { version: 1, salt, iv, ciphertext, iterations: ITERACIONES };
}

export async function descifrarTexto(modeloId: string, sobre: SobreCifrado, password: string): Promise<string> {
  if (typeof crypto === "undefined" || !crypto.subtle) throw new Error("WebCrypto requiere un contexto seguro");
  if (sobre.version !== 1 || sobre.salt?.byteLength !== 16 || sobre.iv?.byteLength !== 12 ||
    sobre.iterations !== ITERACIONES || !(sobre.ciphertext instanceof ArrayBuffer)) {
    throw new Error("Formato de nota cifrada no válido");
  }
  const clave = await derivarClave(password, sobre.salt, sobre.iterations);
  try {
    const bytes = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: sobre.iv, additionalData: codificador.encode(modeloId) },
      clave, sobre.ciphertext,
    );
    return decodificador.decode(bytes);
  } catch {
    throw new Error("Contraseña incorrecta o datos cifrados dañados");
  }
}
