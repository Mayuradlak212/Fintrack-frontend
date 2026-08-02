/**
 * Client-side biometric unlock built on WebAuthn platform authenticators
 * (Windows Hello, Touch ID, Android fingerprint).
 *
 * NOTE: this is a UI-level lock, not an auth factor. The assertion is never
 * verified by a server, so it proves "someone passed the device's user
 * verification" and nothing more — same trust level as `privacyMode`.
 * Phase 2 swaps the challenge/verify calls here for backend endpoints.
 */

const STORAGE_KEY = 'ft_biometric';

export interface StoredBiometric {
  enabled: boolean;
  credentialId: string; // base64url
  userEmail: string;
}

// ─── base64url helpers ────────────────────────────────────────────────────────

const bufToB64url = (buf: ArrayBuffer) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

const b64urlToBuf = (str: string) => {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  const bin = atob(str.replace(/-/g, '+').replace(/_/g, '/') + pad);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
};

const randomChallenge = () => crypto.getRandomValues(new Uint8Array(32));

// ─── Storage ──────────────────────────────────────────────────────────────────

export const readBiometric = (): StoredBiometric | null => {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredBiometric;
    if (!parsed.credentialId || !parsed.userEmail) return null;
    return parsed;
  } catch {
    return null;
  }
};

export const clearBiometric = () => {
  if (typeof window !== 'undefined') localStorage.removeItem(STORAGE_KEY);
};

// ─── Capability check ─────────────────────────────────────────────────────────

/**
 * Requires a secure context (HTTPS or localhost) — WebAuthn is unavailable
 * over plain HTTP, so this returns false on a LAN-IP dev server.
 */
export const isBiometricSupported = async (): Promise<boolean> => {
  if (typeof window === 'undefined') return false;
  if (!window.isSecureContext) return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
};

// ─── Enroll ───────────────────────────────────────────────────────────────────

export const enrollBiometric = async (email: string, name: string): Promise<StoredBiometric> => {
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: randomChallenge(),
      rp: { name: 'FinTrack', id: window.location.hostname },
      user: {
        id: new TextEncoder().encode(email),
        name: email,
        displayName: name || email,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 }, // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
      timeout: 60000,
      attestation: 'none',
    },
  })) as PublicKeyCredential | null;

  if (!credential) throw new Error('Enrollment was cancelled');

  const stored: StoredBiometric = {
    enabled: true,
    credentialId: bufToB64url(credential.rawId),
    userEmail: email,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
  return stored;
};

// ─── Verify ───────────────────────────────────────────────────────────────────

export const verifyBiometric = async (): Promise<boolean> => {
  const stored = readBiometric();
  if (!stored) return false;

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomChallenge(),
      rpId: window.location.hostname,
      allowCredentials: [
        {
          type: 'public-key',
          id: b64urlToBuf(stored.credentialId),
          transports: ['internal'],
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return !!assertion;
};
