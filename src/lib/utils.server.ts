import { decodeBase64, decodeBase64url, encodeBase64, encodeBase64url } from "@oslojs/encoding";
import { SignJWT } from "jose";
import "server-only";

import { Schema_ServiceAccount } from "~/types/schema";

function uint8ArrayToHex(arr: Uint8Array): string {
  return Array.from(arr)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

function hexToUint8Array(hex: string): Uint8Array {
  const matches = hex.match(/.{1,2}/g);
  if (!matches) throw new Error("Invalid hex string");
  const bytes = matches.map(byte => parseInt(byte, 16));
  const buffer = new ArrayBuffer(bytes.length);
  const view = new Uint8Array(buffer);
  for (let i = 0; i < bytes.length; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      view[i] = byte;
    }
  }
  return new Uint8Array(buffer);
}

class EncryptionService {
  private key: string;
  private delimiter = ";";
  
  constructor() {
    const envKey = getEnvVar("ENCRYPTION_KEY");
    if (!envKey) {
      throw new Error("ENCRYPTION_KEY is required in the environment variables.");
    }
    this.key = envKey;
  }

  private getKey(): string {
    return this.key;
  }

  async encrypt(data: string, forceKey?: string): Promise<string> {
    try {
      if (!crypto) throw new Error("Crypto Web API is not available in this environment.");

      const iv = crypto.getRandomValues(new Uint8Array(12));
      const alg = { name: "AES-GCM", iv };
      const keyhash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(forceKey ?? this.getKey())
      );

      const encodedData = new TextEncoder().encode(data);
      const secretKey = await crypto.subtle.importKey("raw", keyhash, alg, false, ["encrypt"]);

      const encryptedData = await crypto.subtle.encrypt(alg, secretKey, encodedData);

      return [
        uint8ArrayToHex(new Uint8Array(encryptedData)),
        uint8ArrayToHex(iv)
      ].join(this.delimiter);
    } catch (error) {
      const e = error as Error;
      console.error(`[EncryptionService.encrypt] ${e.message}`);
      throw new Error(`[EncryptionService.encrypt] ${e.message}`);
    }
  }

  async decrypt(hash: string, forceKey?: string): Promise<string> {
    try {
      if (!crypto) throw new Error("Crypto Web API is not available in this environment.");

      const [cipherText, iv] = hash.split(this.delimiter);
      if (!cipherText || !iv) throw new Error("Invalid hash format.");

      const ivBytes = hexToUint8Array(iv);
      const cipherBytes = hexToUint8Array(cipherText);
      
      const alg = { name: "AES-GCM", iv: ivBytes as unknown as BufferSource };
      const keyhash = await crypto.subtle.digest(
        "SHA-256",
        new TextEncoder().encode(forceKey ?? this.getKey())
      );

      const secretKey = await crypto.subtle.importKey("raw", keyhash, alg, false, ["decrypt"]);

      const decryptedData = await crypto.subtle.decrypt(
        alg,
        secretKey,
        cipherBytes as unknown as BufferSource
      );

      return new TextDecoder().decode(decryptedData);
    } catch (error) {
      const e = error as Error;
      console.error(`[EncryptionService.decrypt] ${e.message}`);
      throw new Error(`[EncryptionService.decrypt] ${e.message}`);
    }
  }
}

interface ServiceAccount {
  type: string;
  project_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
}

class GoogleDriveEdgeClient {
  private serviceAccount: ServiceAccount;
  private accessToken: string | null = null;
  private tokenExpiry = 0;

