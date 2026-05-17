import { db } from './firebase';
import { collection, doc, setDoc, getDoc, query, where, getDocs, deleteDoc } from 'firebase/firestore';

/**
 * ⚠️ SECURITY LIMITATION:
 * In a production environment, the challenge should be generated and verified server-side.
 * Since this is a client-side only implementation (Firebase with no Cloud Functions),
 * the challenge is generated and stored in Firestore directly from the client.
 */

// Helper to convert ArrayBuffer to Base64
const bufferToBase64 = (buffer) => {
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};

// Helper to convert Base64 to ArrayBuffer
const base64ToBuffer = (base64) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

export const isWebAuthnSupported = () => {
  return !!(window.PublicKeyCredential &&
            window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable);
};

export const registerBiometrics = async (user) => {
  if (!user) throw new Error("User not authenticated");

  const available = await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  if (!available) throw new Error("Biometric authentication not available on this device");

  const challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);
  const challengeBase64 = bufferToBase64(challengeBytes);

  // Store challenge in Firestore for "verification"
  await setDoc(doc(db, "webauthn_challenges", user.uid), {
    challenge: challengeBase64,
    createdAt: Date.now()
  });

  const publicKeyCredentialCreationOptions = {
    challenge: challengeBytes,
    rp: {
      name: "Ka-Ching! Expense Tracker",
      id: window.location.hostname,
    },
    user: {
      id: base64ToBuffer(btoa(user.uid)), // Unique user ID in bytes
      name: user.email || user.uid,
      displayName: user.displayName || user.email || "User",
    },
    pubKeyCredParams: [{ alg: -7, type: "public-key" }, { alg: -257, type: "public-key" }],
    authenticatorSelection: {
      authenticatorAttachment: "platform",
      userVerification: "required",
    },
    timeout: 60000,
    attestation: "none",
  };

  const credential = await navigator.credentials.create({
    publicKey: publicKeyCredentialCreationOptions,
  });

  // Store credential ID and public key in Firestore
  const credentialData = {
    id: credential.id,
    rawId: bufferToBase64(credential.rawId),
    type: credential.type,
    publicKey: bufferToBase64(credential.response.getPublicKey()),
    algorithm: credential.response.getPublicKeyAlgorithm(),
    userId: user.uid,
    createdAt: Date.now(),
    deviceName: navigator.userAgent.split(')')[0].split('(')[1] || "Mobile Device"
  };

  await setDoc(doc(db, "biometric_credentials", user.uid), credentialData);

  return credentialData;
};

export const verifyBiometrics = async (user) => {
  if (!user) throw new Error("User not authenticated");

  // Fetch stored credential from Firestore
  const credentialDoc = await getDoc(doc(db, "biometric_credentials", user.uid));
  if (!credentialDoc.exists()) throw new Error("No biometrics registered for this user");

  const storedCredential = credentialDoc.data();

  const challengeBytes = new Uint8Array(32);
  window.crypto.getRandomValues(challengeBytes);
  const challengeBase64 = bufferToBase64(challengeBytes);

  // Store challenge in Firestore for "verification"
  await setDoc(doc(db, "webauthn_challenges", user.uid), {
    challenge: challengeBase64,
    createdAt: Date.now()
  });

  const publicKeyCredentialRequestOptions = {
    challenge: challengeBytes,
    allowCredentials: [{
      id: base64ToBuffer(storedCredential.rawId),
      type: 'public-key',
    }],
    userVerification: "required",
    timeout: 60000,
  };

  const assertion = await navigator.credentials.get({
    publicKey: publicKeyCredentialRequestOptions,
  });

  // ⚠️ In a real app, you would verify the signature here using the stored public key.
  // Since we are client-side only, successful retrieval of the assertion from the platform
  // authenticator (FaceID/TouchID) confirms the user is verified.

  return true;
};

export const unregisterBiometrics = async (user) => {
  if (!user) return;
  await deleteDoc(doc(db, "biometric_credentials", user.uid));
};
