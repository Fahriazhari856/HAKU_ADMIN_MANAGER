const STORAGE_KEY = "drinkstock_v1";
const NAV_ORDER_KEY = "drinkstock_nav_order_v1";

const rupiah = (n) =>
  new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(Number(n || 0));

const number = (n) =>
  new Intl.NumberFormat("id-ID").format(Number(n || 0));

const pad = (n) => String(n).padStart(2, "0");

const toLocalDateTimeInput = (date = new Date()) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;

const dateKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const monthKey = (value) => {
  const d = new Date(value);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
};

const esc = (str = "") =>
  String(str)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");

const uid = (prefix = "id") =>
  `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

function makePlaceholder(label = "DR") {
  const text =
    (
      label
        .trim()
        .split(/\s+/)
        .map((s) => s[0])
        .join("")
        .slice(0, 2) || "DR"
    ).toUpperCase();

  const svg = `
  <svg xmlns="http://www.w3.org/2000/svg" width="180" height="180">
    <defs>
      <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
        <stop stop-color="#dbeafe"/>
        <stop offset="1" stop-color="#93c5fd"/>
      </linearGradient>
    </defs>

    <rect
      width="180"
      height="180"
      rx="26"
      fill="url(#g)"
    />

    <circle
      cx="132"
      cy="46"
      r="38"
      fill="#ffffff"
      fill-opacity=".30"
    />

    <text
      x="90"
      y="105"
      text-anchor="middle"
      font-family="Arial,sans-serif"
      font-size="52"
      font-weight="700"
      fill="#1d4ed8"
    >
      ${text}
    </text>
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

/* =========================
   DATA AWAL
========================= */

function seedData() {
  const now = new Date();

  const mkDate = (daysAgo, hour = 10) => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, 0, 0, 0);
    return d.toISOString();
  };

  const products = [
    {
      id: "p_matcha",
      name: "Matcha Latte",
      category: "Matcha",
      volume: 250,
      stock: 18,
      cost: 8000,
      price: 15000,
      image: makePlaceholder("Matcha Latte")
    },
    {
      id: "p_mango",
      name: "Mango Cream",
      category: "Fruit",
      volume: 250,
      stock: 8,
      cost: 7500,
      price: 14000,
      image: makePlaceholder("Mango Cream")
    },
    {
      id: "p_choco",
      name: "Chocolate Milk",
      category: "Chocolate",
      volume: 250,
      stock: 4,
      cost: 7000,
      price: 13000,
      image: makePlaceholder("Chocolate Milk")
    },
    {
      id: "p_vanilla",
      name: "Vanilla Latte",
      category: "Coffee",
      volume: 300,
      stock: 12,
      cost: 9000,
      price: 17000,
      image: makePlaceholder("Vanilla Latte")
    }
  ];

  const transactions = [
    {
      id: uid("tx"),
      type: "out",
      productId: "p_matcha",
      qty: 3,
      date: mkDate(0, 10),
      note: "Penjualan toko",
      unitCost: 8000,
      unitPrice: 15000
    },
    {
      id: uid("tx"),
      type: "out",
      productId: "p_mango",
      qty: 2,
      date: mkDate(0, 11),
      note: "Pesanan pelanggan",
      unitCost: 7500,
      unitPrice: 14000
    },
    {
      id: uid("tx"),
      type: "out",
      productId: "p_vanilla",
      qty: 1,
      date: mkDate(1, 15),
      note: "Penjualan toko",
      unitCost: 9000,
      unitPrice: 17000
    },
    {
      id: uid("tx"),
      type: "out",
      productId: "p_matcha",
      qty: 4,
      date: mkDate(2, 14),
      note: "Pesanan online",
      unitCost: 8000,
      unitPrice: 15000
    },
    {
      id: uid("tx"),
      type: "in",
      productId: "p_choco",
      qty: 10,
      date: mkDate(3, 9),
      note: "Restock supplier",
      unitCost: 7000,
      unitPrice: 13000
    },
    {
      id: uid("tx"),
      type: "out",
      productId: "p_choco",
      qty: 3,
      date: mkDate(3, 16),
      note: "Penjualan toko",
      unitCost: 7000,
      unitPrice: 13000
    },
    {
      id: uid("tx"),
      type: "out",
      productId: "p_mango",
      qty: 2,
      date: mkDate(5, 12),
      note: "Penjualan toko",
      unitCost: 7500,
      unitPrice: 14000
    }
  ];

  return {
    settings: {
      brandName: "DrinkStock",
      lowStockThreshold: 5
    },
    products,
    transactions,
    orders: [],
    cart: [],
    capitalEntries: []
  };
}

/* =========================
   STATE
========================= */

let state = loadState();

let dailyChart = null;
let monthlyChart = null;

let reportRange = {
  start: null,
  end: null
};

let currentReceiptId = null;
let confirmationResolver = null;
let selectedOrderStatus = "all";
let selectedCapitalMonth = monthKey(new Date());

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const loaded = raw
      ? JSON.parse(raw)
      : seedData();

    loaded.orders ||= [];
    loaded.cart ||= [];
    loaded.capitalEntries = normalizeCapitalEntries(loaded.capitalEntries || []);
    return loaded;
  } catch {
    return seedData();
  }
}

function normalizeCapitalEntries(entries = []) {
  return entries.map((entry) => {
    const qty = Math.max(1, Number(entry.qty || entry.quantity || 1));
    const unitPrice = Number(entry.unitPrice ?? entry.price ?? entry.amount ?? 0);
    const amount = Number(entry.amount || unitPrice * qty);

    return {
      ...entry,
      id: entry.id || uid("capital"),
      date: entry.date || new Date().toISOString(),
      itemName: entry.itemName || entry.name || entry.note || "Modal item",
      unitPrice,
      qty,
      amount
    };
  });
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify(state)
  );
}

function productById(id) {
  return state.products.find(
    (p) => p.id === id
  );
}

/* =========================
   HITUNG TRANSAKSI
========================= */

function transactionMetrics(tx) {
  const order = tx.orderId && state.orders?.find((item) => item.id === tx.orderId);
  const refunded = order?.status === "refund";

  const cost =
    refunded ? 0 : Number(tx.unitCost || 0) * Number(tx.qty || 0);

  const grossRevenue =
    tx.type === "out" && !refunded
      ? Number(tx.unitPrice || 0) *
        Number(tx.qty || 0)
      : 0;

  const discount =
    tx.type === "out" && !refunded
      ? Number(tx.discount || 0)
      : 0;

  const deliveryCost =
    tx.type === "out" && !refunded
      ? Number(tx.deliveryCost || 0)
      : 0;

  const revenue =
    Math.max(0, grossRevenue - discount);

  return {
    cost,
    grossRevenue,
    discount,
    deliveryCost,
    revenue,
    profit:
      tx.type === "out"
        ? revenue - cost - deliveryCost
        : 0
  };
}

function isActiveSale(tx) {
  if (tx.type !== "out") return false;
  const order = tx.orderId && state.orders?.find((item) => item.id === tx.orderId);
  return order?.status !== "refund";
}

function calculateCapitalSummary(throughMonth = null) {
  const withinLimit = (value) => !throughMonth || monthKey(value) <= throughMonth;
  const monthly = new Map();
  const capitalEntries = (state.capitalEntries || []).filter((entry) => withinLimit(entry.date));
  const firstCapitalMonth = capitalEntries.reduce((first, entry) => {
    const month = monthKey(entry.date);
    return !first || month < first ? month : first;
  }, null);
  const sales = state.transactions.filter((tx) =>
    isActiveSale(tx) &&
    withinLimit(tx.date) &&
    firstCapitalMonth &&
    monthKey(tx.date) >= firstCapitalMonth
  );

  capitalEntries.forEach((entry) => {
    const month = monthKey(entry.date);
    const row = monthly.get(month) || { month, capital: 0, profit: 0 };
    row.capital += capitalEntryTotal(entry);
    monthly.set(month, row);
  });

  sales.forEach((tx) => {
    const month = monthKey(tx.date);
    const row = monthly.get(month) || { month, capital: 0, profit: 0 };
    row.profit += transactionMetrics(tx).profit;
    monthly.set(month, row);
  });

  let cumulativeCapital = 0;
  let cumulativeProfit = 0;
  const months = [...monthly.keys()].sort();
  const rows = months.map((month) => {
    const row = monthly.get(month);
    cumulativeCapital += row.capital;
    cumulativeProfit += row.profit;
    const remaining = Math.max(0, cumulativeCapital - cumulativeProfit);
    return {
      ...row,
      cumulativeCapital,
      cumulativeProfit,
      remaining,
      surplus: Math.max(0, cumulativeProfit - cumulativeCapital),
      recovered: cumulativeCapital > 0 && cumulativeProfit >= cumulativeCapital
    };
  });

  const totalCapital = capitalEntries.reduce((sum, entry) => sum + capitalEntryTotal(entry), 0);
  const totalProfit = sales.reduce((sum, tx) => sum + transactionMetrics(tx).profit, 0);
  const remaining = Math.max(0, totalCapital - totalProfit);
  const progress = totalCapital > 0 ? Math.max(0, Math.min(100, totalProfit / totalCapital * 100)) : 0;

  return {
    rows,
    entries: capitalEntries,
    totalCapital,
    totalProfit,
    remaining,
    surplus: Math.max(0, totalProfit - totalCapital),
    progress,
    hasCapital: totalCapital > 0,
    recovered: totalCapital > 0 && totalProfit >= totalCapital
  };
}

function capitalDepositsInRange(startDate = null, endDate = null) {
  return (state.capitalEntries || []).filter((entry) => {
    const day = dateKey(entry.date);
    return (!startDate || day >= startDate) && (!endDate || day <= endDate);
  });
}

function monthLabel(month, options = { month: "long", year: "numeric" }) {
  return new Date(`${month}-01T12:00:00`).toLocaleDateString("id-ID", options);
}

function capitalEntriesForMonth(month) {
  return (state.capitalEntries || []).filter((entry) => monthKey(entry.date) === month);
}

function capitalEntryTotal(entry) {
  return Number(entry.amount || 0) || Number(entry.unitPrice || 0) * Number(entry.qty || 0);
}

function capitalCardMonths() {
  const now = new Date();
  const months = new Set([selectedCapitalMonth]);

  for (let month = 0; month <= now.getMonth(); month += 1) {
    months.add(`${now.getFullYear()}-${pad(month + 1)}`);
  }

  (state.capitalEntries || []).forEach((entry) => {
    months.add(monthKey(entry.date));
  });

  return [...months].sort().reverse();
}

/* =========================
   TOAST
========================= */

function showToast(message) {
  const el = document.getElementById("toast");

  el.textContent = message;
  el.classList.add("show");

  clearTimeout(showToast._timer);

  showToast._timer = setTimeout(() => {
    el.classList.remove("show");
  }, 2400);
}

/* =========================
   MODAL
========================= */

function openModal(id) {
  document
    .getElementById(id)
    .classList.add("open");

  document.body.style.overflow = "hidden";
}

function closeModal(id) {
  document
    .getElementById(id)
    .classList.remove("open");

  document.body.style.overflow =
    document.querySelector(".modal-backdrop.open")
      ? "hidden"
      : "";
}

function requestConfirmation({ title, message, confirmLabel = "Konfirmasi", danger = false }) {
  document.getElementById("confirmationTitle").textContent = title;
  document.getElementById("confirmationMessage").textContent = message;
  document.getElementById("acceptConfirmationBtn").textContent = confirmLabel;
  document.getElementById("acceptConfirmationBtn").className = danger ? "danger-btn" : "primary-btn";
  document.getElementById("confirmationMark").classList.toggle("danger", danger);
  openModal("confirmationModal");

  const confirmation = new Promise((resolve) => {
    confirmationResolver = resolve;
  });

  document.getElementById("acceptConfirmationBtn").focus();
  return confirmation;
}

function resolveConfirmation(accepted) {
  if (!confirmationResolver) return;
  const resolve = confirmationResolver;
  confirmationResolver = null;
  closeModal("confirmationModal");
  resolve(accepted);
}

/* =========================
   NAVIGASI HALAMAN
========================= */

function goPage(page) {
  document
    .querySelectorAll(".page")
    .forEach((p) =>
      p.classList.remove("active")
    );

  document
    .getElementById(`page-${page}`)
    .classList.add("active");

  document
    .querySelectorAll(".nav-item")
    .forEach((n) => {
      n.classList.toggle(
        "active",
        n.dataset.page === page
      );
    });

  const titles = {
    dashboard: [
      "Dashboard",
      "Ringkasan usaha hari ini."
    ],

    products: [
      "Atur Stok",
      "Kelola produk, harga, dan persediaan."
    ],

    sales: [
      "Jualan",
      "Pilih beberapa produk lalu checkout lewat keranjang."
    ],

    capital: [
      "Modal Usaha",
      "Catat modal item dan pantau perkembangan balik modal."
    ],

    orders: [
      "Pesanan",
      "Pantau packing, pengantaran, refund, dan pesanan selesai."
    ],

    transactions: [
      "Barang Masuk/Keluar",
      "Catat setiap perubahan stok."
    ],

    reports: [
      "Laporan",
      "Analisis omzet, modal, laba, dan stok."
    ],

    settings: [
      "Pengaturan",
      "Atur aplikasi dan data usaha."
    ]
  };

  document.getElementById(
    "pageTitle"
  ).textContent = titles[page][0];

  document.getElementById(
    "pageSubtitle"
  ).textContent = titles[page][1];

  document
    .getElementById("sidebar")
    .classList.remove("open");

  if (page === "reports") {
    renderReports();
  }
}

