#!/usr/bin/env node
/**
 * Diagnóstico completo del flujo de autenticación con Google Drive
 * Verifica: GD_SERVICE_B64 → JSON parsing → private_key → importPKCS8
 */

import { importPKCS8 } from "jose";
import { readFileSync } from "fs";
import { createHash } from "crypto";

console.log("═══════════════════════════════════════════════════════════");
console.log("🔍 DIAGNÓSTICO DE AUTENTICACIÓN GOOGLE DRIVE");
console.log("═══════════════════════════════════════════════════════════\n");

// 1. Verificar archivos fuente
console.log("📁 FASE 1: Verificación de archivos fuente\n");

let originalJson, envB64, devVarsB64;

try {
  originalJson = readFileSync("/home/diego/Downloads/next-gdrive-index-494617-208244068a47.json", "utf8");
  console.log("✅ Archivo original encontrado");
  console.log(`   Tamaño: ${originalJson.length} bytes`);
  
  const originalObj = JSON.parse(originalJson);
  console.log(`   Project ID: ${originalObj.project_id}`);
  console.log(`   Client Email: ${originalObj.client_email}`);
  console.log(`   Private Key Length: ${originalObj.private_key.length} chars`);
  console.log(`   Private Key newlines: ${(originalObj.private_key.match(/\n/g) || []).length}`);
} catch (e) {
  console.error("❌ Error leyendo archivo original:", e.message);
  process.exit(1);
}

try {
  const envContent = readFileSync("/home/diego/Documents/GitHub/next-gdrive-index/.env", "utf8");
  envB64 = envContent.match(/GD_SERVICE_B64=(.+)/)?.[1];
  console.log(`\n✅ .env encontrado, GD_SERVICE_B64: ${envB64 ? 'presente' : 'AUSENTE'}`);
  if (envB64) {
    console.log(`   Longitud: ${envB64.length} caracteres`);
  }
} catch (e) {
  console.error("❌ Error leyendo .env:", e.message);
}

try {
  const devVarsContent = readFileSync("/home/diego/Documents/GitHub/next-gdrive-index/.dev.vars", "utf8");
  devVarsB64 = devVarsContent.match(/GD_SERVICE_B64=(.+)/)?.[1];
  console.log(`✅ .dev.vars encontrado, GD_SERVICE_B64: ${devVarsB64 ? 'presente' : 'AUSENTE'}`);
  if (devVarsB64) {
    console.log(`   Longitud: ${devVarsB64.length} caracteres`);
  }
} catch (e) {
  console.error("❌ Error leyendo .dev.vars:", e.message);
}

// 2. Comparar hashes
console.log("\n📊 FASE 2: Comparación de contenido\n");

const originalHash = createHash("sha256").update(originalJson).digest("hex");
console.log(`Hash del JSON original: ${originalHash.substring(0, 16)}...`);

if (envB64) {
  try {
    const decoded = Buffer.from(envB64, "base64").toString("utf8");
    const envHash = createHash("sha256").update(decoded).digest("hex");
    console.log(`Hash de .env decoded:  ${envHash.substring(0, 16)}...`);
    console.log(`   Match: ${originalHash === envHash ? '✅ SÍ' : '❌ NO'}`);
    
    if (originalHash !== envHash) {
      console.log("\n   ⚠️  Diferencias detectadas:");
      const envObj = JSON.parse(decoded);
      const origObj = JSON.parse(originalJson);
      
      for (const key of Object.keys(origObj)) {
        if (origObj[key] !== envObj[key]) {
          console.log(`      - ${key}: diferente`);
          if (key === "private_key") {
            console.log(`        Original newlines: ${(origObj[key].match(/\n/g) || []).length}`);
            console.log(`        Env newlines: ${(envObj[key].match(/\n/g) || []).length}`);
            console.log(`        Original has \\n literal: ${origObj[key].includes('\\n')}`);
            console.log(`        Env has \\n literal: ${envObj[key].includes('\\n')}`);
          }
        }
      }
    }
  } catch (e) {
    console.error("❌ Error decodificando .env:", e.message);
  }
}

// 3. Probar importPKCS8
console.log("\n🔐 FASE 3: Prueba de importación de clave privada\n");

async function testKeyImport() {
  const testCases = [
    { name: "JSON original", data: originalJson },
    envB64 && { name: ".env decoded", data: Buffer.from(envB64, "base64").toString("utf8") },
    devVarsB64 && { name: ".dev.vars decoded", data: Buffer.from(devVarsB64, "base64").toString("utf8") }
  ].filter(Boolean);

  for (const testCase of testCases) {
    console.log(`\n   Probando: ${testCase.name}`);
    try {
      const obj = JSON.parse(testCase.data);
      let pk = obj.private_key;
      
      console.log(`      Longitud PK: ${pk.length}`);
      console.log(`      Contiene \\n literal: ${pk.includes('\\n')}`);
      console.log(`      Contiene newline real: ${pk.includes('\n')}`);
      
      // Intentar normalizar
      const normalizedPk = pk.replace(/\\n/g, "\n");
      console.log(`      Después de normalizar: ${normalizedPk.includes('\\n') ? 'aún tiene \\n' : 'OK'}`);
      
      // Intentar importar con jose
      try {
        const key = await importPKCS8(normalizedPk, "RS256");
        console.log(`      ✅ importPKCS8: ÉXITO`);
        console.log(`         Tipo: ${key.type}`);
        console.log(`         Algoritmo: ${key.algorithm.name}`);
      } catch (e) {
        console.log(`      ❌ importPKCS8: FALLÓ`);
        console.log(`         Error: ${e.message}`);
      }
      
    } catch (e) {
      console.log(`      ❌ Error: ${e.message}`);
    }
  }
}

await testKeyImport();

// 4. Recomendaciones
console.log("\n💡 FASE 4: Recomendaciones\n");

console.log("Basado en el diagnóstico:");
console.log("1. Si los hashes no coinciden: el GD_SERVICE_B64 está corrupto");
console.log("2. Si importPKCS8 falla en todos: problema con jose/WebCrypto");
console.log("3. Si solo falla en env/vars: problema de encoding en variables");
console.log("\nSoluciones posibles:");
console.log("- Regenerar GD_SERVICE_B64 desde el JSON original");
console.log("- Usar Web Crypto API directamente sin jose");
console.log("- Revertir a googleapis si es compatible con Workers");

console.log("\n═══════════════════════════════════════════════════════════");
