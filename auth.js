// auth.js

const AUTH_SALT_B64 = "+xZZAyGFYkc6hGgkfPrOpA==";
const AUTH_HASH_B64 = "Y9r0IM4+MaCfvD1W1dvC1ZkRDcYabSIUM74SzVtegcA=";
const PBKDF2_ITERS = 200000;

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function pbkdf2Hash(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: saltBytes,
      iterations: PBKDF2_ITERS,
      hash: "SHA-256",
    },
    keyMaterial,
    256
  );

  return new Uint8Array(bits);
}

function timingSafeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function doLogin() {
  const pwEl = document.getElementById("pw");
  const btn = document.getElementById("loginBtn");
  const msg = document.getElementById("msg");

  const pw = pwEl.value;
  msg.textContent = "";

  btn.disabled = true;

  try {
    const salt = b64ToBytes(AUTH_SALT_B64);
    const expected = b64ToBytes(AUTH_HASH_B64);
    const got = await pbkdf2Hash(pw, salt);

    if (!timingSafeEqual(got, expected)) {
      msg.textContent = "Falsches Passwort.";
      return;
    }

    // Session = nur bis Tab/Browser zu
    sessionStorage.setItem("authed", "1");
    sessionStorage.setItem("pw", pw);

    window.location.href = "index.html";
  } catch (e) {
    console.error(e);
    msg.textContent = "Fehler beim Login.";
  } finally {
    btn.disabled = false;
  }
}

document.getElementById("loginBtn")?.addEventListener("click", doLogin);
document.getElementById("pw")?.addEventListener("keydown", (e) => {
  if (e.key === "Enter") doLogin();
});