/* =========================
   RENDER SEMUA
========================= */

function renderAll() {
  renderBrand();
  renderDashboard();
  renderProducts();
  renderSales();
  renderCart();
  renderOrders();
  renderTransactions();
  renderCapital();
  renderReports();
  refreshTransactionProductOptions();
}

/* =========================
   BRAND
========================= */

function renderBrand() {
  const name =
    state.settings.brandName ||
    "DrinkStock";

  document.getElementById(
    "brandNameSide"
  ).textContent = name;

  document.getElementById(
    "heroBrand"
  ).textContent =
    `Kelola ${name} lebih cepat dan otomatis.`;

  document.getElementById(
    "settingBrandName"
  ).value = name;

  document.getElementById("settingBusinessAddress").value = state.settings.businessAddress || "";
  document.getElementById("settingBusinessPhone").value = state.settings.businessPhone || "";
  document.getElementById("settingReportHeader").value = state.settings.reportHeader || "";
  document.getElementById("settingReportFooter").value = state.settings.reportFooter || "";

  document.getElementById(
    "settingLowStock"
  ).value =
    state.settings.lowStockThreshold ?? 5;

  document.title =
    `${name} — Manajemen Usaha Minuman`;
}

/* =========================
   DASHBOARD
========================= */

function renderDashboard() {
  const today = dateKey(new Date());

  const todayOut =
    state.transactions.filter(
      (t) =>
        isActiveSale(t) &&
        dateKey(t.date) === today
    );

  const revenue =
    todayOut.reduce(
      (a, t) =>
        a + transactionMetrics(t).revenue,
      0
    );

  const profit =
    todayOut.reduce(
      (a, t) =>
        a + transactionMetrics(t).profit,
      0
    );

  const sold =
    todayOut.reduce(
      (a, t) =>
        a + Number(t.qty),
      0
    );

  const totalStock =
    state.products.reduce(
      (a, p) =>
        a + Number(p.stock),
      0
    );

  const stockValue =
    state.products.reduce(
      (a, p) =>
        a +
        Number(p.stock) *
        Number(p.cost),
      0
    );

  const threshold =
    Number(
      state.settings.lowStockThreshold ||
      0
    );

  const low =
    state.products.filter(
      (p) =>
        Number(p.stock) <= threshold
    );

  const capitalSummary = calculateCapitalSummary();
  document.getElementById("statCapitalStatus").textContent = !capitalSummary.hasCapital
    ? "Belum dicatat"
    : capitalSummary.recovered ? "Sudah balik modal" : "Belum balik modal";
  document.getElementById("statCapitalRemaining").textContent = capitalSummary.hasCapital
    ? capitalSummary.recovered ? `Surplus laba ${rupiah(capitalSummary.surplus)}` : `Sisa ${rupiah(capitalSummary.remaining)}`
    : "Catat modal item";

  document.getElementById(
    "statRevenueToday"
  ).textContent =
    rupiah(revenue);

  document.getElementById(
    "statSalesToday"
  ).textContent =
    `${number(sold)} unit terjual`;

  document.getElementById(
    "statProfitToday"
  ).textContent =
    rupiah(profit);

  document.getElementById(
    "statMarginToday"
  ).textContent =
    `Margin ${
      revenue
        ? Math.round(
            (profit / revenue) * 100
          )
        : 0
    }%`;

  document.getElementById(
    "statStock"
  ).textContent =
    `${number(totalStock)} unit`;

  document.getElementById(
    "statStockValue"
  ).textContent =
    `Nilai modal ${rupiah(stockValue)}`;

  document.getElementById(
    "statLowStock"
  ).textContent =
    number(low.length);

  /* STOK MENIPIS */

  const lowWrap =
    document.getElementById(
      "lowStockList"
    );

  lowWrap.innerHTML =
    low.length
      ? low
          .sort(
            (a, b) =>
              a.stock - b.stock
          )
          .slice(0, 5)
          .map((p) =>
            listProduct(
              p,
              `${p.stock} unit tersisa`,
              p.stock === 0
                ? "Habis"
                : "Restock"
            )
          )
          .join("")
      : `
        <div class="empty-state">
          Semua stok masih aman.
        </div>
      `;

  /* PRODUK TERLARIS */

  const salesMap = {};

  state.transactions
    .filter(
      isActiveSale
    )
    .forEach((t) => {
      salesMap[t.productId] =
        (salesMap[t.productId] || 0) +
        Number(t.qty);
    });

  const tops =
    state.products
      .map((p) => ({
        ...p,
        sold:
          salesMap[p.id] || 0
      }))
      .sort(
        (a, b) =>
          b.sold - a.sold
      )
      .slice(0, 5);

  document.getElementById(
    "topProductList"
  ).innerHTML =
    tops.length
      ? tops
          .map((p) =>
            listProduct(
              p,
              `${number(
                p.sold
              )} unit terjual`,
              rupiah(
                p.sold * p.price
              )
            )
          )
          .join("")
      : `
        <div class="empty-state">
          Belum ada data penjualan.
        </div>
      `;

  /* TRANSAKSI TERBARU */

  const recent =
    [...state.transactions]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .slice(0, 5);

  document.getElementById(
    "recentTransactions"
  ).innerHTML =
    recent.length
      ? recent
          .map((tx) => {
            const p =
              productById(
                tx.productId
              );

            if (!p) return "";

            const metric =
              transactionMetrics(tx);

            return `
              <div class="list-item">

                <div class="thumb">
                  <img
                    src="${
                      p.image ||
                      makePlaceholder(
                        p.name
                      )
                    }"
                    alt=""
                  >
                </div>

                <div class="list-meta">

                  <strong>
                    ${esc(p.name)}
                  </strong>

                  <small>
                    ${new Date(
                      tx.date
                    ).toLocaleString(
                      "id-ID",
                      {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      }
                    )}

                    ·

                    ${
                      tx.type === "in"
                        ? "Stok masuk"
                        : "Produk keluar"
                    }
                  </small>

                </div>

                <div class="list-value">

                  ${
                    tx.type === "out"
                      ? rupiah(
                          metric.revenue
                        )
                      : `+${number(
                          tx.qty
                        )} unit`
                  }

                </div>

              </div>
            `;
          })
          .join("")
      : `
        <div class="empty-state">
          Belum ada transaksi.
        </div>
      `;

  renderDailyChart();
}

function listProduct(
  p,
  subtitle,
  value
) {
  return `
    <div class="list-item">

      <div class="thumb">
        <img
          src="${
            p.image ||
            makePlaceholder(p.name)
          }"
          alt=""
        >
      </div>

      <div class="list-meta">
        <strong>
          ${esc(p.name)}
        </strong>

        <small>
          ${esc(subtitle)}
        </small>
      </div>

      <div class="list-value">
        ${value}
      </div>

    </div>
  `;
}

function renderCapital() {
  const summary = calculateCapitalSummary();
  const throughCurrentMonth = calculateCapitalSummary(monthKey(new Date()));
  const status = !summary.hasCapital
    ? "Belum ada modal dicatat"
    : summary.recovered ? "Sudah balik modal" : "Belum balik modal";
  const selectedMonthEntries = capitalEntriesForMonth(selectedCapitalMonth)
    .sort((a, b) => new Date(b.date) - new Date(a.date));
  const selectedMonthTotal = selectedMonthEntries.reduce((sum, entry) => sum + capitalEntryTotal(entry), 0);
  const selectedMonthProfit = throughCurrentMonth.rows.find((row) => row.month === selectedCapitalMonth)?.profit || 0;

  document.getElementById("capitalTotal").textContent = rupiah(summary.totalCapital);
  document.getElementById("capitalEntriesCount").textContent = `${number(summary.entries.length)} item modal`;
  document.getElementById("capitalProfit").textContent = rupiah(summary.totalProfit);
  document.getElementById("capitalRemaining").textContent = summary.hasCapital
    ? summary.recovered ? rupiah(summary.surplus) : rupiah(summary.remaining)
    : rupiah(0);
  document.getElementById("capitalRecoveryStatus").textContent = status;
  document.getElementById("capitalProgress").textContent = summary.hasCapital ? `${Math.round(summary.progress)}%` : "0%";
  document.getElementById("capitalProgressBar").style.width = `${summary.hasCapital ? summary.progress : 0}%`;

  document.getElementById("capitalAnalysis").innerHTML = summary.hasCapital
    ? `
      <div class="capital-analysis-state ${summary.recovered ? "recovered" : "recovering"}">
        <strong>${summary.recovered ? "Modal usaha sudah kembali" : "Modal belum kembali"}</strong>
        <p>${summary.recovered
          ? `Akumulasi laba sudah melampaui total modal item sebesar ${rupiah(summary.surplus)}.`
          : `Masih perlu laba bersih ${rupiah(summary.remaining)} untuk menutup seluruh modal item.`}</p>
      </div>
      <div class="capital-equation"><span>Total modal item</span><strong>${rupiah(summary.totalCapital)}</strong><span>Akumulasi laba bersih</span><strong>${rupiah(summary.totalProfit)}</strong></div>
    `
    : `<div class="empty-state capital-empty">Belum ada modal item. Klik kartu bulan, lalu masukkan modal barang agar status balik modal dapat dihitung.</div>`;

  document.getElementById("capitalMonthCards").innerHTML = capitalCardMonths()
    .map((month) => {
      const entries = capitalEntriesForMonth(month);
      const total = entries.reduce((sum, entry) => sum + capitalEntryTotal(entry), 0);
      return `
        <button type="button" class="capital-month-card ${month === selectedCapitalMonth ? "active" : ""}" onclick="selectCapitalMonth('${month}')">
          <span>${monthLabel(month, { year: "numeric" })}</span>
          <strong>${monthLabel(month, { month: "short" })}</strong>
          <small>${rupiah(total)}</small>
          <em>${number(entries.length)} item</em>
        </button>
      `;
    })
    .join("");

  document.getElementById("capitalDetailTitle").textContent = `Detail Modal ${monthLabel(selectedCapitalMonth)}`;
  document.getElementById("capitalDetailSubtitle").textContent =
    `${number(selectedMonthEntries.length)} item modal, total ${rupiah(selectedMonthTotal)}. Laba bulan ini ${rupiah(selectedMonthProfit)}.`;
  document.getElementById("capitalSelectedMonthTotal").textContent = rupiah(selectedMonthTotal);
  document.getElementById("capitalItemTableBody").innerHTML = selectedMonthEntries.length
    ? selectedMonthEntries.map((entry) => `
        <tr>
          <td><strong>${esc(entry.itemName || entry.note || "Modal item")}</strong></td>
          <td>${rupiah(entry.unitPrice || capitalEntryTotal(entry))}</td>
          <td>${number(entry.qty || 1)}</td>
          <td class="money">${rupiah(capitalEntryTotal(entry))}</td>
          <td>
            <div class="row-actions">
              <button type="button" class="mini-btn danger" onclick="deleteCapitalEntry('${entry.id}')">Hapus</button>
            </div>
          </td>
        </tr>
      `).join("")
    : `<tr><td colspan="5"><div class="empty-state">Belum ada item modal pada bulan ini. Klik tombol Masukkan Modal untuk mulai mencatat.</div></td></tr>`;

  const rows = [...throughCurrentMonth.rows].reverse();
  document.getElementById("capitalMonthlyBody").innerHTML = rows.length
    ? rows.map((row) => `
        <tr>
          <td>${new Date(`${row.month}-01T12:00:00`).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}</td>
          <td>${rupiah(row.capital)}</td>
          <td class="${row.profit >= 0 ? "profit" : "loss"}">${rupiah(row.profit)}</td>
          <td>${rupiah(row.cumulativeCapital)}</td>
          <td>${rupiah(row.cumulativeProfit)}</td>
          <td>${row.cumulativeCapital ? row.recovered ? rupiah(row.surplus) : rupiah(row.remaining) : "—"}</td>
          <td><span class="capital-status-label ${row.recovered ? "recovered" : row.cumulativeCapital ? "recovering" : "no-capital"}">${row.cumulativeCapital ? row.recovered ? "Balik modal" : "Belum" : "Belum dicatat"}</span></td>
        </tr>
      `).join("")
    : `<tr><td colspan="7"><div class="empty-state">Belum ada data modal atau laba.</div></td></tr>`;

  const entries = [...summary.entries].sort((a, b) => new Date(b.date) - new Date(a.date));
  document.getElementById("capitalEntryList").innerHTML = entries.length
    ? entries.map((entry) => `
        <div class="capital-entry-row">
          <div><strong>${esc(entry.itemName || entry.note || "Modal item")} · ${rupiah(capitalEntryTotal(entry))}</strong><small>${monthLabel(monthKey(entry.date))} · ${number(entry.qty || 1)} x ${rupiah(entry.unitPrice || capitalEntryTotal(entry))}</small></div>
          <button type="button" class="mini-btn danger" onclick="deleteCapitalEntry('${entry.id}')">Hapus</button>
        </div>
      `).join("")
    : `<div class="empty-state">Riwayat item modal akan muncul di sini.</div>`;
}

function updateCapitalItemPreview() {
  const price = Math.max(0, Number(document.getElementById("capitalItemPrice")?.value || 0));
  const qty = Math.max(0, Number(document.getElementById("capitalItemQty")?.value || 0));
  const total = price * qty;

  document.getElementById("capitalItemPreview").textContent =
    `Total modal: ${rupiah(total)} (${number(qty)} x ${rupiah(price)})`;
}