  constructor() {
    const serviceB64 = getEnvVar("GD_SERVICE_B64");
    if (!serviceB64) throw new Error("GD_SERVICE_B64 environment variable is required");
    
    const decodedB64 = base64Decode<string>(serviceB64);
    if (!decodedB64) throw new Error("Failed to decode GD_SERVICE_B64");
    
    const parsedAuth = Schema_ServiceAccount.safeParse(JSON.parse(decodedB64));
    if (!parsedAuth.success) throw new Error("Failed to parse service account");
    
    this.serviceAccount = parsedAuth.data;
  }

  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() < this.tokenExpiry - 60000) {
      return this.accessToken;
    }

    const now = Math.floor(Date.now() / 1000);
    
    const privateKey = await this.importPrivateKey(this.serviceAccount.private_key);
    
    const jwt = await new SignJWT({
      iss: this.serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      iat: now,
      exp: now + 3600,
    })
      .setProtectedHeader({ alg: "RS256", typ: "JWT" })
      .setIssuedAt(now)
      .setExpirationTime(now + 3600)
      .sign(privateKey);

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    if (!tokenResponse.ok) {
      const error = await tokenResponse.text();
      throw new Error(`Failed to get access token: ${error}`);
    }

    const tokenData = await tokenResponse.json() as { access_token: string; expires_in: number };
    this.accessToken = tokenData.access_token;
    this.tokenExpiry = Date.now() + (tokenData.expires_in * 1000);
    
    return this.accessToken;
  }

  private async importPrivateKey(pem: string): Promise<CryptoKey> {
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = pem
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    
    const binaryDer = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    return await crypto.subtle.importKey(
      "pkcs8",
      binaryDer.buffer,
      { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
      false,
      ["sign"]
    );
  }

  async listFiles(options: {
    q?: string;
    fields?: string;
    orderBy?: string;
    pageSize?: number;
    pageToken?: string;
    supportsAllDrives?: boolean;
    includeItemsFromAllDrives?: boolean;
    driveId?: string;
    corpora?: string;
  }): Promise<{ files?: any[]; nextPageToken?: string }> {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams();
    if (options.q) params.set("q", options.q);
    if (options.fields) params.set("fields", options.fields);
    if (options.orderBy) params.set("orderBy", options.orderBy);
    if (options.pageSize) params.set("pageSize", options.pageSize.toString());
    if (options.pageToken) params.set("pageToken", options.pageToken);
    if (options.supportsAllDrives) params.set("supportsAllDrives", "true");
    if (options.includeItemsFromAllDrives) params.set("includeItemsFromAllDrives", "true");
    if (options.driveId) params.set("driveId", options.driveId);
    if (options.corpora) params.set("corpora", options.corpora);

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async getFile(fileId: string, options?: {
    fields?: string;
    supportsAllDrives?: boolean;
  }): Promise<any> {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams();
    if (options?.fields) params.set("fields", options.fields);
    if (options?.supportsAllDrives) params.set("supportsAllDrives", "true");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }

  async getFileContent(fileId: string, options?: {
    supportsAllDrives?: boolean;
    acknowledgeAbuse?: boolean;
  }): Promise<string> {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams();
    params.set("alt", "media");
    if (options?.supportsAllDrives) params.set("supportsAllDrives", "true");
    if (options?.acknowledgeAbuse) params.set("acknowledgeAbuse", "true");

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.text();
  }

  async getFileStream(fileId: string, options?: {
    supportsAllDrives?: boolean;
    acknowledgeAbuse?: boolean;
    range?: string;
  }): Promise<Response> {
    const token = await this.getAccessToken();
    
    const params = new URLSearchParams();
    params.set("alt", "media");
    if (options?.supportsAllDrives) params.set("supportsAllDrives", "true");
    if (options?.acknowledgeAbuse) params.set("acknowledgeAbuse", "true");

    const headers: Record<string, string> = {
      Authorization: `Bearer ${token}`,
    };
    
    if (options?.range) {
      headers["Range"] = options.range;
    }

    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?${params.toString()}`,
      { headers }
    );

    if (!response.ok && response.status !== 206) {
      const errorText = await response.text();
      throw new Error(`Drive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return response;
  }

  async getShortcutDetails(fileId: string): Promise<any> {
    const token = await this.getAccessToken();
    
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=shortcutDetails`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive API error: ${response.status} ${response.statusText} - ${errorText}`);
    }

    return await response.json();
  }
}

function getEnvVar(name: string): string | undefined {
  // For Cloudflare Workers, check both process.env and globalThis
  if (typeof process !== 'undefined' && process.env && process.env[name]) {
    return process.env[name];
  }
  // Try to get from globalThis (Cloudflare Workers bindings)
  const env = (globalThis as any).env;
  if (env && env[name]) {
    return env[name];
  }
  // Try to get from globalThis directly
  if ((globalThis as any)[name]) {
    return (globalThis as any)[name];
  }
  return undefined;
}

type B64Type = "url" | "standard";
export const base64Encode = (text: string, type: B64Type = "url") => {
  const data = new TextEncoder().encode(text);
  if (type === "standard") return encodeBase64(data);
  return encodeBase64url(data);
};
export const base64Decode = <T = unknown>(encoded: string, type: B64Type = "url"): T | null => {
  try {
    let decoded: Uint8Array<ArrayBufferLike>;
    if (type === "standard") decoded = decodeBase64(encoded);
    else decoded = decodeBase64url(encoded);
    return new TextDecoder().decode(decoded) as T;
  } catch (error) {
    const e = error as Error;
    console.error(`[base64Decode] ${e.message}`);
    return null;
  }
};

const driveClient = new GoogleDriveEdgeClient();

export const encryptionService = new EncryptionService();

export const gdrive = {
  files: {
    list: (options: any) => driveClient.listFiles(options),
    get: (fileId: string, options?: any) => driveClient.getFile(fileId, options),
    getContent: (fileId: string, options?: any) => driveClient.getFileContent(fileId, options),
    getStream: (fileId: string, options?: any) => driveClient.getFileStream(fileId, options),
    getShortcutDetails: (fileId: string) => driveClient.getShortcutDetails(fileId),
  }
};

export const gdriveNoCache = gdrive;