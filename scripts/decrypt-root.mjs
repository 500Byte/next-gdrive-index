// Script para desencriptar ROOT_FOLDER y regenerarlo correctamente
async function decrypt(hash, key) {
  const [cipherText, iv] = hash.split(";");
  if (!cipherText || !iv) throw new Error("Invalid hash format");

  const ivBytes = hexToUint8Array(iv);
  const cipherBytes = hexToUint8Array(cipherText);
  
  const alg = { name: "AES-GCM", iv: ivBytes };
  const keyhash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const secretKey = await crypto.subtle.importKey("raw", keyhash, alg, false, ["decrypt"]);
  
  const decryptedData = await crypto.subtle.decrypt(alg, secretKey, cipherBytes);
  return new TextDecoder().decode(decryptedData);
}

async function encrypt(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const alg = { name: "AES-GCM", iv };
  const keyhash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key));
  const encodedData = new TextEncoder().encode(data);
  const secretKey = await crypto.subtle.importKey("raw", keyhash, alg, false, ["encrypt"]);
  
  const encryptedData = await crypto.subtle.encrypt(alg, secretKey, encodedData);
  return [
    uint8ArrayToHex(new Uint8Array(encryptedData)),
    uint8ArrayToHex(iv)
  ].join(";");
}

function hexToUint8Array(hex) {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) throw new Error("Invalid hex string");
  const bytes = matches.map(byte => parseInt(byte, 16));
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    view[i] = bytes[i];
  }
  return new Uint8Array(buffer);
}

function uint8ArrayToHex(arr) {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Valores actuales
const currentHash = "9b46eacdc2ce34c55d65a5c8abbda0b32811bec4b5131b294413072b1ccfdec9e58676f9e389edb8542bde8aa101b28056;57bc2f0a32c9e83e44f05cb8";
const key = "ukeimZ1dPkxOorwB6UnOovUbYaWZ9z0F";

async function main() {
  try {
    console.log("Intentando desencriptar ROOT_FOLDER...");
    const decrypted = await decrypt(currentHash, key);
    console.log("✅ Folder ID desencriptado:", decrypted);
    
    // Regenerar el hash con la misma clave
    console.log("\nRegenerando hash...");
    const newHash = await encrypt(decrypted, key);
    console.log("✅ Nuevo ROOT_FOLDER:", newHash);
    
    // Verificar que funciona
    console.log("\nVerificando...");
    const verify = await decrypt(newHash, key);
    console.log("✅ Verificación exitosa:", verify);
    
  } catch (e) {
    console.error("❌ Error:", e.message);
    console.log("\nEl hash actual no es válido con la ENCRYPTION_KEY actual.");
    console.log("Necesitas proporcionar el folder ID de Google Drive para regenerarlo.");
  }
}

main();