function openCapitalItemForm(month = selectedCapitalMonth) {
  selectedCapitalMonth = month;
  document.getElementById("capitalItemMonth").value = month;
  document.getElementById("capitalItemModalDesc").textContent =
    `Modal untuk ${monthLabel(month)}. Total akan dihitung otomatis dari harga dan jumlah.`;
  document.getElementById("capitalItemName").value = "";
  document.getElementById("capitalItemPrice").value = "";
  document.getElementById("capitalItemQty").value = "1";
  updateCapitalItemPreview();
  renderCapital();
  openModal("capitalItemModal");
  document.getElementById("capitalItemName").focus();
}

window.selectCapitalMonth = function (month) {
  selectedCapitalMonth = month;
  renderCapital();
};

/* =========================
   PRODUK
========================= */

function renderProducts() {
  const q =
    document
      .getElementById(
        "productSearch"
      )
      ?.value
      .toLowerCase()
      .trim() || "";

  const cat =
    document
      .getElementById(
        "categoryFilter"
      )
      ?.value || "";

  const filtered =
    state.products.filter((p) => {
      const matchesSearch =
        !q ||
        `${p.name} ${p.category}`
          .toLowerCase()
          .includes(q);

      const matchesCategory =
        !cat ||
        p.category === cat;

      return (
        matchesSearch &&
        matchesCategory
      );
    });

  /* CATEGORY FILTER */

  const categories =
    [
      ...new Set(
        state.products
          .map(
            (p) => p.category
          )
          .filter(Boolean)
      )
    ].sort();

  const select =
    document.getElementById(
      "categoryFilter"
    );

  const current =
    select.value;

  select.innerHTML =
    `
      <option value="">
        Semua kategori
      </option>
    ` +
    categories
      .map(
        (c) =>
          `
            <option value="${esc(c)}">
              ${esc(c)}
            </option>
          `
      )
      .join("");

  if (
    categories.includes(current)
  ) {
    select.value = current;
  }

  /* TABEL */

  const threshold =
    Number(
      state.settings.lowStockThreshold ||
      0
    );

  const tbody =
    document.getElementById(
      "productTableBody"
    );

  tbody.innerHTML =
    filtered.length
      ? filtered
          .map((p) => {
            const margin =
              Number(p.price) -
              Number(p.cost);

            let status =
              `
                <span class="badge ok">
                  Aman
                </span>
              `;

            if (
              Number(p.stock) === 0
            ) {
              status =
                `
                  <span class="badge out">
                    Habis
                  </span>
                `;
            } else if (
              Number(p.stock) <=
              threshold
            ) {
              status =
                `
                  <span class="badge low">
                    Menipis
                  </span>
                `;
            }

            return `
              <tr>

                <td>
                  <div class="table-product">

                    <div class="thumb">
                      <img
                        src="${
                          p.image ||
                          makePlaceholder(
                            p.name
                          )
                        }"
                        alt=""
                      >
                    </div>

                    <div>
                      <strong>
                        ${esc(p.name)}
                      </strong>

                      <small>
                        ${esc(
                          p.category
                        )}
                      </small>
                    </div>

                  </div>
                </td>

                <td>
                  ${number(
                    p.volume
                  )} ml
                </td>

                <td>
                  <strong>
                    ${number(
                      p.stock
                    )}
                  </strong>
                  unit
                </td>

                <td class="money">
                  ${rupiah(p.cost)}
                </td>

                <td class="money">
                  ${rupiah(p.price)}
                </td>

                <td class="profit">
                  ${rupiah(margin)}
                </td>

                <td>
                  ${status}
                </td>

                <td>

                  <div class="row-actions">

                    <button
                      class="mini-btn"
                      onclick="editProduct('${p.id}')"
                    >
                      Edit
                    </button>

                    <button
                      class="mini-btn danger"
                      onclick="deleteProduct('${p.id}')"
                    >
                      Hapus
                    </button>

                  </div>

                </td>

              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="8">
            <div class="empty-state">
              Produk tidak ditemukan.
            </div>
          </td>
        </tr>
      `;

  /* RINGKASAN */

  const totalUnits =
    state.products.reduce(
      (a, p) =>
        a + Number(p.stock),
      0
    );

  const invCost =
    state.products.reduce(
      (a, p) =>
        a +
        Number(p.stock) *
        Number(p.cost),
      0
    );

  const invRev =
    state.products.reduce(
      (a, p) =>
        a +
        Number(p.stock) *
        Number(p.price),
      0
    );

  document.getElementById(
    "productCount"
  ).textContent =
    number(
      state.products.length
    );

  document.getElementById(
    "productUnits"
  ).textContent =
    number(totalUnits);

  document.getElementById(
    "inventoryCost"
  ).textContent =
    rupiah(invCost);

  document.getElementById(
    "inventoryRevenue"
  ).textContent =
    rupiah(invRev);
}

function renderSales() {
  const query =
    document.getElementById("salesSearch")?.value
      .toLowerCase()
      .trim() || "";

  const products = state.products.filter((product) =>
    `${product.name} ${product.category}`
      .toLowerCase()
      .includes(query)
  );

  document.getElementById("salesProductGrid").innerHTML =
    products.length
      ? products.map((product) => `
          <article class="sales-product-card">
            <div class="sales-product-image">
              <img src="${product.image || makePlaceholder(product.name)}" alt="${esc(product.name)}" />
              <span class="sales-stock ${Number(product.stock) <= Number(state.settings.lowStockThreshold || 0) ? "low" : ""}">${number(product.stock)} stok</span>
            </div>
            <div class="sales-product-info">
              <small>${esc(product.category)} · ${number(product.volume)} ml</small>
              <strong>${esc(product.name)}</strong>
              <div class="sales-product-price"><span>${rupiah(product.price)}</span><small>Modal ${rupiah(product.cost)}</small></div>
            </div>
            <button class="mini-btn sale add-cart-btn" onclick="addToCart('${product.id}', this)" ${Number(product.stock) <= 0 ? "disabled" : ""}>Tambah keranjang</button>
          </article>
        `).join("")
      : `<div class="empty-state sales-empty">${state.products.length ? "Produk tidak ditemukan." : "Belum ada produk. Tambahkan produk di halaman Atur Stok."}</div>`;
}

function renderCart() {
  const totalItems = (state.cart || []).reduce((sum, item) => sum + Number(item.qty || 0), 0);
  ["cartCount", "ordersCartCount"].forEach((id) => {
    const element = document.getElementById(id);
    if (element) element.textContent = number(totalItems);
  });

  const rows = (state.cart || []).map((item) => {
    const product = productById(item.productId);
    if (!product) return "";
    return `
      <div class="cart-item">
        <img src="${product.image || makePlaceholder(product.name)}" alt="" />
        <div class="cart-item-meta"><strong>${esc(product.name)}</strong><small>${rupiah(product.price)} / unit · stok ${number(product.stock)}</small></div>
        <div class="cart-quantity">
          <button type="button" aria-label="Kurangi ${esc(product.name)}" onclick="changeCartQuantity('${product.id}', -1)">−</button>
          <strong>${number(item.qty)}</strong>
          <button type="button" aria-label="Tambah ${esc(product.name)}" onclick="changeCartQuantity('${product.id}', 1)" ${item.qty >= product.stock ? "disabled" : ""}>+</button>
        </div>
        <strong class="cart-line-total">${rupiah(item.qty * product.price)}</strong>
        <button type="button" class="mini-btn danger" aria-label="Hapus ${esc(product.name)} dari keranjang" onclick="removeFromCart('${product.id}')">×</button>
      </div>
    `;
  }).join("");

  document.getElementById("cartItems").innerHTML = rows || `<div class="empty-state">Keranjang masih kosong. Tambahkan produk dari halaman Jualan.</div>`;
  const subtotal = (state.cart || []).reduce((sum, item) => {
    const product = productById(item.productId);
    return sum + (product ? item.qty * Number(product.price) : 0);
  }, 0);
  const delivery = Number(document.getElementById("cartDeliveryCost")?.value || 0);
  const discount = Number(document.getElementById("cartDiscount")?.value || 0);
  document.getElementById("cartSummary").textContent = `${number(totalItems)} unit · ${number((state.cart || []).length)} jenis produk`;
  document.getElementById("cartTotals").innerHTML = `
    <div><span>Subtotal produk</span><strong>${rupiah(subtotal)}</strong></div>
    <div><span>Diskon</span><strong>− ${rupiah(discount)}</strong></div>
    <div><span>Biaya pengantaran</span><strong>${rupiah(delivery)}</strong></div>
    <div class="cart-grand-total"><span>Total dibayar</span><strong>${rupiah(Math.max(0, subtotal - discount))}</strong></div>
  `;
  document.getElementById("checkoutCartBtn").disabled = !state.cart.length;
}

function renderOrders() {
  const orders = [...(state.orders || [])].sort((a, b) => new Date(b.date) - new Date(a.date));
  const statuses = ["all", "packing", "delivery", "refund", "done"];
  statuses.forEach((status) => {
    const count = status === "all" ? orders.length : orders.filter((order) => order.status === status).length;
    const element = document.getElementById(`orderCount${status[0].toUpperCase()}${status.slice(1)}`);
    if (element) element.textContent = number(count);
  });
  document.querySelectorAll(".order-status-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.orderStatus === selectedOrderStatus);
  });

  const visible = orders.filter((order) => selectedOrderStatus === "all" || order.status === selectedOrderStatus);
  const statusLabels = { packing: "Packing", delivery: "Dalam Pengantaran", refund: "Refund", done: "Done" };
  document.getElementById("orderList").innerHTML = visible.length
    ? visible.map((order) => {
        const transactions = state.transactions.filter((tx) => tx.orderId === order.id);
        const qty = transactions.reduce((sum, tx) => sum + Number(tx.qty), 0);
        const total = transactions.reduce((sum, tx) => sum + transactionMetrics(tx).revenue, 0);
        const lines = transactions.map((tx) => `<li>${esc(productById(tx.productId)?.name || "Produk dihapus")} × ${number(tx.qty)}</li>`).join("");
        const next = order.status === "packing"
          ? `<button class="mini-btn" onclick="setOrderStatus('${order.id}', 'delivery')">Mulai pengantaran</button><button class="mini-btn sale" onclick="setOrderStatus('${order.id}', 'done')">Selesaikan</button>`
          : order.status === "delivery"
            ? `<button class="mini-btn sale" onclick="setOrderStatus('${order.id}', 'done')">Tandai done</button>`
            : order.status === "refund"
              ? `<button class="mini-btn" onclick="setOrderStatus('${order.id}', 'packing')">Pulihkan pesanan</button>`
              : `<button class="mini-btn" onclick="setOrderStatus('${order.id}', 'packing')">Proses ulang</button>`;
        const refundButton = order.status !== "refund" ? `<button class="mini-btn danger" onclick="setOrderStatus('${order.id}', 'refund')">Refund</button>` : "";
        return `
          <article class="order-card">
            <div class="order-card-top"><div><small>${esc(order.id)} · ${new Date(order.date).toLocaleString("id-ID")}</small><h3>${esc(order.customerName || "Pelanggan umum")}</h3></div><span class="order-status-badge ${esc(order.status)}">${statusLabels[order.status] || "Packing"}</span></div>
            <ul class="order-lines">${lines}</ul>
            <div class="order-meta"><span>${number(qty)} unit · ${esc(order.deliveryAddress || "Ambil di tempat")}</span><strong>${rupiah(total)}</strong></div>
            <div class="order-actions">${next}${refundButton}</div>
          </article>
        `;
      }).join("")
    : `<div class="empty-state order-empty">Belum ada pesanan pada status ini. Tambahkan produk ke keranjang dari halaman Jualan.</div>`;
}

function animateProductToCart(trigger) {
  const image = trigger?.closest(".sales-product-card")?.querySelector(".sales-product-image img");
  const target = document.getElementById("openCartBtn");
  if (!image || !target || !image.animate) return;

  const start = image.getBoundingClientRect();
  const end = target.getBoundingClientRect();
  const flight = image.cloneNode();
  flight.className = "cart-flight-image";
  flight.setAttribute("aria-hidden", "true");
  flight.style.left = `${start.left}px`;
  flight.style.top = `${start.top}px`;
  flight.style.width = `${start.width}px`;
  flight.style.height = `${start.height}px`;
  document.body.appendChild(flight);
  const x = end.left + end.width / 2 - (start.left + start.width / 2);
  const y = end.top + end.height / 2 - (start.top + start.height / 2);
  const animation = flight.animate(
    [
      { transform: "translate(0, 0) scale(1)", opacity: 0.95 },
      { transform: `translate(${x}px, ${y}px) scale(.16)`, opacity: 0.2 }
    ],
    { duration: 520, easing: "cubic-bezier(.2,.75,.25,1)" }
  );
  animation.onfinish = () => flight.remove();
  animation.oncancel = () => flight.remove();
  target.classList.remove("cart-bump");
  requestAnimationFrame(() => target.classList.add("cart-bump"));
}

window.addToCart = function (productId, trigger) {
  const product = productById(productId);
  if (!product || Number(product.stock) < 1) return;
  const item = state.cart.find((entry) => entry.productId === productId);
  if (item) {
    if (Number(item.qty) >= Number(product.stock)) {
      showToast(`Stok ${product.name} hanya ${number(product.stock)} unit.`);
      return;
    }
    item.qty += 1;
  } else {
    state.cart.push({ productId, qty: 1 });
  }
  animateProductToCart(trigger);
  saveState();
  renderCart();
  showToast(`${product.name} ditambahkan ke keranjang.`);
};

window.changeCartQuantity = function (productId, delta) {
  const item = state.cart.find((entry) => entry.productId === productId);
  const product = productById(productId);
  if (!item || !product) return;
  item.qty = Math.min(Number(product.stock), Number(item.qty) + delta);
  if (item.qty <= 0) state.cart = state.cart.filter((entry) => entry.productId !== productId);
  saveState();
  renderCart();
};

window.removeFromCart = function (productId) {
  state.cart = state.cart.filter((entry) => entry.productId !== productId);
  saveState();
  renderCart();
};

async function checkoutCart() {
  const items = state.cart.map((entry) => ({ ...entry, product: productById(entry.productId) }));
  if (!items.length || items.some((item) => !item.product || item.qty < 1 || item.qty > item.product.stock)) {
    showToast("Periksa kembali isi keranjang dan ketersediaan stok.");
    renderCart();
    return;
  }
  const customerName = document.getElementById("cartCustomer").value.trim();
  const deliveryAddress = document.getElementById("cartAddress").value.trim();
  const deliveryCost = Math.max(0, Number(document.getElementById("cartDeliveryCost").value || 0));
  const discount = Math.max(0, Number(document.getElementById("cartDiscount").value || 0));
  const grossTotal = items.reduce((sum, item) => sum + item.qty * Number(item.product.price), 0);
  if (!customerName) {
    showToast("Nama pelanggan perlu diisi sebelum membuat pesanan.");
    document.getElementById("cartCustomer").focus();
    return;
  }
  if (discount > grossTotal) {
    showToast("Diskon tidak boleh melebihi subtotal produk.");
    return;
  }

  const accepted = await requestConfirmation({
    title: "Buat pesanan?",
    message: `${items.length} jenis produk untuk ${customerName}, total ${rupiah(grossTotal - discount)}. Pesanan akan masuk ke status Packing dan stok langsung dikurangi.`,
    confirmLabel: "Buat pesanan"
  });
  if (!accepted) return;

  const proof = checkoutCart.paymentProof || "";
  const proofName = checkoutCart.paymentProofName || "";
  const orderId = uid("ord");
  const orderDate = new Date().toISOString();
  let remainingDiscount = discount;
  let remainingDelivery = deliveryCost;

  const order = {
    id: orderId,
    date: orderDate,
    status: "packing",
    customerName,
    deliveryAddress,
    deliveryCost,
    discount,
    paymentProof: proof,
    paymentProofName: proofName,
    refundApplied: false
  };

  items.forEach((item, index) => {
    const lineGross = item.qty * Number(item.product.price);
    const isLast = index === items.length - 1;
    const weight = grossTotal > 0 ? lineGross / grossTotal : 1 / items.length;
    const lineDiscount = isLast ? remainingDiscount : Math.round(discount * weight);
    const lineDelivery = isLast ? remainingDelivery : Math.round(deliveryCost * weight);
    remainingDiscount -= lineDiscount;
    remainingDelivery -= lineDelivery;

    state.transactions.push({
      id: uid("tx"),
      orderId,
      type: "out",
      productId: item.productId,
      qty: Number(item.qty),
      date: orderDate,
      note: `Pesanan ${orderId}`,
      unitCost: Number(item.product.cost),
      unitPrice: Number(item.product.price),
      customerName,
      deliveryAddress,
      deliveryCost: lineDelivery,
      discount: lineDiscount,
      paymentProof: proof,
      paymentProofName: proofName
    });
    item.product.stock = Number(item.product.stock) - Number(item.qty);
  });

  state.orders.push(order);
  state.cart = [];
  checkoutCart.paymentProof = "";
  checkoutCart.paymentProofName = "";
  document.getElementById("cartCustomer").value = "";
  document.getElementById("cartAddress").value = "";
  document.getElementById("cartDeliveryCost").value = 0;
  document.getElementById("cartDiscount").value = 0;
  document.getElementById("cartPaymentProof").value = "";
  saveState();
  closeModal("cartModal");
  renderAll();
  showToast("Pesanan dibuat dan stok diperbarui.");
};

window.setOrderStatus = async function (orderId, status) {
  const order = state.orders.find((item) => item.id === orderId);
  if (!order || order.status === status) return;
  const transactions = state.transactions.filter((tx) => tx.orderId === order.id);
  const toRefund = status === "refund" && !order.refundApplied;
  const restoreFromRefund = order.status === "refund" && order.refundApplied && status !== "refund";

  if (toRefund) {
    const accepted = await requestConfirmation({
      title: "Proses refund?",
      message: `Pesanan ${order.id} akan dibatalkan, stok dikembalikan, dan nilainya dikeluarkan dari laporan penjualan.`,
      confirmLabel: "Proses refund",
      danger: true
    });
    if (!accepted) return;
    transactions.forEach((tx) => {
      const product = productById(tx.productId);
      if (product) product.stock = Number(product.stock) + Number(tx.qty);
    });
    order.refundApplied = true;
  }

  if (restoreFromRefund) {
    const cannotRestore = transactions.find((tx) => {
      const product = productById(tx.productId);
      return !product || Number(product.stock) < Number(tx.qty);
    });
    if (cannotRestore) {
      showToast("Stok tidak cukup untuk memulihkan pesanan refund ini.");
      return;
    }
    transactions.forEach((tx) => {
      const product = productById(tx.productId);
      product.stock = Number(product.stock) - Number(tx.qty);
    });
    order.refundApplied = false;
  }

  order.status = status;
  saveState();
  renderAll();
  showToast(`Status pesanan diperbarui: ${status === "delivery" ? "Dalam Pengantaran" : status}.`);
};

window.deleteCapitalEntry = async function (id) {
  const entry = state.capitalEntries.find((item) => item.id === id);
  if (!entry) return;
  const accepted = await requestConfirmation({
    title: "Hapus modal item?",
    message: `${entry.itemName || entry.note || "Modal item"} sebesar ${rupiah(capitalEntryTotal(entry))} pada ${monthLabel(monthKey(entry.date))} akan dihapus dari analisis balik modal.`,
    confirmLabel: "Hapus modal",
    danger: true
  });
  if (!accepted) return;
  state.capitalEntries = state.capitalEntries.filter((item) => item.id !== id);
  saveState();
  renderAll();
  showToast("Modal item dihapus.");
};

/* =========================
   TRANSAKSI
========================= */

function renderTransactions() {
  const q =
    document
      .getElementById(
        "transactionSearch"
      )
      ?.value
      .toLowerCase()
      .trim() || "";

  const type =
    document
      .getElementById(
        "transactionTypeFilter"
      )
      ?.value || "";

  const rows =
    [...state.transactions]
      .sort(
        (a, b) =>
          new Date(b.date) -
          new Date(a.date)
      )
      .filter((tx) => {
        const p =
          productById(
            tx.productId
          );

        const hay =
          `${
            p?.name || ""
          } ${
            tx.note || ""
          } ${
            tx.customerName || ""
          } ${
            tx.deliveryAddress || ""
          }`.toLowerCase();

        return (
          (!q ||
            hay.includes(q)) &&
          (!type ||
            tx.type === type)
        );
      });

  document.getElementById(
    "transactionTableBody"
  ).innerHTML =
    rows.length
      ? rows
          .map((tx) => {
            const p =
              productById(
                tx.productId
              );

            if (!p) return "";

            const m =
              transactionMetrics(tx);

            return `
              <tr>

                <td>
                  ${new Date(
                    tx.date
                  ).toLocaleString(
                    "id-ID",
                    {
                      day: "2-digit",
                      month: "short",
                      year: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit"
                    }
                  )}
                </td>

                <td>

                  <div class="table-product">

                    <div class="thumb">
                      <img
                        src="${
                          p.image ||
                          makePlaceholder(
                            p.name
                          )
                        }"
                        alt=""
                      >
                    </div>

                    <div>

                      <strong>
                        ${esc(p.name)}
                      </strong>

                      <small>
                        ${number(
                          p.volume
                        )} ml
                      </small>

                    </div>

                  </div>

                </td>

                <td>

                  ${
                    tx.type === "in"
                      ? `
                        <span class="badge in">
                          Stok masuk
                        </span>
                      `
                      : `
                        <span class="badge sale">
                          Keluar
                        </span>
                      `
                  }

                </td>

                <td>
                  <strong>
                    ${
                      tx.type === "in"
                        ? "+"
                        : "-"
                    }${number(
                      tx.qty
                    )}
                  </strong>
                </td>

                <td>
                  ${rupiah(m.cost)}
                </td>

                <td>
                  ${
                    tx.type === "out"
                      ? rupiah(
                          m.revenue
                        )
                      : "—"
                  }
                </td>

                <td
                  class="${
                    tx.type === "out"
                      ? "profit"
                      : ""
                  }"
                >
                  ${
                    tx.type === "out"
                      ? rupiah(
                          m.profit
                        )
                      : "—"
                  }
                </td>

                <td>
                  ${esc(
                    tx.note || "—"
                  )}
                </td>

                <td>
                  ${tx.type === "out" ? `
                    <button class="mini-btn" onclick="showReceipt('${tx.id}')">Lihat struk</button>
                  ` : "—"}
                </td>

                <td>

                  <button
                    class="mini-btn danger"
                    onclick="deleteTransaction('${tx.id}')"
                  >
                    Hapus
                  </button>

                </td>

              </tr>
            `;
          })
          .join("")
      : `
        <tr>
          <td colspan="10">
            <div class="empty-state">
              Belum ada transaksi.
            </div>
          </td>
        </tr>
      `;
}

/* =========================
   LAPORAN
========================= */

function renderReports() {
  let txs =
    [...state.transactions];

  if (reportRange.start) {
    txs =
      txs.filter(
        (t) =>
          new Date(t.date) >=
          new Date(
            `${reportRange.start}T00:00:00`
          )
      );
  }

  if (reportRange.end) {
    txs =
      txs.filter(
        (t) =>
          new Date(t.date) <=
          new Date(
            `${reportRange.end}T23:59:59`
          )
      );
  }

  const outs = txs.filter(isActiveSale);

  const ins =
    txs.filter(
      (t) => t.type === "in"
    );

  const revenue =
    outs.reduce(
      (a, t) =>
        a +
        transactionMetrics(t)
          .revenue,
      0
    );

  const profit =
    outs.reduce(
      (a, t) =>
        a +
        transactionMetrics(t)
          .profit,
      0
    );

  const outQty =
    outs.reduce(
      (a, t) =>
        a + Number(t.qty),
      0
    );

  const inQty = ins.reduce((a, t) => a + Number(t.qty), 0);

  const totalCost = outs.reduce(
    (sum, tx) => sum + transactionMetrics(tx).cost,
    0
  );

  const totalDelivery = outs.reduce(
    (sum, tx) => sum + transactionMetrics(tx).deliveryCost,
    0
  );

  const totalDiscount = outs.reduce(
    (sum, tx) => sum + transactionMetrics(tx).discount,
    0
  );

  const periodCapital = capitalDepositsInRange(reportRange.start, reportRange.end)
    .reduce((sum, entry) => sum + capitalEntryTotal(entry), 0);
  const capitalAtPeriodEnd = calculateCapitalSummary(reportRange.end?.slice(0, 7) || monthKey(new Date()));

  document.getElementById(
    "reportRevenue"
  ).textContent =
    rupiah(revenue);

  document.getElementById(
    "reportProfit"
  ).textContent =
    rupiah(profit);

  document.getElementById(
    "reportSoldUnits"
  ).textContent =
    `${number(outQty)} unit keluar`;

  document.getElementById(
    "reportMargin"
  ).textContent =
    `Margin ${
      revenue
        ? Math.round(
            (profit / revenue) *
            100
          )
        : 0
    }%`;

  document.getElementById(
    "reportIn"
  ).textContent =
    `${number(inQty)} unit`;

  document.getElementById(
    "reportOut"
  ).textContent =
    `${number(outQty)} unit`;

  document.getElementById("reportCost").textContent = rupiah(totalCost);
  document.getElementById("reportDelivery").textContent = rupiah(totalDelivery);
  document.getElementById("reportDiscount").textContent = rupiah(totalDiscount);
  document.getElementById("reportCapitalIn").textContent = rupiah(periodCapital);
  document.getElementById("reportCapitalRemaining").textContent = capitalAtPeriodEnd.hasCapital
    ? capitalAtPeriodEnd.recovered ? rupiah(capitalAtPeriodEnd.surplus) : rupiah(capitalAtPeriodEnd.remaining)
    : rupiah(0);
  document.getElementById("reportCapitalStatus").textContent = !capitalAtPeriodEnd.hasCapital
    ? "Belum ada modal dicatat"
    : capitalAtPeriodEnd.recovered ? "Balik modal tercapai" : "Belum balik modal";

  /* PRODUK */

  const byProduct = {};

  outs.forEach((t) => {
    const m =
      transactionMetrics(t);

    byProduct[
      t.productId
    ] ||= {
      qty: 0,
      revenue: 0,
      profit: 0
    };

    byProduct[
      t.productId
    ].qty +=
      Number(t.qty);

    byProduct[
      t.productId
    ].revenue +=
      m.revenue;

    byProduct[
      t.productId
    ].profit +=
      m.profit;
  });

  const prodSummary =
    Object.entries(byProduct)
      .map(
        ([id, v]) => ({
          product:
            productById(id),
          ...v
        })
      )
      .filter(
        (x) => x.product
      )
      .sort(
        (a, b) =>
          b.revenue -
          a.revenue
      );

  document.getElementById(
    "reportProductList"
  ).innerHTML =
    prodSummary.length
      ? prodSummary
          .slice(0, 8)
          .map((x) =>
            listProduct(
              x.product,
              `${number(
                x.qty
              )} unit · laba ${rupiah(
                x.profit
              )}`,
              rupiah(
                x.revenue
              )
            )
          )
          .join("")
      : `
        <div class="empty-state">
          Belum ada penjualan pada periode ini.
        </div>
      `;

  renderMonthlyChart(txs);
}

/* =========================
   GRAFIK HARIAN
========================= */

function renderDailyChart() {
  if (!window.Chart) return;

  const labels = [];
  const rev = [];
  const prof = [];

  for (
    let i = 6;
    i >= 0;
    i--
  ) {
    const d = new Date();

    d.setHours(
      0,
      0,
      0,
      0
    );

    d.setDate(
      d.getDate() - i
    );

    const key =
      dateKey(d);

    labels.push(
      d.toLocaleDateString(
        "id-ID",
        {
          day: "2-digit",
          month: "short"
        }
      )
    );

    const txs =
      state.transactions.filter(
        (t) =>
          isActiveSale(t) &&
          dateKey(t.date) === key
      );

    rev.push(
      txs.reduce(
        (a, t) =>
          a +
          transactionMetrics(t)
            .revenue,
        0
      )
    );

    prof.push(
      txs.reduce(
        (a, t) =>
          a +
          transactionMetrics(t)
            .profit,
        0
      )
    );
  }

  const ctx =
    document.getElementById(
      "dailyChart"
    );

  if (dailyChart) {
    dailyChart.destroy();
  }

  dailyChart =
    new Chart(ctx, {
      type: "line",

      data: {
        labels,

        datasets: [
          {
            label: "Omzet",
            data: rev,
            borderColor:
              "#2563eb",
            backgroundColor:
              "rgba(37,99,235,.08)",
            tension: 0.36,
            fill: true,
            borderWidth: 2,
            pointRadius: 3
          },
          {
            label: "Laba",
            data: prof,
            borderColor:
              "#059669",
            backgroundColor:
              "rgba(5,150,105,.03)",
            tension: 0.36,
            fill: false,
            borderWidth: 2,
            pointRadius: 3
          }
        ]
      },

      options: {
        maintainAspectRatio:
          false,

        plugins: {
          legend: {
            position: "top",
            align: "end",

            labels: {
              usePointStyle: true,
              boxWidth: 7,

              font: {
                size: 10
              }
            }
          }
        },

        scales: {
          x: {
            grid: {
              display: false
            },

            ticks: {
              font: {
                size: 9
              },

              color:
                "#94a3b8"
            }
          },

          y: {
            beginAtZero: true,

            grid: {
              color:
                "#eef2f7"
            },

            ticks: {
              font: {
                size: 9
              },

              color:
                "#94a3b8",

              callback: (
                v
              ) =>
                "Rp" +
                Intl.NumberFormat(
                  "id-ID",
                  {
                    notation:
                      "compact"
                  }
                ).format(v)
            }
          }
        }
      }
    });
}

/* =========================
   GRAFIK BULANAN
========================= */

function renderMonthlyChart(
  sourceTxs =
    state.transactions
) {
  if (!window.Chart) return;

  const labels = [];
  const keys = [];

  const base =
    new Date();

  base.setDate(1);

  for (
    let i = 5;
    i >= 0;
    i--
  ) {
    const d =
      new Date(
        base.getFullYear(),
        base.getMonth() - i,
        1
      );

    keys.push(
      `${d.getFullYear()}-${pad(
        d.getMonth() + 1
      )}`
    );

    labels.push(
      d.toLocaleDateString(
        "id-ID",
        {
          month: "short",
          year: "2-digit"
        }
      )
    );
  }

  const rev =
    keys.map((k) =>
      sourceTxs
        .filter(
          (t) =>
            isActiveSale(t) &&
            monthKey(t.date) ===
              k
        )
        .reduce(
          (a, t) =>
            a +
            transactionMetrics(
              t
            ).revenue,
          0
        )
    );

  const prof =
    keys.map((k) =>
      sourceTxs
        .filter(
          (t) =>
            isActiveSale(t) &&
            monthKey(t.date) ===
              k
        )
        .reduce(
          (a, t) =>
            a +
            transactionMetrics(
              t
            ).profit,
          0
        )
    );

  const ctx =
    document.getElementById(
      "monthlyChart"
    );

  if (monthlyChart) {
    monthlyChart.destroy();
  }

  monthlyChart =
    new Chart(ctx, {
      type: "bar",

      data: {
        labels,

        datasets: [
          {
            label: "Omzet",
            data: rev,
            backgroundColor:
              "#2563eb",
            borderRadius: 6,
            maxBarThickness: 34
          },
          {
            label: "Laba",
            data: prof,
            backgroundColor:
              "#93c5fd",
            borderRadius: 6,
            maxBarThickness: 34
          }
        ]
      },

      options: {
        maintainAspectRatio:
          false,

        plugins: {
          legend: {
            position: "top",
            align: "end",

            labels: {
              usePointStyle:
                true,

              boxWidth: 7,

              font: {
                size: 10
              }
            }
          }
        },

        scales: {
          x: {
            grid: {
              display: false
            },

            ticks: {
              font: {
                size: 9
              },

              color:
                "#94a3b8"
            }
          },

          y: {
            beginAtZero: true,

            grid: {
              color:
                "#eef2f7"
            },

            ticks: {
              font: {
                size: 9
              },

              color:
                "#94a3b8",

              callback: (
                v
              ) =>
                "Rp" +
                Intl.NumberFormat(
                  "id-ID",
                  {
                    notation:
                      "compact"
                  }
                ).format(v)
            }
          }
        }
      }
    });
}

/* =========================
   SELECT PRODUK TRANSAKSI
========================= */

function refreshTransactionProductOptions() {
  const select =
    document.getElementById(
      "transactionProduct"
    );

  if (!select) return;

  const current =
    select.value;

  select.innerHTML =
    state.products.length
      ? state.products
          .map(
            (p) =>
              `
                <option value="${p.id}">
                  ${esc(
                    p.name
                  )} — stok ${number(
                    p.stock
                  )}
                </option>
              `
          )
          .join("")
      : `
        <option value="">
          Belum ada produk
        </option>
      `;

  if (
    state.products.some(
      (p) =>
        p.id === current
    )
  ) {
    select.value =
      current;
  }

  updateTransactionPreview();
}

/* =========================
   FORM PRODUK
========================= */

function openProductForm(
  id = null
) {
  const form =
    document.getElementById(
      "productForm"
    );

  form.reset();

  document.getElementById(
    "productId"
  ).value = "";

  document.getElementById(
    "productStock"
  ).value = 0;

  document.getElementById(
    "productImageData"
  ).value = "";

  document.getElementById(
    "imagePreview"
  ).innerHTML = "IMG";

  document.getElementById(
    "productModalTitle"
  ).textContent =
    "Tambah Produk";

  if (id) {
    const p =
      productById(id);

    if (!p) return;

    document.getElementById(
      "productModalTitle"
    ).textContent =
      "Edit Produk";

    document.getElementById(
      "productId"
    ).value =
      p.id;

    document.getElementById(
      "productName"
    ).value =
      p.name;

    document.getElementById(
      "productCategory"
    ).value =
      p.category;

    document.getElementById(
      "productVolume"
    ).value =
      p.volume;

    document.getElementById(
      "productStock"
    ).value =
      p.stock;

    document.getElementById(
      "productCost"
    ).value =
      p.cost;

    document.getElementById(
      "productPrice"
    ).value =
      p.price;

    document.getElementById(
      "productImageData"
    ).value =
      p.image || "";

    document.getElementById(
      "imagePreview"
    ).innerHTML =
      `
        <img
          src="${
            p.image ||
            makePlaceholder(p.name)
          }"
          alt=""
        >
      `;
  }

  updateProfitPreview();

  openModal(
    "productModal"
  );
}

window.editProduct =
  openProductForm;

window.deleteProduct =
  async function (id) {
    const p =
      productById(id);

    if (!p) return;

    const accepted = await requestConfirmation({
      title: "Hapus produk?",
      message: `Produk "${p.name}" beserta semua riwayat transaksinya akan dihapus. Tindakan ini tidak dapat dibatalkan.`,
      confirmLabel: "Hapus produk",
      danger: true
    });

    if (!accepted) {
      return;
    }

    state.products =
      state.products.filter(
        (x) =>
          x.id !== id
      );

    state.cart = (state.cart || []).filter((item) => item.productId !== id);

    state.transactions =
      state.transactions.filter(
        (t) =>
          t.productId !== id
      );

    saveState();

    renderAll();

    showToast(
      "Produk berhasil dihapus."
    );
  };

/* =========================
   HAPUS TRANSAKSI
========================= */

window.deleteTransaction =
  async function (id) {
    const tx =
      state.transactions.find(
        (t) =>
          t.id === id
      );

    if (!tx) return;

    const p =
      productById(
        tx.productId
      );

    if (!p) return;

    const accepted = await requestConfirmation({
      title: "Hapus transaksi?",
      message: `Transaksi ${tx.type === "in" ? "stok masuk" : "penjualan"} ${number(tx.qty)} unit ${p.name} akan dihapus dan stok disesuaikan kembali.`,
      confirmLabel: "Hapus transaksi",
      danger: true
    });

    if (!accepted) {
      return;
    }

    if (
      tx.type === "out"
    ) {
      p.stock =
        Number(p.stock) +
        Number(tx.qty);
    } else {
      if (
        Number(p.stock) <
        Number(tx.qty)
      ) {
        alert(
          "Transaksi tidak dapat dihapus karena stok saat ini lebih kecil dari stok masuk yang akan dibatalkan."
        );

        return;
      }

      p.stock =
        Number(p.stock) -
        Number(tx.qty);
    }

    state.transactions =
      state.transactions.filter(
        (t) =>
          t.id !== id
      );

    saveState();

    renderAll();

    showToast(
      "Transaksi dihapus dan stok disesuaikan."
    );
  };

/* =========================
   PREVIEW LABA PRODUK
========================= */

function updateProfitPreview() {
  const c =
    Number(
      document.getElementById(
        "productCost"
      ).value || 0
    );

  const p =
    Number(
      document.getElementById(
        "productPrice"
      ).value || 0
    );

  const profit =
    p - c;

  const margin =
    p
      ? Math.round(
          (profit / p) * 100
        )
      : 0;

  document.getElementById(
    "profitPreview"
  ).textContent =
    `Laba per unit: ${rupiah(
      profit
    )} · Margin ${margin}%`;
}

/* =========================
   FORM TRANSAKSI
========================= */

function openTransactionForm(
  type = "out",
  productId = null
) {
  if (
    !state.products.length
  ) {
    showToast(
      "Tambahkan produk terlebih dahulu."
    );

    goPage("products");

    return;
  }

  document.getElementById(
    "transactionType"
  ).value =
    type;

  document.getElementById(
    "transactionQty"
  ).value =
    1;

  document.getElementById(
    "transactionDate"
  ).value =
    toLocalDateTimeInput(
      new Date()
    );

  document.getElementById(
    "transactionNote"
  ).value =
    type === "out"
      ? "Penjualan toko"
      : "";

  document.getElementById("saleCustomer").value = "";
  document.getElementById("saleAddress").value = "";
  document.getElementById("saleDeliveryCost").value = 0;
  document.getElementById("saleDiscount").value = 0;
  document.getElementById("salePaymentProof").value = "";
  document.getElementById("saleDetailsFields").hidden = type !== "out";
  document.getElementById("saleCustomer").required = type === "out";
  document.getElementById("saleAddress").required = type === "out";
  openTransactionForm.paymentProof = "";
  openTransactionForm.paymentProofName = "";

  document.getElementById(
    "transactionModalTitle"
  ).textContent =
    type === "in"
      ? "Tambah Stok Masuk"
      : "Catat Penjualan";

  document.getElementById(
    "transactionModalDesc"
  ).textContent =
    type === "in"
      ? "Stok produk akan bertambah otomatis."
      : "Stok, pendapatan, modal, biaya, dan laba dihitung otomatis.";

  document.getElementById(
    "transactionSubmitBtn"
  ).textContent =
    type === "in"
      ? "Tambah Stok"
      : "Simpan Penjualan";

  refreshTransactionProductOptions();

  if (
    productId &&
    state.products.some(
      (p) => p.id === productId
    )
  ) {
    document.getElementById(
      "transactionProduct"
    ).value = productId;
  }

  updateTransactionPreview();

  openModal(
    "transactionModal"
  );

  if (productId) {
    document.getElementById(
      "transactionQty"
    ).focus();
  }
}

window.sellProduct =
  function (id) {
    openTransactionForm("out", id);
  };

window.showReceipt = function (id) {
  const tx = state.transactions.find((item) => item.id === id);
  const product = tx && productById(tx.productId);
  if (!tx || !product) return;

  currentReceiptId = id;

  const metrics = transactionMetrics(tx);
  const proofMarkup = tx.paymentProof
    ? `<a class="receipt-proof-link" href="${tx.paymentProof}" target="_blank" rel="noopener">${tx.paymentProofName ? esc(tx.paymentProofName) : "Buka bukti transfer"}<img src="${tx.paymentProof}" alt="Bukti transfer" /></a>`
    : `<span class="receipt-muted">Tidak dilampirkan</span>`;

  document.getElementById("receiptSubtitle").textContent =
    `No. ${tx.id} · ${new Date(tx.date).toLocaleString("id-ID")}`;

  document.getElementById("receiptContent").innerHTML = `
    <div class="receipt-business">${esc(state.settings.brandName || "DrinkStock")}</div>
    <div class="receipt-row"><span>Pelanggan</span><strong>${esc(tx.customerName || "Pelanggan umum")}</strong></div>
    <div class="receipt-row"><span>Pengantaran</span><strong>${esc(tx.deliveryAddress || "Ambil di tempat")}</strong></div>
    <div class="receipt-row"><span>Produk</span><strong>${esc(product.name)} × ${number(tx.qty)}</strong></div>
    <div class="receipt-row"><span>Harga satuan</span><strong>${rupiah(tx.unitPrice)}</strong></div>
    <div class="receipt-row"><span>Total produk</span><strong>${rupiah(metrics.grossRevenue)}</strong></div>
    <div class="receipt-row"><span>Diskon</span><strong>− ${rupiah(metrics.discount)}</strong></div>
    <div class="receipt-row"><span>Pengeluaran pengantaran</span><strong>${rupiah(metrics.deliveryCost)}</strong></div>
    <div class="receipt-row receipt-total"><span>Total produk dibayar</span><strong>${rupiah(metrics.revenue)}</strong></div>
    <div class="receipt-row"><span>Bukti transfer</span>${proofMarkup}</div>
  `;

  openModal("receiptModal");
};

/* =========================
   PREVIEW TRANSAKSI
========================= */

function updateTransactionPreview() {
  const p =
    productById(
      document.getElementById(
        "transactionProduct"
      )?.value
    );

  const qty =
    Number(
      document.getElementById(
        "transactionQty"
      )?.value || 0
    );

  const type =
    document.getElementById(
      "transactionType"
    )?.value || "out";

  const box =
    document.getElementById(
      "transactionPreview"
    );

  if (!box) return;

  if (!p) {
    box.textContent =
      "Pilih produk.";

    return;
  }

  if (
    type === "in"
  ) {
    box.textContent =
      `Stok setelah transaksi: ${number(
        Number(p.stock) + qty
      )} unit · Nilai modal masuk ${rupiah(
        qty *
          Number(p.cost)
      )}`;
  } else {
    const grossRevenue =
      qty *
      Number(p.price);

    const cost =
      qty *
      Number(p.cost);

    const discount = Number(document.getElementById("saleDiscount")?.value || 0);
    const deliveryCost = Number(document.getElementById("saleDeliveryCost")?.value || 0);
    const revenue = Math.max(0, grossRevenue - discount);

    const profit =
      revenue - cost - deliveryCost;

    box.textContent =
      `Stok: ${number(
        p.stock
      )} → ${number(
        Math.max(
          0,
          Number(p.stock) -
            qty
        )
      )} unit · Pendapatan bersih ${rupiah(revenue)} · Modal ${rupiah(cost)} · Ongkir ${rupiah(deliveryCost)} · Diskon ${rupiah(discount)} · Laba bersih ${rupiah(profit)}`;
  }
}

/* =========================
   EVENT LISTENER
========================= */

function setupNavOrder() {
  const nav = document.getElementById("sidebarNav");
  let rows = [...nav.querySelectorAll(".nav-row")];
  let drag = null;
  let clickBlockedUntil = 0;
  localStorage.removeItem("drinkstock_sidebar_layout_v1");

  try {
    const savedOrder = JSON.parse(localStorage.getItem(NAV_ORDER_KEY) || "[]");
    const rank = new Map(savedOrder.map((page, index) => [page, index]));
    rows.sort((a, b) => (rank.get(a.querySelector(".nav-item").dataset.page) ?? Infinity) - (rank.get(b.querySelector(".nav-item").dataset.page) ?? Infinity));
    rows.forEach((row) => nav.appendChild(row));
  } catch {
    rows = [...nav.querySelectorAll(".nav-row")];
  }

  const saveOrder = () => {
    const order = [...nav.querySelectorAll(".nav-row .nav-item")].map((item) => item.dataset.page);
    try {
      localStorage.setItem(NAV_ORDER_KEY, JSON.stringify(order));
    } catch {
      showToast("Urutan menu tidak dapat disimpan di browser ini.");
    }
  };

  const animateReflow = (positions, skipRow) => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    nav.querySelectorAll(".nav-row").forEach((row) => {
      if (row === skipRow) return;
      const oldTop = positions.get(row);
      if (oldTop === undefined) return;
      const offset = oldTop - row.getBoundingClientRect().top;
      if (Math.abs(offset) < 1) return;
      row.animate(
        [
          { transform: `translateY(${offset}px)` },
          { transform: "translateY(0)" }
        ],
        { duration: 230, easing: "cubic-bezier(.2,.75,.25,1)" }
      );
    });
  };

  nav.addEventListener("pointerdown", (event) => {
    const row = event.target.closest(".nav-row");
    if (!row || (event.pointerType === "mouse" && event.button !== 0)) return;
    drag = { row, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false, target: null };
  });

  document.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.hypot(event.clientX - drag.startX, event.clientY - drag.startY) < 6) return;
    event.preventDefault();
    drag.moved = true;
    drag.row.classList.add("dragging");
    const target = document.elementFromPoint(event.clientX, event.clientY)?.closest(".nav-row");
    if (!target || target === drag.row || !nav.contains(target)) return;
    if (drag.target && drag.target !== target) drag.target.classList.remove("drop-target");
    drag.target = target;
    target.classList.add("drop-target");
    const bounds = target.getBoundingClientRect();
    const insertBefore = event.clientY < bounds.top + bounds.height / 2 ? target : target.nextSibling;
    if (insertBefore === drag.row || drag.row.nextSibling === insertBefore) return;
    const positions = new Map([...nav.querySelectorAll(".nav-row")].map((row) => [row, row.getBoundingClientRect().top]));
    nav.insertBefore(drag.row, insertBefore);
    animateReflow(positions, drag.row);
  }, { passive: false });

  const finishDrag = (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const finished = drag;
    drag = null;
    finished.row.classList.remove("dragging");
    nav.querySelectorAll(".drop-target").forEach((row) => row.classList.remove("drop-target"));
    if (finished.moved) {
      clickBlockedUntil = Date.now() + 250;
      saveOrder();
    }
  };
  document.addEventListener("pointerup", finishDrag);
  document.addEventListener("pointercancel", finishDrag);
  nav.addEventListener("click", (event) => {
    if (Date.now() < clickBlockedUntil) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);
}

