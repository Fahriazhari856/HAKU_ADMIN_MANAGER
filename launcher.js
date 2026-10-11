(() => {
  const launcher = document.getElementById("appLauncher");
  const hakuApp = document.getElementById("hakuApp");
  const openHakuButton = document.getElementById("openHakuBtn");
  let hakuStarted = false;

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Gagal memuat ${src}`));
      document.head.appendChild(script);
    });
  }

  async function startHaku() {
    if (hakuStarted) return;
    hakuStarted = true;
    launcher.hidden = true;
    hakuApp.hidden = false;
    document.getElementById("storageStatusTitle").textContent = "Menyiapkan HAKU";
    document.getElementById("storageStatusDetail").textContent = "Memuat modul usaha...";

    try {
      await Promise.all([
        loadScript("https://cdn.jsdelivr.net/npm/chart.js"),
        loadScript("https://cdn.jsdelivr.net/npm/jspdf@2.5.2/dist/jspdf.umd.min.js"),
        loadScript("https://cdn.jsdelivr.net/npm/docx@8.5.0/build/index.umd.js"),
        loadScript("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2")
      ]);
      await loadScript("https://cdn.jsdelivr.net/npm/jspdf-autotable@3.8.2/dist/jspdf.plugin.autotable.min.js");
      await loadScript("./script.js");
    } catch (error) {
      console.error("HAKU startup error:", error);
      hakuStarted = false;
      hakuApp.hidden = true;
      launcher.hidden = false;
      document.querySelector(".launcher-caption").textContent = "HAKU gagal dimuat. Periksa koneksi lalu coba lagi.";
    }
  }

  openHakuButton.addEventListener("click", startHaku);
  if (new URLSearchParams(window.location.search).get("app") === "haku") startHaku();
})();
