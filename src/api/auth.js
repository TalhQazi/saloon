// src/api/auth.js
import { BASE_URL } from './config';

const AUTH_ENDPOINT = `${BASE_URL}/auth`;

// Simple email/password registration (without face)
export const registerSimple = async ({ username, password, role }) => {
  const res = await fetch(`${AUTH_ENDPOINT}/register-simple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role }),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      msg = JSON.parse(text).message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
};

// Face-based registration
export const registerWithFace = async ({
  username,
  password,
  role,
  faceImageUri,
}) => {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);
  formData.append('role', role);

  if (faceImageUri) {
    formData.append('faceImage', {
      uri: faceImageUri,
      type: 'image/jpeg',
      name: 'face.jpg',
    });
  }

  const res = await fetch(`${AUTH_ENDPOINT}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      msg = JSON.parse(text).message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
};

// Simple email/password login (without face)
export const loginSimple = async ({ username, password }) => {
  const res = await fetch(`${AUTH_ENDPOINT}/login-simple`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      msg = JSON.parse(text).message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
};

// Face-based login
export const loginWithFace = async ({ faceImageUri }) => {
  const formData = new FormData();

  if (faceImageUri) {
    formData.append('faceImage', {
      uri: faceImageUri,
      type: 'image/jpeg',
      name: 'face.jpg',
    });
  }

  const res = await fetch(`${AUTH_ENDPOINT}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'multipart/form-data' },
    body: formData,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = `HTTP ${res.status}`;
    try {
      msg = JSON.parse(text).message || msg;
    } catch {}
    throw new Error(msg);
  }
  return res.json();
};

// Legacy functions for backward compatibility
export const register = registerSimple;
export const login = loginSimple;

export default {
  register,
  login,
  registerSimple,
  loginSimple,
  registerWithFace,
  loginWithFace,
};