function setupEvents() {
  document.getElementById(
    "todayChip"
  ).textContent =
    new Date().toLocaleDateString(
      "id-ID",
      {
        weekday: "long",
        day: "2-digit",
        month: "long",
        year: "numeric"
      }
    );

  setupNavOrder();

  /* NAV */

  document
    .querySelectorAll(
      ".nav-item"
    )
    .forEach((btn) =>
      btn.addEventListener(
        "click",
        () => goPage(btn.dataset.page)
      )
    );

  document
    .querySelectorAll(
      "[data-go]"
    )
    .forEach((btn) =>
      btn.addEventListener(
        "click",
        () =>
          goPage(
            btn.dataset.go
          )
      )
    );

  document
    .getElementById(
      "menuBtn"
    )
    .addEventListener(
      "click",
      () =>
        document
          .getElementById(
            "sidebar"
          )
          .classList.toggle(
            "open"
          )
    );

  /* CLOSE MODAL */

  document
    .querySelectorAll(
      "[data-close]"
    )
    .forEach((btn) =>
      btn.addEventListener(
        "click",
        () =>
          closeModal(
            btn.dataset.close
          )
      )
    );

  document.getElementById("cancelConfirmationBtn").addEventListener("click", () => resolveConfirmation(false));
  document.getElementById("acceptConfirmationBtn").addEventListener("click", () => resolveConfirmation(true));

  document
    .querySelectorAll(
      ".modal-backdrop"
    )
    .forEach((m) =>
      m.addEventListener(
        "click",
        (e) => {
          if (
            e.target === m &&
            m.id === "receiptModal"
          ) {
            closeModal(
              m.id
            );
          }
        }
      )
    );

  /* BUTTON */

  document
    .getElementById(
      "addProductBtn"
    )
    .addEventListener(
      "click",
      () =>
        openProductForm()
    );

  document
    .getElementById(
      "stockInBtn"
    )
    .addEventListener(
      "click",
      () =>
        openTransactionForm(
          "in"
        )
    );

  document
    .getElementById(
      "stockOutBtn"
    )
    .addEventListener(
      "click",
      () => goPage("sales")
    );

  document.getElementById("stockInProductsBtn").addEventListener("click", () => openTransactionForm("in"));

  document.getElementById("openCartBtn").addEventListener("click", () => {
    renderCart();
    openModal("cartModal");
  });

  document.getElementById("ordersOpenCartBtn").addEventListener("click", () => {
    renderCart();
    openModal("cartModal");
  });

  document.getElementById("checkoutCartBtn").addEventListener("click", checkoutCart);

  ["cartDeliveryCost", "cartDiscount"].forEach((id) => {
    document.getElementById(id).addEventListener("input", renderCart);
  });

  document.getElementById("cartPaymentProof").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      alert("Ukuran bukti transfer maksimal sekitar 1,5 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      checkoutCart.paymentProof = reader.result;
      checkoutCart.paymentProofName = file.name;
    };
    reader.readAsDataURL(file);
  });

  document.querySelectorAll(".order-status-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      selectedOrderStatus = tab.dataset.orderStatus;
      renderOrders();
    });
  });

  document
    .getElementById(
      "heroInBtn"
    )
    .addEventListener(
      "click",
      () =>
        openTransactionForm(
          "in"
        )
    );

  document
    .getElementById(
      "heroOutBtn"
    )
    .addEventListener(
      "click",
      () => goPage("sales")
    );

  /* FILTER */

  document
    .getElementById(
      "productSearch"
    )
    .addEventListener(
      "input",
      renderProducts
    );

  document
    .getElementById(
      "categoryFilter"
    )
    .addEventListener(
      "change",
      renderProducts
    );

  document.getElementById("salesSearch").addEventListener("input", renderSales);

  document
    .getElementById(
      "transactionSearch"
    )
    .addEventListener(
      "input",
      renderTransactions
    );

  document
    .getElementById(
      "transactionTypeFilter"
    )
    .addEventListener(
      "change",
      renderTransactions
    );

  /* PREVIEW PROFIT */

  document
    .getElementById(
      "productCost"
    )
    .addEventListener(
      "input",
      updateProfitPreview
    );

  document
    .getElementById(
      "productPrice"
    )
    .addEventListener(
      "input",
      updateProfitPreview
    );

  document
    .getElementById(
      "productName"
    )
    .addEventListener(
      "input",
      (e) => {
        if (
          !document.getElementById(
            "productImageData"
          ).value
        ) {
          document.getElementById(
            "imagePreview"
          ).textContent =
            (
              e.target.value.slice(
                0,
                2
              ) || "IMG"
            ).toUpperCase();
        }
      }
    );

  /* UPLOAD GAMBAR */

  document
    .getElementById(
      "productImage"
    )
    .addEventListener(
      "change",
      (e) => {
        const file =
          e.target.files?.[0];

        if (!file) return;

        if (
          file.size >
          1500000
        ) {
          alert(
            "Ukuran gambar maksimal sekitar 1,5 MB."
          );

          return;
        }

        const reader =
          new FileReader();

        reader.onload =
          () => {
            document.getElementById(
              "productImageData"
            ).value =
              reader.result;

            document.getElementById(
              "imagePreview"
            ).innerHTML =
              `
                <img
                  src="${reader.result}"
                  alt=""
                >
              `;
          };

        reader.readAsDataURL(
          file
        );
      }
    );

  /* SIMPAN PRODUK */

  document
    .getElementById(
      "productForm"
    )
    .addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();

        const id =
          document.getElementById(
            "productId"
          ).value;

        const obj = {
          id:
            id ||
            uid("p"),

          name:
            document
              .getElementById(
                "productName"
              )
              .value.trim(),

          category:
            document
              .getElementById(
                "productCategory"
              )
              .value.trim(),

          volume:
            Number(
              document.getElementById(
                "productVolume"
              ).value
            ),

          stock:
            Number(
              document.getElementById(
                "productStock"
              ).value
            ),

          cost:
            Number(
              document.getElementById(
                "productCost"
              ).value
            ),

          price:
            Number(
              document.getElementById(
                "productPrice"
              ).value
            ),

          image:
            document.getElementById(
              "productImageData"
            ).value ||
            makePlaceholder(
              document.getElementById(
                "productName"
              ).value
            )
        };

        if (obj.price < obj.cost) {
          const accepted = await requestConfirmation({
            title: "Harga jual di bawah modal",
            message: `Harga jual ${rupiah(obj.price)} lebih rendah dari modal ${rupiah(obj.cost)}. Produk tetap disimpan?`,
            confirmLabel: "Tetap simpan"
          });
          if (!accepted) return;
        }

        if (!id) {
          const accepted = await requestConfirmation({
            title: "Tambahkan produk?",
            message: `Tambahkan "${obj.name}" dengan stok awal ${number(obj.stock)} unit, modal ${rupiah(obj.cost)}, dan harga jual ${rupiah(obj.price)}?`,
            confirmLabel: "Tambah produk"
          });
          if (!accepted) return;
        }

        if (id) {
          state.products =
            state.products.map(
              (p) =>
                p.id === id
                  ? obj
                  : p
            );
        } else {
          state.products.push(
            obj
          );
        }

        saveState();

        closeModal(
          "productModal"
        );

        renderAll();

        showToast(
          id
            ? "Produk diperbarui."
            : "Produk berhasil ditambahkan."
        );
      }
    );

  document.getElementById("openCapitalItemBtn").addEventListener("click", () => {
    openCapitalItemForm(selectedCapitalMonth);
  });

  ["capitalItemPrice", "capitalItemQty"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateCapitalItemPreview);
  });

  document.getElementById("capitalItemForm").addEventListener("submit", async (event) => {
    event.preventDefault();
    const month = document.getElementById("capitalItemMonth").value || selectedCapitalMonth;
    const itemName = document.getElementById("capitalItemName").value.trim();
    const unitPrice = Number(document.getElementById("capitalItemPrice").value || 0);
    const qty = Number(document.getElementById("capitalItemQty").value || 0);
    const amount = unitPrice * qty;

    if (!month || unitPrice <= 0 || qty <= 0 || !itemName) {
      showToast("Isi nama barang, harga, dan jumlah dengan benar.");
      return;
    }

    const accepted = await requestConfirmation({
      title: "Simpan modal item?",
      message: `Tambahkan ${itemName} untuk ${monthLabel(month)} dengan total ${rupiah(amount)}?`,
      confirmLabel: "Simpan modal"
    });
    if (!accepted) return;

    state.capitalEntries.push({
      id: uid("capital"),
      date: new Date(`${month}-01T12:00:00`).toISOString(),
      itemName,
      unitPrice,
      qty,
      amount
    });
    saveState();
    closeModal("capitalItemModal");
    renderAll();
    showToast("Modal item disimpan dan semua total diperbarui.");
  });

  /* TRANSAKSI */

  document
    .getElementById(
      "transactionProduct"
    )
    .addEventListener(
      "change",
      updateTransactionPreview
    );

  document
    .getElementById(
      "transactionQty"
    )
    .addEventListener(
      "input",
      updateTransactionPreview
    );

  ["saleDeliveryCost", "saleDiscount"].forEach((id) => {
    document.getElementById(id).addEventListener("input", updateTransactionPreview);
  });

  document.getElementById("salePaymentProof").addEventListener("change", (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 1500000) {
      alert("Ukuran bukti transfer maksimal sekitar 1,5 MB.");
      event.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      openTransactionForm.paymentProof = reader.result;
      openTransactionForm.paymentProofName = file.name;
    };
    reader.readAsDataURL(file);
  });

  document.getElementById("printReceiptBtn").addEventListener("click", () => window.print());
  document.getElementById("downloadInvoicePdfBtn").addEventListener("click", exportInvoicePdf);
  document.getElementById("downloadInvoiceWordBtn").addEventListener("click", exportInvoiceWord);

  document
    .getElementById(
      "transactionForm"
    )
    .addEventListener(
      "submit",
      async (e) => {
        e.preventDefault();

        const type =
          document.getElementById(
            "transactionType"
          ).value;

        const p =
          productById(
            document.getElementById(
              "transactionProduct"
            ).value
          );

        const qty =
          Number(
            document.getElementById(
              "transactionQty"
            ).value
          );

          const deliveryCost = Number(document.getElementById("saleDeliveryCost").value || 0);
          const discount = Number(document.getElementById("saleDiscount").value || 0);
          const grossRevenue = p ? qty * Number(p.price) : 0;

        if (
          !p ||
          qty <= 0
        ) {
          return;
        }

        if (
          type === "out" &&
          qty >
            Number(p.stock)
        ) {
          alert(
            `Stok ${p.name} tidak cukup. Stok tersedia: ${p.stock} unit.`
          );

          return;
        }

        if (type === "out" && discount > grossRevenue) {
          alert("Diskon tidak boleh melebihi total harga produk.");
          return;
        }

        const accepted = await requestConfirmation({
          title: type === "in" ? "Konfirmasi stok masuk" : "Konfirmasi penjualan",
          message: type === "in"
            ? `Tambahkan ${number(qty)} unit ${p.name}? Nilai modal ${rupiah(qty * Number(p.cost))}.`
            : `${number(qty)} unit ${p.name} untuk ${document.getElementById("saleCustomer").value.trim()}? Pendapatan bersih ${rupiah(grossRevenue - discount)}, biaya pengantaran ${rupiah(deliveryCost)}.`,
          confirmLabel: type === "in" ? "Tambah stok" : "Simpan penjualan"
        });
        if (!accepted) return;

        const tx = {
          id: uid("tx"),

          type,

          productId:
            p.id,

          qty,

          date:
            new Date(
              document.getElementById(
                "transactionDate"
              ).value
            ).toISOString(),

          note:
            document
              .getElementById(
                "transactionNote"
              )
              .value.trim(),

          unitCost:
            Number(p.cost),

          unitPrice:
            Number(p.price),

          customerName:
            type === "out" ? document.getElementById("saleCustomer").value.trim() : "",

          deliveryAddress:
            type === "out" ? document.getElementById("saleAddress").value.trim() : "",

          deliveryCost:
            type === "out" ? deliveryCost : 0,

          discount:
            type === "out" ? discount : 0,

          paymentProof:
            type === "out" ? openTransactionForm.paymentProof : "",

          paymentProofName:
            type === "out" ? openTransactionForm.paymentProofName : ""
        };

        if (
          type === "in"
        ) {
          p.stock =
            Number(p.stock) +
            qty;
        } else {
          p.stock =
            Number(p.stock) -
            qty;
        }

        state.transactions.push(
          tx
        );

        saveState();

        closeModal(
          "transactionModal"
        );

        renderAll();

        showToast(
          type === "in"
            ? "Stok masuk berhasil dicatat."
            : "Penjualan berhasil dicatat."
        );
      }
    );

  /* LAPORAN */

  document
    .getElementById(
      "applyReportBtn"
    )
    .addEventListener(
      "click",
      () => {
        reportRange.start =
          document.getElementById(
            "reportStart"
          ).value || null;

        reportRange.end =
          document.getElementById(
            "reportEnd"
          ).value || null;

        renderReports();

        showToast(
          "Periode laporan diterapkan."
        );
      }
    );

  /* SETTINGS */

  document
    .getElementById(
      "saveSettingsBtn"
    )
    .addEventListener(
      "click",
      () => {
        state.settings.brandName =
          document
            .getElementById(
              "settingBrandName"
            )
            .value.trim() ||
          "DrinkStock";

        state.settings.businessAddress = document.getElementById("settingBusinessAddress").value.trim();
        state.settings.businessPhone = document.getElementById("settingBusinessPhone").value.trim();
        state.settings.reportHeader = document.getElementById("settingReportHeader").value.trim();
        state.settings.reportFooter = document.getElementById("settingReportFooter").value.trim();

        state.settings.lowStockThreshold =
          Math.max(
            0,
            Number(
              document.getElementById(
                "settingLowStock"
              ).value || 0
            )
          );

        saveState();

        renderAll();

        showToast(
          "Pengaturan disimpan."
        );
      }
    );

  /* EXPORT */

  document
    .getElementById(
      "downloadReportPdfBtn"
    )
    .addEventListener(
      "click",
      exportReportPdf
    );

  document.getElementById("downloadReportWordBtn").addEventListener("click", exportReportWord);

  document
    .getElementById(
      "exportJsonBtn"
    )
    .addEventListener(
      "click",
      exportJson
    );

  /* IMPORT */

  document
    .getElementById(
      "importJsonInput"
    )
    .addEventListener(
      "change",
      importJson
    );

  /* RESET */

  document
    .getElementById(
      "resetDataBtn"
    )
    .addEventListener(
      "click",
      async () => {
        const accepted = await requestConfirmation({
          title: "Reset semua data?",
          message: "Semua produk, transaksi, dan pengaturan akan diganti dengan data contoh. Tindakan ini tidak dapat dibatalkan.",
          confirmLabel: "Reset data",
          danger: true
        });
        if (!accepted) return;

        state =
          seedData();

        saveState();

        renderAll();

        showToast(
          "Data dikembalikan ke contoh awal."
        );
      }
    );

  /* ESC */

  document.addEventListener(
    "keydown",
    (e) => {
      if (
        e.key === "Escape"
      ) {
        if (confirmationResolver) {
          resolveConfirmation(false);
          return;
        }
        document
          .querySelectorAll(
            ".modal-backdrop.open"
          )
          .forEach((m) => {
            if (m.id === "receiptModal") closeModal(m.id);
          });
      }
    }
  );
}

