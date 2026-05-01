// src/utils/faceCode.js
import RNFS from 'react-native-fs';

/**
 * Deterministic face code generator — MUST match registration logic exactly.
 * Returns: { hash: number, features: number[128], timestamp: number }
 */
export async function generateFaceCode(imagePath) {
  // Read image as base64 (same as registration)
  const imageData = await RNFS.readFile(imagePath, 'base64');

  // Create hash from first 1000 chars (same as registration)
  let hash = 0;
  const str = imageData.substring(0, 1000);
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // 32-bit
  }

  // Generate 128 pseudo-features deterministically (same as registration)
  const features = [];
  for (let i = 0; i < 128; i++) {
    const seed = imageData.charCodeAt(i % imageData.length) || 0;
    features.push((seed + i * 7) % 255);
  }

  return {
    hash: Math.abs(hash),
    features,
    timestamp: Date.now(),
  };
}

/**
 * Cosine similarity between two equal-length numeric arrays.
 * Returns 0..1 (higher = more similar)
 */
export function cosineSimilarity(a, b) {
  if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return 0;
  // Normalize to 0..1 range first (optional but stabilizes)
  const na = a.map(v => v / 255);
  const nb = b.map(v => v / 255);

  let dot = 0,
    normA = 0,
    normB = 0;
  for (let i = 0; i < na.length; i++) {
    dot += na[i] * nb[i];
    normA += na[i] * na[i];
    normB += nb[i] * nb[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}
