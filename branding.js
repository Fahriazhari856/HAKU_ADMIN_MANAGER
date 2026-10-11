(() => {
  const KEY = "haku_workspace_branding_v1";
  const ROW = "workspace_main";
  const defaults = () => ({ logos: { workspace: { mode: "initial", initial: "H", image: "" }, haku: { mode: "initial", initial: "H", image: "" }, studio: { mode: "initial", initial: "S", image: "" } }, appearance: { background: "default", shape: "rounded" } });
  const isImage = (value) => typeof value === "string" && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(value) && value.length <= 1500000;
  function normalize(raw = {}) {
    const result = defaults();
    for (const key of Object.keys(result.logos)) {
      const source = raw.logos?.[key] || {};
      result.logos[key] = { mode: source.mode === "image" && isImage(source.image) ? "image" : "initial", initial: String(source.initial || result.logos[key].initial).trim().slice(0, 3) || result.logos[key].initial, image: isImage(source.image) ? source.image : "" };
    }
    if (["default", "lime", "dark"].includes(raw.appearance?.background)) result.appearance.background = raw.appearance.background;
    if (["rounded", "circle"].includes(raw.appearance?.shape)) result.appearance.shape = raw.appearance.shape;
    result._savedAt = raw._savedAt || "";
    return result;
  }
  let settings;
  try { settings = normalize(JSON.parse(localStorage.getItem(KEY) || "{}")); } catch { settings = defaults(); }
  let draft = null;
  let remoteClient = null;
  let syncing = false;
  let busy = 0;
  let editVersion = 0;
  let lastUpload = {};
  const message = (text) => { const element = document.getElementById("brandingMessage"); if (element) element.textContent = text; };
  function logoElement(element, key, config = settings) {
    const logo = config.logos[key];
    if (!logo) return;
    element.replaceChildren();
    element.classList.add("workspace-logo");
    element.dataset.logoBackground = config.appearance.background === "default" ? key === "workspace" ? "dark" : "lime" : config.appearance.background;
    element.dataset.logoShape = config.appearance.shape;
    if (logo.mode === "image" && isImage(logo.image)) {
      const img = document.createElement("img");
      img.src = logo.image;
      img.alt = "";
      element.append(img);
    } else element.textContent = logo.initial;
  }
  function apply() {
    document.querySelectorAll("[data-brand-logo]").forEach((element) => logoElement(element, element.dataset.brandLogo));
    let icon = document.querySelector('link[rel="icon"]');
    if (!icon) { icon = document.createElement("link"); icon.rel = "icon"; document.head.append(icon); }
    const key = document.body.dataset.brandApp || "workspace";
    const logo = settings.logos[key];
    if (logo.mode === "image") { icon.href = logo.image; icon.type = logo.image.startsWith("data:image/png") ? "image/png" : logo.image.startsWith("data:image/jpeg") ? "image/jpeg" : "image/webp"; }
    else {
      const canvas = document.createElement("canvas"); canvas.width = canvas.height = 64;
      const context = canvas.getContext("2d");
      if (context) {
        const dark = settings.appearance.background === "dark" || settings.appearance.background === "default" && key === "workspace";
        context.fillStyle = dark ? "#20251f" : "#d5ef73";
        if (settings.appearance.shape === "circle") { context.beginPath(); context.arc(32,32,32,0,Math.PI*2); context.fill(); } else context.fillRect(0,0,64,64);
        context.fillStyle = dark ? "#d5ef73" : "#20251f"; context.font = "bold 30px sans-serif"; context.textAlign = "center"; context.textBaseline = "middle"; context.fillText(logo.initial,32,34,58); icon.href = canvas.toDataURL("image/png"); icon.type = "image/png";
      }
    }
  }
  function preview() {
    document.querySelectorAll("[data-brand-preview]").forEach((element) => logoElement(element, element.dataset.brandPreview, draft));
    for (const key of Object.keys(draft.logos)) {
      const initial = document.getElementById(`brandingInitial_${key}`);
      const upload = document.getElementById(`brandingUpload_${key}`);
      initial.parentElement.hidden = draft.logos[key].mode === "image";
      upload.parentElement.hidden = draft.logos[key].mode !== "image";
    }
  }
  function openSettings() {
    draft = normalize(settings); editVersion++; lastUpload = {};
    for (const key of Object.keys(draft.logos)) {
      document.getElementById(`brandingMode_${key}`).value = draft.logos[key].mode;
      document.getElementById(`brandingInitial_${key}`).value = draft.logos[key].initial;
      document.getElementById(`brandingUpload_${key}`).value = "";
    }
    document.getElementById("brandingBackground").value = draft.appearance.background;
    document.getElementById("brandingShape").value = draft.appearance.shape;
    message(""); preview(); document.getElementById("brandingDialog").showModal();
  }
  async function readLogo(file) {
    if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) throw new Error("Gunakan gambar PNG, JPG, atau WebP.");
    if (file.size > 5 * 1024 * 1024) throw new Error("Ukuran gambar maksimal 5 MB.");
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      await new Promise((resolve, reject) => { img.onload = resolve; img.onerror = () => reject(new Error("Gambar tidak dapat dibaca.")); img.src = url; });
      const scale = Math.min(1, 384 / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas"); canvas.width = Math.max(1, Math.round(img.naturalWidth * scale)); canvas.height = Math.max(1, Math.round(img.naturalHeight * scale));
      canvas.getContext("2d").drawImage(img,0,0,canvas.width,canvas.height);
      return canvas.toDataURL("image/png");
    } finally { URL.revokeObjectURL(url); }
  }
  async function saveRemote(snapshot) {
    if (!remoteClient) return false;
    const { error } = await remoteClient.from("app_state").upsert({ id: ROW, data: snapshot, updated_at: new Date().toISOString() });
    return !error;
  }
  async function sync() {
    if (syncing) return;
    syncing = true;
    try {
      if (!window.supabase?.createClient) await new Promise((resolve, reject) => {
        const script = document.createElement("script"); script.src = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"; script.onload = resolve; script.onerror = reject; document.head.append(script);
      });
      remoteClient = window.supabase.createClient("https://yjwekgwlrghsxjidzimz.supabase.co", "sb_publishable_UA-Hd1rmm9AkXPrE9lCCeA_VN3dy7d5");
      const { data, error } = await remoteClient.from("app_state").select("data").eq("id", ROW).maybeSingle();
      if (error) return;
      const remote = data?.data;
      if (remote && (Date.parse(remote._savedAt || "") || 0) > (Date.parse(settings._savedAt || "") || 0)) {
        settings = normalize(remote); localStorage.setItem(KEY, JSON.stringify(settings)); apply();
      } else if (settings._savedAt) await saveRemote(settings);
    } catch { /* Keep local branding available offline. */ }
    finally { syncing = false; }
  }
  function bindSettings() {
    const form = document.getElementById("brandingForm");
    if (!form) return;
    document.getElementById("openBrandingBtn").addEventListener("click", openSettings);
    document.getElementById("brandingDialog").addEventListener("close", () => { editVersion++; });
    for (const key of Object.keys(settings.logos)) {
      document.getElementById(`brandingMode_${key}`).addEventListener("change", (event) => { draft.logos[key].mode = event.target.value; preview(); });
      document.getElementById(`brandingInitial_${key}`).addEventListener("input", (event) => { draft.logos[key].initial = event.target.value.trim().slice(0,3) || defaults().logos[key].initial; preview(); });
      document.getElementById(`brandingUpload_${key}`).addEventListener("change", async (event) => {
        const file = event.target.files[0]; if (!file) return;
        const version = editVersion;
        const uploadId = (lastUpload[key] || 0) + 1; lastUpload[key] = uploadId;
        busy++; document.getElementById("saveBrandingBtn").disabled = true; message("Memproses logo...");
        try { const image = await readLogo(file); if (version === editVersion && lastUpload[key] === uploadId) { draft.logos[key].image = image; draft.logos[key].mode = "image"; preview(); message(""); } }
        catch (error) { if (version === editVersion && lastUpload[key] === uploadId) message(error.message); }
        finally { busy--; document.getElementById("saveBrandingBtn").disabled = busy > 0; }
      });
    }
    for (const [id, key] of [["brandingBackground", "background"], ["brandingShape", "shape"]]) document.getElementById(id).addEventListener("change", (event) => { draft.appearance[key] = event.target.value; preview(); });
    document.getElementById("resetBrandingBtn").addEventListener("click", () => { settingsDraftReset(); });
    form.addEventListener("submit", async (event) => {
      event.preventDefault(); if (busy) return;
      if (Object.values(draft.logos).some((logo) => logo.mode === "image" && !isImage(logo.image))) { message("Unggah gambar untuk setiap logo yang memakai mode gambar."); return; }
      const next = normalize(draft); next._savedAt = new Date().toISOString();
      try { localStorage.setItem(KEY, JSON.stringify(next)); } catch { message("Penyimpanan browser penuh. Coba gunakan gambar yang lebih kecil."); return; }
      settings = next; apply();
      document.getElementById("saveBrandingBtn").disabled = true;
      message("Logo tersimpan di perangkat ini. Menyinkronkan...");
      const saved = await saveRemote(next).catch(() => false);
      document.getElementById("saveBrandingBtn").disabled = false;
      message(saved ? "Logo tersimpan dan tersinkron ke Supabase." : "Logo tersimpan di perangkat ini. Sinkronisasi belum berhasil; pengaturan akan dicoba kembali saat halaman dibuka.");
    });
  }
  function settingsDraftReset() {
    draft = defaults(); editVersion++; lastUpload = {};
    for (const key of Object.keys(draft.logos)) {
      document.getElementById(`brandingMode_${key}`).value = "initial";
      document.getElementById(`brandingInitial_${key}`).value = draft.logos[key].initial;
      document.getElementById(`brandingUpload_${key}`).value = "";
    }
    document.getElementById("brandingBackground").value = "default";
    document.getElementById("brandingShape").value = "rounded";
    preview(); message("Logo bawaan dipilih. Klik Simpan untuk menerapkan.");
  }
  window.WorkspaceBranding = { apply, sync };
  apply(); bindSettings(); sync();
  window.addEventListener("storage", (event) => {
    if (event.key !== KEY) return;
    try { settings = normalize(JSON.parse(event.newValue || "{}")); apply(); } catch { /* Ignore malformed browser storage. */ }
  });
})();