/* =========================
   EXPORT REPORT PDF
========================= */

function getReportTransactions() {
  return state.transactions.filter((tx) => {
    const date = new Date(tx.date);
    if (reportRange.start && date < new Date(`${reportRange.start}T00:00:00`)) return false;
    if (reportRange.end && date > new Date(`${reportRange.end}T23:59:59`)) return false;
    return true;
  });
}

function safeFilename(value) {
  return String(value || "usaha")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "usaha";
}

async function downloadWordDocument(title, lines, filename, orientation = "portrait") {
  const library = window.docx;
  if (!library?.Document || !library?.Packer || !library?.Paragraph) {
    showToast("Generator Word belum tersedia. Periksa koneksi internet lalu coba lagi.");
    return;
  }

  try {
    const children = [
      new library.Paragraph({ text: title, heading: library.HeadingLevel.TITLE }),
      ...lines.map((line) => {
        if (line?.heading) {
          return new library.Paragraph({ text: line.text, heading: line.heading });
        }
        return new library.Paragraph({ text: String(line ?? ""), spacing: { after: 100 } });
      })
    ];
    const document = new library.Document({
      sections: [{
        properties: {
          page: { size: { orientation } }
        },
        children
      }]
    });
    const blob = await library.Packer.toBlob(document);
    downloadBlob(blob, filename);
    showToast("Dokumen Word berhasil diunduh.");
  } catch (error) {
    console.error("Gagal membuat dokumen Word", error);
    showToast("Dokumen Word gagal dibuat.");
  }
}

