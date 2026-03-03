// gallery.js

const ENC_SALT_B64 = "zUgTKrKLdb/N3Zanuu81lg==";
const ENC_ITERS = 200000;

function b64ToBytes(b64) {
  return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
}

async function deriveAesKey(password, saltBytes) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(password),
    "PBKDF2",
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: saltBytes, iterations: ENC_ITERS, hash: "SHA-256" },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );
}

async function decryptToBlob(encBytes, key, ivBytes, mime) {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: ivBytes }, key, encBytes);
  return new Blob([plain], { type: mime || "image/jpeg" });
}

async function loadManifest() {
  const res = await fetch("encrypted/manifest.json", { cache: "no-store" });
  if (!res.ok) throw new Error("manifest.json konnte nicht geladen werden");
  return res.json();
}

function groupByAlbum(items) {
  const map = new Map();
  for (const it of items) {
    const album = it.album && it.album !== "." ? it.album : "Album";
    if (!map.has(album)) map.set(album, []);
    map.get(album).push(it);
  }
  return map;
}

function sortByTitle(a, b) {
  return (a.title || "").localeCompare(b.title || "", "de", { numeric: true });
}

(async () => {
  // Guard
  if (sessionStorage.getItem("authed") !== "1") {
    window.location.href = "index.html";
    return;
  }

  const pw = sessionStorage.getItem("pw");
  if (!pw) {
    window.location.href = "index.html";
    return;
  }

  const key = await deriveAesKey(pw, b64ToBytes(ENC_SALT_B64));
  const manifest = await loadManifest();

  const imagesDiv = document.getElementById("images");
  if (!imagesDiv) return;

  // Alte Einträge entfernen (nur Überschrift h2 behalten)
  Array.from(imagesDiv.querySelectorAll(".bild")).forEach((el) => el.remove());
  Array.from(imagesDiv.querySelectorAll(".album-wrap")).forEach((el) => el.remove());

  const grouped = groupByAlbum(manifest);
  const albumNames = Array.from(grouped.keys()).sort((a, b) => a.localeCompare(b, "de"));

  for (const albumName of albumNames) {
    const items = grouped.get(albumName).slice().sort(sortByTitle);

    // Album Wrapper
    const wrap = document.createElement("div");
    wrap.className = "album-wrap";
    wrap.style.width = "100%";
    wrap.style.display = "flex";
    wrap.style.flexDirection = "column";
    wrap.style.alignItems = "center";
    wrap.style.margin = "1rem 0";

    // Album Titel
    const h3 = document.createElement("h3");
    h3.textContent = albumName;
    wrap.appendChild(h3);

    // Slider bauen
    const slider = document.createElement("div");
    slider.className = "slider";
    slider.innerHTML = `
      <button class="slider-btn prev" type="button" aria-label="Vorheriges Bild">&#10094;</button>
      <div class="slides"></div>
      <button class="slider-btn next" type="button" aria-label="Nächstes Bild">&#10095;</button>
    `;
    wrap.appendChild(slider);
    imagesDiv.appendChild(wrap);

    const slidesEl = slider.querySelector(".slides");

    // Für jedes Bild: img-Tag anlegen + später src setzen
    for (let i = 0; i < items.length; i++) {
      const it = items[i];

      const img = document.createElement("img");
      img.alt = it.title || "Bild";
      if (i === 0) img.classList.add("active"); // erstes Bild sichtbar
      slidesEl.appendChild(img);

      // entschlüsselt laden
      const encRes = await fetch(it.file, { cache: "no-store" });
      if (!encRes.ok) throw new Error(`Konnte Datei nicht laden: ${it.file}`);
      const encBuf = await encRes.arrayBuffer();

      const blob = await decryptToBlob(encBuf, key, b64ToBytes(it.iv), it.mime);
      img.src = URL.createObjectURL(blob);
    }

    // Slider aktivieren (Buttons etc.)
    if (window.initSliders) window.initSliders(wrap);
  }
})().catch((e) => {
  console.error(e);
  // Falls Entschlüsselung / PW falsch / sonstwas: zurück zum Login
  sessionStorage.removeItem("authed");
  sessionStorage.removeItem("pw");
  window.location.href = "index.html";
});