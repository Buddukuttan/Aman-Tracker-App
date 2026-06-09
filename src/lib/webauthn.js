import { db } from './firebase';
import { doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

/**
 * ⚠️ SECURITY LIMITATION:
 * In a production environment, the challenge should be generated and verified server-side.
 * Since this is a client-side only implementation (Firebase with no Cloud Functions),
 * the challenge is generated and stored in Firestore directly from the client.
 */

// Helper to convert ArrayBuffer to Base64 (URL-safe)
const bufferToBase64URL = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let str = '';
  for (const charCode of bytes) {
    str += String.fromCharCode(charCode);
  }
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
};

// Helper to convert Base64 (URL-safe) to ArrayBuffer
const base64URLToBuffer = (base64url) => {
  const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
  const padLen = (4 - (base64.length % 4)) % 4;
  const paddedBase64 = base64 + '='.repeat(padLen);
  const binaryString = atob(paddedBase64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const isWebAuthnSupported = () => {
  return !!(window.isSecureContext &&
            window.PublicKeyCredential &&
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
};

export const registerBiometrics = async (user) => {
  if (!user) throw new Error("User not authenticated");

  // Step 1: Check availability
  const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!available) throw new Error("Biometric authentication not available on this device. Ensure you are using Safari on iPhone and HTTPS.");

  // Step 2: Generate challenge
  const challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);
  const challengeBase64 = bufferToBase64URL(challengeBytes);

  // Store challenge in Firestore for "verification"
  await setDoc(doc(db, "webauthn_challenges", user.uid), {
    challenge: challengeBase64,
    createdAt: Date.now()
  });

  // Step 3: Prepare registration options
  // We use a stable user.id by encoding the UID.
  // IMPORTANT: The id must be a Uint8Array and should be unique to the user.
  const userHandle = new TextEncoder().encode(user.uid);

  // DETERMINISTIC RP ID: Must be exactly the domain without port
  const rpId = window.location.hostname;

  const publicKeyCredentialCreationOptions = {
    challenge: challengeBytes,
    rp: {
      name: "Ka-Ching! Wealth",
      id: rpId,
    },
    user: {
      id: userHandle,
      name: user.email || user.uid,
      displayName: user.displayName || user.email?.split('@')[0] || "Wealth Owner",
    },
    pubKeyCredParams: [
      { alg: -7, type: "public-key" },   // ES256 (Most common for mobile platform authenticators)
      { alg: -257, type: "public-key" }  // RS256
    ],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
      residentKey: "preferred",
      requireResidentKey: false,
    },
    timeout: 60000,
    attestation: "none",
  };

  try {
    const credential = await navigator.credentials.create({
      publicKey: publicKeyCredentialCreationOptions,
    });

    if (!credential) throw new Error("Credential creation was cancelled or failed.");

    // Step 4: Extract and store credential data
    // We need to store the rawId and the public key for future verification
    const credentialData = {
      id: credential.id,
      rawId: bufferToBase64URL(credential.rawId),
      type: credential.type,
      // getPublicKey() returns an ArrayBuffer containing the DER-encoded public key
      publicKey: bufferToBase64URL(credential.response.getPublicKey()),
      algorithm: credential.response.getPublicKeyAlgorithm(),
      userId: user.uid,
      createdAt: Date.now(),
      deviceName: navigator.userAgent.match(/\(([^)]+)\)/)?.[1] || "Mobile Device"
    };

    await setDoc(doc(db, "biometric_credentials", user.uid), credentialData);
    return credentialData;
  } catch (err) {
    console.error("WebAuthn Registration Error:", err);
    if (err.name === 'NotAllowedError') {
      throw new Error("Registration timed out or was denied by the user.");
    }
    if (err.code === 'permission-denied' || err.message?.includes('permissions')) {
      throw new Error("Database Access Denied: Please ask the developer to apply Firestore Security Rules.");
    }
    throw err;
  }
};

export const verifyBiometrics = async (user) => {
  if (!user) throw new Error("User not authenticated");

  // Fetch stored credential from Firestore
  const credentialDoc = await getDoc(doc(db, "biometric_credentials", user.uid));
  if (!credentialDoc.exists()) throw new Error("No biometrics registered for this user");

  const storedCredential = credentialDoc.data();

  const challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);
  const challengeBase64 = bufferToBase64URL(challengeBytes);

  // Store challenge in Firestore for "verification"
  await setDoc(doc(db, "webauthn_challenges", user.uid), {
    challenge: challengeBase64,
    createdAt: Date.now()
  });

  const rpId = window.location.hostname;

  const publicKeyCredentialRequestOptions = {
    challenge: challengeBytes,
    rpId: rpId,
    allowCredentials: [{
      id: base64URLToBuffer(storedCredential.rawId),
      type: 'public-key',
    }],
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  if (!assertion) throw new Error("Authentication failed");

  // Basic challenge verification (client-side)
  const clientDataJSON = JSON.parse(new TextDecoder().decode(assertion.response.clientDataJSON));
  const returnedChallenge = clientDataJSON.challenge.replace(/=/g, '');
  const originalChallenge = challengeBase64.replace(/=/g, '');

  if (returnedChallenge !== originalChallenge) {
    throw new Error("Security challenge mismatch");
  }

  return true;
};

export const unregisterBiometrics = async (user) => {
  if (!user) return;
  await Promise.all([
    deleteDoc(doc(db, "biometric_credentials", user.uid)),
    deleteDoc(doc(db, "webauthn_challenges", user.uid))
  ]);
};