function currentReceipt() {
  const tx = state.transactions.find((item) => item.id === currentReceiptId);
  const product = tx && productById(tx.productId);
  return tx && product ? { tx, product, metrics: transactionMetrics(tx) } : null;
}

function exportInvoicePdf() {
  const invoice = currentReceipt();
  if (!invoice) return;
  if (!window.jspdf?.jsPDF) {
    showToast("Generator PDF belum tersedia. Periksa koneksi internet lalu coba lagi.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const { tx, product, metrics } = invoice;
  const settings = state.settings;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 16;

  doc.setProperties({ title: `Invoice ${tx.id}`, author: settings.brandName || "DrinkStock" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(35, 75, 62);
  doc.text(settings.brandName || "DrinkStock", margin, 18);
  doc.setFontSize(12);
  doc.setTextColor(30, 40, 38);
  doc.text("INVOICE", pageWidth - margin, 18, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 88);
  const contact = [settings.businessAddress, settings.businessPhone].filter(Boolean).join(" | ");
  if (contact) doc.text(contact, margin, 24, { maxWidth: pageWidth - margin * 2 });
  if (settings.reportHeader) doc.text(settings.reportHeader, margin, contact ? 29 : 24);

  doc.autoTable({
    startY: contact || settings.reportHeader ? 35 : 29,
    body: [
      ["No. invoice", tx.id, "Tanggal", new Date(tx.date).toLocaleString("id-ID")],
      ["Pelanggan", tx.customerName || "Pelanggan umum", "Alamat", tx.deliveryAddress || "Ambil di tempat"]
    ],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 27 }, 1: { cellWidth: 58 }, 2: { fontStyle: "bold", cellWidth: 20 } },
    margin: { left: margin, right: margin }
  });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Produk", "Jumlah", "Harga / Unit", "Jumlah"]],
    body: [[product.name, number(tx.qty), rupiah(tx.unitPrice), rupiah(metrics.grossRevenue)]],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [35, 112, 69] },
    margin: { left: margin, right: margin }
  });

  const paymentRows = [
    ["Total produk", rupiah(metrics.grossRevenue)],
    ["Diskon", `- ${rupiah(metrics.discount)}`],
    ["Total dibayar", rupiah(metrics.revenue)],
    ["Pengeluaran pengantaran (operasional)", rupiah(metrics.deliveryCost)],
    ["Bukti transfer", tx.paymentProofName || "Tidak dilampirkan"]
  ];

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    body: paymentRows,
    theme: "plain",
    styles: { font: "helvetica", fontSize: 9, cellPadding: 2.5 },
    columnStyles: { 0: { cellWidth: 100, fontStyle: "bold" }, 1: { halign: "right" } },
    margin: { left: margin, right: margin },
    didDrawPage: () => {
      if (settings.reportFooter) {
        doc.setFontSize(8);
        doc.setTextColor(100, 100, 100);
        doc.text(settings.reportFooter, margin, doc.internal.pageSize.getHeight() - 12, { maxWidth: pageWidth - margin * 2 });
      }
    }
  });

  doc.save(`invoice-${safeFilename(tx.id)}.pdf`);
  showToast("Invoice PDF berhasil diunduh.");
}

