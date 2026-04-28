# Trabajo Pendiente: Streaming de Archivos Grandes

**Estado:** 🟡 Pendiente - Identificado, requiere arquitectura diferente
**Prioridad:** Media (funciona para archivos < 100MB con buffering actual)
**Fecha de identificación:** 2026-04-28

---

## Problema

El endpoint `/api/preview/[encryptedId]` actualmente usa buffering completo (`arrayBuffer()`) para evitar errores de streaming en OpenNext:

```typescript
const arrayBuffer = await driveResponse.arrayBuffer();
return new Response(arrayBuffer, { ... });
```

Esto funciona para archivos pequeños (< 100MB) pero consume demasiada memoria para archivos grandes.

---

## Errores Encontrados

### Error 1: "Unable to enqueue"
```
[ERROR] Uncaught TypeError: Unable to enqueue
  at Writable.write [as _write]
  at OpenNextNodeResponse._internalWrite
```

### Error 2: Worker hung
```
[ERROR] Uncaught Error: The Workers runtime canceled this request 
because it detected that your Worker's code had hung
```

**Causa raíz:** Incompatibilidad entre ReadableStream de fetch y la capa de compatibilidad Node.js de OpenNext.

---

## Soluciones Evaluadas

### ❌ Intentado: TransformStream
```typescript
const { readable, writable } = new TransformStream();
driveResponse.body?.pipeTo(writable);
return new Response(readable, { ... });
```
**Resultado:** Mismo error persiste.

### ❌ Intentado: Response directo
```typescript
return new Response(driveResponse.body, { ... });
```
**Resultado:** Mismo error persiste.

### ✅ Temporal: Buffer completo
```typescript
const arrayBuffer = await driveResponse.arrayBuffer();
return new Response(arrayBuffer, { ... });
```
**Resultado:** Funciona pero limita a archivos pequeños.

---

## Opciones Futuras

### Opción 1: Redirección a Google Drive
Redirigir archivos grandes directamente a Google Drive con `Location` header.

**Pros:**
- Sin límite de tamaño
- Usa infraestructura optimizada de Google
- Simple de implementar

**Contras:**
- Problemas de CORS (Google Drive no envía headers CORS consistentes)
- El dominio cambia (afecta analytics/policy)
- El reproductor puede no funcionar correctamente

**Implementación:**
```typescript
if (fileSize > 100 * 1024 * 1024) {
  const decryptedUrl = await encryptionService.decrypt(webContentLink);
  return new Response(null, {
    status: 302,
    headers: { Location: decryptedUrl }
  });
}
```

---

### Opción 2: Workers Nativo (Sin OpenNext)
Crear un Worker de Cloudflare nativo (sin Next.js/OpenNext) solo para el endpoint de streaming.

**Pros:**
- Streaming nativo de Cloudflare funciona perfectamente
- Sin capa de compatibilidad Node.js problemática
- Máximo rendimiento

**Contras:**
- Requiere mantener dos sistemas (Next.js + Worker nativo)
- Complejidad de deployment
- No integrado con la app Next.js

**Implementación:**
```typescript
// worker.ts nativo
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname.startsWith('/api/preview/')) {
      // Streaming nativo sin OpenNext
      const driveResponse = await fetch(driveUrl);
      return new Response(driveResponse.body, { ... });
    }
    // Fallback a app Next.js
    return env.ASSETS.fetch(request);
  }
}
```

---

### Opción 3: Cloudflare R2 como Cache
Almacenar archivos grandes en R2 y servir desde allí.

**Pros:**
- Streaming nativo de R2
- Control total de headers CORS
- Muy rápido (edge cache)

**Contras:**
- Costo adicional de R2
- Implementar lógica de cache/miss
- Primera carga lenta (subida a R2)

**Implementación:**
```typescript
// Verificar si existe en R2
const cached = await env.MY_BUCKET.get(fileId);
if (cached) {
  return new Response(cached.body, { ... });
}
// Si no, descargar de Drive y guardar en R2
```

---

### Opción 4: Usar Google Drive API v3 con export
Para videos de Google Drive (no archivos subidos), usar export links.

**Pros:**
- Optimizado por Google
- Formatos adaptativos

**Contras:**
- Solo funciona para archivos nativos de Drive
- No aplica a archivos subidos (.mp4, .mov, etc.)

---

### Opción 5: Dividir en chunks manuales
Implementar lógica de chunked download manual con múltiples requests.

**Pros:**
- Control total del proceso
- Funciona con cualquier tamaño

**Contras:**
- Complejo de implementar
- Latencia adicional por múltiples requests
- Manejo de errores complejo

---

## Recomendación Actual

**Mantener la solución temporal (buffer) para archivos < 100MB**

Para archivos grandes (> 100MB), considerar:
1. **Corto plazo:** Mostrar mensaje "Descargar para reproducir" con link a `/api/download`
2. **Medio plazo:** Implementar Opción 2 (Worker nativo) o Opción 3 (R2 cache)
3. **Largo plazo:** Migrar a solución de video streaming profesional (Cloudflare Stream, Mux, etc.)

---

## Archivos Relacionados

- `/src/app/api/preview/[encryptedId]/route.ts` - Endpoint de preview
- `/src/app/api/download/[...rest]/route.ts` - Endpoint de descarga
- `/src/components/preview/Media.tsx` - Reproductor de video

## Notas

- El problema es específico de OpenNext + Cloudflare Workers
- En Vercel/Node.js tradicional, el streaming funciona correctamente
- Cloudflare está trabajando en mejorar la compatibilidad Node.js

---

## Referencias

- [Cloudflare Workers Streams API](https://developers.cloudflare.com/workers/runtime-apis/streams/)
- [OpenNext Cloudflare Issues](https://github.com/opennextjs/opennextjs-cloudflare/issues)
- [Workers Runtime Errors](https://developers.cloudflare.com/workers/observability/errors/)