function exportInvoiceWord() {
  const invoice = currentReceipt();
  if (!invoice) return;
  const { tx, product, metrics } = invoice;
  const settings = state.settings;
  const lines = [
    settings.reportHeader || "Invoice Penjualan",
    settings.businessAddress || "",
    settings.businessPhone || "",
    "",
    `Nomor invoice: ${tx.id}`,
    `Tanggal: ${new Date(tx.date).toLocaleString("id-ID")}`,
    `Nama pelanggan: ${tx.customerName || "Pelanggan umum"}`,
    `Alamat pengantaran: ${tx.deliveryAddress || "Ambil di tempat"}`,
    "",
    "RINCIAN PRODUK",
    `${product.name} | ${number(tx.qty)} unit x ${rupiah(tx.unitPrice)} = ${rupiah(metrics.grossRevenue)}`,
    "",
    `Total produk: ${rupiah(metrics.grossRevenue)}`,
    `Diskon: ${rupiah(metrics.discount)}`,
    `Total dibayar: ${rupiah(metrics.revenue)}`,
    `Pengeluaran pengantaran (operasional): ${rupiah(metrics.deliveryCost)}`,
    `Bukti transfer: ${tx.paymentProofName || "Tidak dilampirkan"}`,
    "",
    settings.reportFooter || ""
  ];
  downloadWordDocument("INVOICE", lines, `invoice-${safeFilename(tx.id)}.docx`);
}

async function exportReportWord() {
  const txs = getReportTransactions().sort((a, b) => new Date(a.date) - new Date(b.date));
  const outs = txs.filter(isActiveSale);
  const ins = txs.filter((tx) => tx.type === "in");
  const sumMetric = (items, key) => items.reduce((sum, tx) => sum + transactionMetrics(tx)[key], 0);
  const start = reportRange.start || "Awal data";
  const end = reportRange.end || "Hari ini";
  const settings = state.settings;
  const periodCapital = capitalDepositsInRange(reportRange.start, reportRange.end)
    .reduce((sum, entry) => sum + capitalEntryTotal(entry), 0);
  const capitalAtPeriodEnd = calculateCapitalSummary(reportRange.end?.slice(0, 7) || monthKey(new Date()));
  const lines = [
    settings.reportHeader || "Laporan Keuangan dan Persediaan",
    settings.businessAddress || "",
    settings.businessPhone || "",
    `Periode: ${start} s.d. ${end}`,
    "",
    { text: "Ringkasan Keuangan", heading: window.docx?.HeadingLevel?.HEADING_1 },
    `Pendapatan bersih: ${rupiah(sumMetric(outs, "revenue"))}`,
    `Laba bersih: ${rupiah(sumMetric(outs, "profit"))}`,
    `Modal barang terjual: ${rupiah(sumMetric(outs, "cost"))}`,
    `Biaya pengantaran: ${rupiah(sumMetric(outs, "deliveryCost"))}`,
    `Diskon: ${rupiah(sumMetric(outs, "discount"))}`,
    `Omzet kotor: ${rupiah(sumMetric(outs, "grossRevenue"))}`,
    `Unit terjual: ${number(outs.reduce((sum, tx) => sum + Number(tx.qty || 0), 0))}`,
    `Unit stok masuk: ${number(ins.reduce((sum, tx) => sum + Number(tx.qty || 0), 0))}`,
    `Modal item periode: ${rupiah(periodCapital)}`,
    `Total modal item hingga akhir periode: ${rupiah(capitalAtPeriodEnd.totalCapital)}`,
    `Akumulasi laba bersih sejak modal pertama: ${rupiah(capitalAtPeriodEnd.totalProfit)}`,
    `Status balik modal: ${!capitalAtPeriodEnd.hasCapital ? "Belum dicatat" : capitalAtPeriodEnd.recovered ? `Sudah balik modal, surplus ${rupiah(capitalAtPeriodEnd.surplus)}` : `Belum balik modal, sisa ${rupiah(capitalAtPeriodEnd.remaining)}`}`,
    "",
    { text: "Kontribusi Produk", heading: window.docx?.HeadingLevel?.HEADING_1 }
  ];

  const productTotals = new Map();
  outs.forEach((tx) => {
    const totals = productTotals.get(tx.productId) || { qty: 0, revenue: 0, profit: 0 };
    const metrics = transactionMetrics(tx);
    totals.qty += Number(tx.qty || 0);
    totals.revenue += metrics.revenue;
    totals.profit += metrics.profit;
    productTotals.set(tx.productId, totals);
  });
  productTotals.forEach((totals, id) => {
    lines.push(`${productById(id)?.name || "Produk dihapus"}: ${number(totals.qty)} unit | Pendapatan ${rupiah(totals.revenue)} | Laba ${rupiah(totals.profit)}`);
  });

  lines.push("", { text: "Rincian Transaksi", heading: window.docx?.HeadingLevel?.HEADING_1 });
  txs.forEach((tx) => {
    const product = productById(tx.productId);
    const metrics = transactionMetrics(tx);
    lines.push(
      `${new Date(tx.date).toLocaleString("id-ID")} | ${tx.type === "in" ? "Stok masuk" : "Penjualan"} | ${product?.name || "Produk dihapus"} x ${number(tx.qty)}`,
      `Modal ${rupiah(metrics.cost)} | Kotor ${rupiah(metrics.grossRevenue)} | Diskon ${rupiah(metrics.discount)} | Ongkir ${rupiah(metrics.deliveryCost)} | Bersih ${rupiah(metrics.revenue)} | Laba ${rupiah(metrics.profit)}`
    );
    if (tx.customerName) lines.push(`Pelanggan: ${tx.customerName}`);
    if (tx.deliveryAddress) lines.push(`Alamat: ${tx.deliveryAddress}`);
    if (tx.paymentProofName) lines.push(`Bukti transfer: ${tx.paymentProofName}`);
    if (tx.note) lines.push(`Catatan: ${tx.note}`);
    lines.push("");
  });
  lines.push(settings.reportFooter || "");

  await downloadWordDocument(
    "LAPORAN KEUANGAN",
    lines,
    `laporan-${safeFilename(settings.brandName)}-${Date.now()}.docx`,
    "landscape"
  );
}

function exportReportPdf() {
  if (!window.jspdf?.jsPDF) {
    showToast("Generator PDF belum tersedia. Periksa koneksi internet lalu coba lagi.");
    return;
  }

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  if (typeof doc.autoTable !== "function") {
    showToast("Komponen tabel PDF belum tersedia. Muat ulang halaman lalu coba lagi.");
    return;
  }

  const txs = getReportTransactions();

  const outs = txs.filter(isActiveSale);
  const ins = txs.filter((tx) => tx.type === "in");
  const sumMetric = (items, key) => items.reduce((sum, tx) => sum + transactionMetrics(tx)[key], 0);
  const soldUnits = outs.reduce((sum, tx) => sum + Number(tx.qty || 0), 0);
  const incomingUnits = ins.reduce((sum, tx) => sum + Number(tx.qty || 0), 0);
  const revenue = sumMetric(outs, "revenue");
  const cost = sumMetric(outs, "cost");
  const profit = sumMetric(outs, "profit");
  const delivery = sumMetric(outs, "deliveryCost");
  const discount = sumMetric(outs, "discount");
  const grossRevenue = sumMetric(outs, "grossRevenue");
  const periodStart = reportRange.start || "Awal data";
  const periodEnd = reportRange.end || "Hari ini";
  const settings = state.settings;
  const periodCapital = capitalDepositsInRange(reportRange.start, reportRange.end)
    .reduce((sum, entry) => sum + capitalEntryTotal(entry), 0);
  const capitalAtPeriodEnd = calculateCapitalSummary(reportRange.end?.slice(0, 7) || monthKey(new Date()));
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 13;

  doc.setProperties({
    title: `Laporan ${settings.brandName || "Usaha"}`,
    subject: `Laporan usaha ${periodStart} sampai ${periodEnd}`,
    author: settings.brandName || "DrinkStock"
  });

  doc.autoTable({
    startY: 31,
    head: [["Ringkasan", "Nilai", "Ringkasan", "Nilai"]],
    body: [
      ["Pendapatan bersih", rupiah(revenue), "Laba bersih", rupiah(profit)],
      ["Modal barang terjual", rupiah(cost), "Biaya pengantaran", rupiah(delivery)],
      ["Diskon", rupiah(discount), "Omzet kotor", rupiah(grossRevenue)],
      ["Unit terjual", number(soldUnits), "Unit stok masuk", number(incomingUnits)],
      ["Modal item periode", rupiah(periodCapital), "Total modal item", rupiah(capitalAtPeriodEnd.totalCapital)],
      ["Laba sejak modal pertama", rupiah(capitalAtPeriodEnd.totalProfit), "Sisa balik modal", capitalAtPeriodEnd.hasCapital ? capitalAtPeriodEnd.recovered ? `Surplus ${rupiah(capitalAtPeriodEnd.surplus)}` : rupiah(capitalAtPeriodEnd.remaining) : "Belum dicatat"]
    ],
    theme: "grid",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2.5 },
    headStyles: { fillColor: [35, 112, 69] },
    margin: { left: margin, right: margin }
  });

  const productTotals = new Map();
  outs.forEach((tx) => {
    const current = productTotals.get(tx.productId) || { qty: 0, revenue: 0, cost: 0, profit: 0 };
    const metrics = transactionMetrics(tx);
    current.qty += Number(tx.qty || 0);
    current.revenue += metrics.revenue;
    current.cost += metrics.cost;
    current.profit += metrics.profit;
    productTotals.set(tx.productId, current);
  });

  const productRows = [...productTotals.entries()]
    .map(([productId, totals]) => [
      productById(productId)?.name || "Produk dihapus",
      number(totals.qty),
      rupiah(totals.cost),
      rupiah(totals.revenue),
      rupiah(totals.profit)
    ]);

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 6,
    head: [["Kontribusi Produk", "Unit Terjual", "Modal", "Pendapatan Bersih", "Laba Bersih"]],
    body: productRows.length ? productRows : [["Belum ada penjualan", "-", "-", "-", "-"]],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [57, 115, 83] },
    margin: { left: margin, right: margin }
  });

  const detailRows = txs
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .map((tx) => {
      const product = productById(tx.productId);
      const metrics = transactionMetrics(tx);
      const details = [
        product?.name || "Produk dihapus",
        tx.customerName ? `Pelanggan: ${tx.customerName}` : "",
        tx.deliveryAddress ? `Alamat: ${tx.deliveryAddress}` : "",
        tx.note || "",
        tx.paymentProofName ? `Bukti transfer: ${tx.paymentProofName}` : ""
      ].filter(Boolean).join("\n");

      return [
        new Date(tx.date).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }),
        tx.type === "in" ? "Stok masuk" : "Penjualan",
        details,
        number(tx.qty),
        [
          `Modal: ${rupiah(metrics.cost)}`,
          `Kotor: ${rupiah(metrics.grossRevenue)}`,
          `Diskon: ${rupiah(metrics.discount)}`,
          `Ongkir: ${rupiah(metrics.deliveryCost)}`,
          `Bersih: ${rupiah(metrics.revenue)}`,
          `Laba: ${rupiah(metrics.profit)}`
        ].join("\n")
      ];
    });

  doc.autoTable({
    startY: doc.lastAutoTable.finalY + 7,
    head: [["Tanggal", "Tipe", "Produk / Detail", "Qty", "Rincian Keuangan"]],
    body: detailRows.length ? detailRows : [["-", "-", "Belum ada transaksi", "-", "-"]],
    theme: "striped",
    styles: { font: "helvetica", fontSize: 7, cellPadding: 1.8, overflow: "linebreak", valign: "top" },
    headStyles: { fillColor: [39, 76, 87] },
    columnStyles: {
      0: { cellWidth: 26 },
      1: { cellWidth: 20 },
      2: { cellWidth: 78 },
      3: { cellWidth: 13 },
      4: { cellWidth: 134 }
    },
    margin: { left: margin, right: margin, top: 30, bottom: 18 },
    didDrawPage: () => {
      const pageNumber = doc.internal.getNumberOfPages();
      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(35, 75, 62);
      doc.text(settings.brandName || "Laporan Usaha", margin, 12);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(80, 90, 88);
      const contact = [settings.businessAddress, settings.businessPhone].filter(Boolean).join(" | ");
      if (contact) doc.text(contact, margin, 17);
      const header = settings.reportHeader || "Laporan Penjualan dan Persediaan";
      doc.text(header, margin, contact ? 22 : 19);
      doc.text(`Periode: ${periodStart} s.d. ${periodEnd}`, pageWidth - margin, contact ? 22 : 19, { align: "right" });
      doc.setDrawColor(215, 224, 218);
      doc.line(margin, 25, pageWidth - margin, 25);
      doc.line(margin, 197, pageWidth - margin, 197);
      if (settings.reportFooter) doc.text(settings.reportFooter, margin, 202, { maxWidth: pageWidth - margin * 2 - 35 });
      doc.text(`Halaman ${pageNumber}`, pageWidth - margin, 202, { align: "right" });
    }
  });

  const filename = `laporan-${(settings.brandName || "usaha").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${Date.now()}.pdf`;
  doc.save(filename);
  showToast("Laporan PDF berhasil diunduh.");
}

/* =========================
   EXPORT JSON
========================= */

function exportJson() {
  downloadBlob(
    new Blob(
      [
        JSON.stringify(
          state,
          null,
          2
        )
      ],
      {
        type:
          "application/json"
      }
    ),

    `drinkstock-backup-${Date.now()}.json`
  );
}

/* =========================
   IMPORT JSON
========================= */

function importJson(e) {
  const file =
    e.target.files?.[0];

  if (!file) return;

  const reader =
    new FileReader();

  reader.onload =
    () => {
      try {
        const data =
          JSON.parse(
            reader.result
          );

        if (
          !data.products ||
          !data.transactions ||
          !data.settings
        ) {
          throw new Error(
            "Format tidak valid"
          );
        }

        data.orders ||= [];
        data.cart ||= [];
        data.capitalEntries = normalizeCapitalEntries(data.capitalEntries || []);
        state = data;

        saveState();

        renderAll();

        showToast(
          "Data berhasil diimpor."
        );
      } catch {
        alert(
          "File backup tidak valid."
        );
      }

      e.target.value =
        "";
    };

  reader.readAsText(
    file
  );
}

/* =========================
   DOWNLOAD FILE
========================= */

function downloadBlob(
  blob,
  filename
) {
  const url =
    URL.createObjectURL(
      blob
    );

  const a =
    document.createElement(
      "a"
    );

  a.href = url;
  a.download =
    filename;

  document.body.appendChild(
    a
  );

  a.click();

  a.remove();

  URL.revokeObjectURL(
    url
  );
}

/* =========================
   START APP
========================= */

document.addEventListener(
  "DOMContentLoaded",
  () => {
    setupEvents();
    renderAll();
  }
);
