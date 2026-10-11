(() => {
const STORAGE_KEY = "freelance_manager_v1";
const SUPABASE_URL = "https://yjwekgwlrghsxjidzimz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_UA-Hd1rmm9AkXPrE9lCCeA_VN3dy7d5";
const SUPABASE_TABLE = "app_state";
const SUPABASE_ROW_ID = "freelance_main";
const rupiah = (value) => new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(Number(value) || 0);
const esc = (value = "") => String(value).replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#039;");
const uid = (prefix) => `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
const localDateKey = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const today = () => localDateKey(new Date());
const monthStart = () => `${today().slice(0, 7)}-01`;
const mondayStart = () => {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - ((date.getDay() + 6) % 7));
  return localDateKey(date);
};
const defaultSettings = () => ({ projectCategories: ["Desain", "Website", "UI/UX", "Prototype", "Joki tugas"], categories: ["Desain", "Website", "UI/UX", "Prototype", "Joki tugas"], methods: ["Transfer bank (TF)", "QRIS", "Tunai (Cash)", "E-Wallet"], statuses: ["Berjalan", "Menunggu", "Selesai", "Dibatalkan"] });
const freshState = () => ({ clients: [], payments: [], teamPayments: [], todos: [], invoices: [], settings: defaultSettings() });
function normalizeState(raw = {}) {
  const result = { ...freshState(), ...raw, settings: { ...defaultSettings(), ...raw.settings } };
  result.clients = result.clients.map((client) => ({ ...client, category: client.category || client.works?.[0]?.category || "Lainnya", works: [...(client.works || [])] }));
  for (const project of raw.projects || []) {
    let client = result.clients.find((item) => item.id === project.clientId);
    if (!client) { client = { id: project.clientId || `legacy_${project.id}`, name: "Projek lama", category: project.category || "Lainnya", works: [] }; result.clients.push(client); }
    if (!client.works.some((work) => work.id === project.id)) client.works.push({ ...project });
  }
  const owner = (projectId) => result.clients.find((client) => client.works.some((work) => work.id === projectId))?.id || "";
  for (const key of ["payments", "teamPayments", "todos"]) result[key] = result[key].map((item) => ({ ...item, clientId: item.clientId || owner(item.projectId) }));
  delete result.projects;
  return result;
}
const allWorks = () => state.clients.flatMap((client) => client.works.map((work) => ({ ...work, clientId: client.id })));
const clientPaid = (id) => state.payments.filter((payment) => payment.clientId === id).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
const clientValue = (client) => client.works.reduce((sum, work) => sum + Number(work.price || 0), 0);
let state = loadState();
let supabaseClient = null;
let syncReady = false;
let saveTimer = null;
let activePage = "overview";
let activeIncomePeriod = "week";
const expandedProjects = new Set();

function loadState() {
  try {
    return normalizeState(JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}"));
  } catch {
    return freshState();
  }
}

function saveState() {
  state._savedAt = new Date().toISOString();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  if (!syncReady || !supabaseClient) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveRemote, 650);
}

function setConnection(connected, message) {
  document.getElementById("connectionState").textContent = message;
  document.getElementById("connectionState").classList.toggle("offline", !connected);
}

async function saveRemote() {
  if (!supabaseClient) return;
  const { error } = await supabaseClient.from(SUPABASE_TABLE).upsert({
    id: SUPABASE_ROW_ID,
    data: state,
    updated_at: new Date().toISOString()
  });
  if (error) {
    syncReady = false;
    setConnection(false, "Cadangan lokal aktif");
    console.error("Freelance Supabase save error:", error);
    return;
  }
  syncReady = true;
  setConnection(true, "Tersinkron ke Supabase");
}

async function initSync() {
  if (!window.supabase?.createClient) {
    setConnection(false, "Cadangan lokal aktif");
    return;
  }
  supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
  setConnection(true, "Menghubungkan database...");
  try {
    const { data, error } = await supabaseClient.from(SUPABASE_TABLE).select("data").eq("id", SUPABASE_ROW_ID).maybeSingle();
    if (error) throw error;
    const remote = data?.data;
    const hasLocalRecords = state.clients.length || state.payments.length || state.teamPayments.length || state.todos.length || state.invoices.length;
    
    const localTime = Date.parse(state._savedAt || "") || 0;
    const remoteTime = Date.parse(remote?._savedAt || "") || 0;
    syncReady = true;
    if (remote && (!hasLocalRecords || remoteTime >= localTime)) {
      state = normalizeState(remote);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      renderAll();
      setConnection(true, "Tersinkron ke Supabase");
    } else {
      await saveRemote();
    }
  } catch (error) {
    syncReady = false;
    setConnection(false, "Cadangan lokal aktif");
    console.error("Freelance Supabase sync error:", error);
  }
}

function getClient(id) {
  return state.clients.find((client) => client.id === id);
}

function getProject(id) {
  return allWorks().find((project) => project.id === id);
}

function workBalances(parentId) {
  const project = getClient(parentId);
  if (!project) return new Map();
  const active = project.works.filter((work) => work.status !== "Dibatalkan");
  let general = state.payments.filter((payment) => payment.clientId === parentId && (!payment.projectId || !project.works.some((work) => work.id === payment.projectId))).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const balances = new Map();
  for (const work of active) {
    const paid = state.payments.filter((payment) => payment.clientId === parentId && payment.projectId === work.id).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
    const remaining = Math.max(0, Number(work.price || 0) - paid);
    const applied = Math.min(remaining, general);
    balances.set(work.id, remaining - applied);
    general -= applied;
  }
  return balances;
}

function workBalance(parentId, workId) { return workBalances(parentId).get(workId) || 0; }
function projectBalance(parentId) { return [...workBalances(parentId).values()].reduce((sum, amount) => sum + amount, 0); }
function predictedIncome() { return state.clients.reduce((sum, project) => sum + projectBalance(project.id), 0); }
function invoicePaid(invoice) { return state.payments.filter((payment) => payment.invoiceId === invoice.id).reduce((sum, payment) => sum + Number(payment.amount || 0), 0); }
function invoiceBalance(invoice) { return Math.max(0, Number(invoice.amount || 0) - invoicePaid(invoice)); }
function invoiceStatus(invoice) { return invoice.cancelled ? "Dibatalkan" : invoiceBalance(invoice) === 0 ? "Lunas" : invoicePaid(invoice) > 0 ? "Sebagian dibayar" : "Belum lunas"; }

function invoiceAvailable(parentId, workId = "") {
  const balance = workId ? workBalance(parentId, workId) : projectBalance(parentId);
  const reserved = state.invoices.filter((invoice) => !invoice.cancelled && invoice.clientId === parentId && (!workId || !invoice.projectId || invoice.projectId === workId)).reduce((sum, invoice) => sum + invoiceBalance(invoice), 0);
  return Math.max(0, balance - reserved);
}

function renderInvoiceWorks(selected = "") {
  const project = getClient(document.getElementById("invoiceProject").value);
  document.getElementById("invoiceWork").innerHTML = '<option value="">Seluruh projek</option>' + (project?.works || []).filter((work) => work.status !== "Dibatalkan").map((work) => `<option value="${esc(work.id)}">${esc(work.title)}</option>`).join("");
  document.getElementById("invoiceWork").value = selected;
}

function updateInvoiceAmount() {
  const available = invoiceAvailable(document.getElementById("invoiceProject").value, document.getElementById("invoiceWork").value);
  document.getElementById("invoiceAmount").value = available || "";
  document.getElementById("invoiceAmount").max = available;
  document.getElementById("invoiceAvailable").textContent = `Sisa tagihan yang belum dibuatkan invoice: ${rupiah(available)}`;
}

function editInvoice(parentId = "", workId = "") {
  document.getElementById("invoiceForm").reset();
  document.getElementById("invoiceProject").innerHTML = '<option value="">Pilih projek</option>' + state.clients.map((project) => `<option value="${esc(project.id)}">${esc(project.name)}</option>`).join("");
  document.getElementById("invoiceProject").value = parentId;
  renderInvoiceWorks(workId);
  const project = getClient(parentId);
  document.getElementById("invoiceDate").value = today();
  const due = project?.works.find((work) => work.id === workId)?.dueDate || project?.dueDate;
  document.getElementById("invoiceDue").value = due && due >= today() ? due : today();
  document.getElementById("invoiceMessage").textContent = "";
  updateInvoiceAmount();
  showDialog("invoiceDialog");
}

function renderInvoices() {
  const invoices = [...state.invoices].sort((a, b) => Number(a.cancelled || invoiceBalance(a) === 0) - Number(b.cancelled || invoiceBalance(b) === 0) || a.dueDate.localeCompare(b.dueDate));
  document.getElementById("invoiceRows").innerHTML = invoices.length ? invoices.map((invoice) => `<tr><td><strong>${esc(invoice.number)}</strong><small>${formatDate(invoice.date)}</small></td><td>${esc(invoice.projectName)}<small>${esc(invoice.workName || "Seluruh projek")}</small></td><td>${formatDate(invoice.dueDate)}</td><td>${rupiah(invoice.amount)}</td><td>${rupiah(invoiceBalance(invoice))}</td><td><span class="status-label">${esc(invoiceStatus(invoice))}</span></td><td>${!invoice.cancelled && invoiceBalance(invoice) > 0 ? `<button class="row-action" data-pay-invoice="${esc(invoice.id)}">Catat pelunasan</button>` : ""}<button class="row-action" data-print-invoice="${esc(invoice.id)}">Cetak</button>${!invoice.cancelled && invoiceBalance(invoice) > 0 ? `<button class="row-action danger-text" data-cancel-invoice="${esc(invoice.id)}">Batalkan</button>` : ""}</td></tr>`).join("") : '<tr><td colspan="7" class="empty-state">Belum ada invoice. Buat tagihan untuk client atau seluruh projek.</td></tr>';
}

function printInvoice(id) {
  const invoice = state.invoices.find((item) => item.id === id);
  if (!invoice) return;
  document.getElementById("invoicePrint").innerHTML = `<h1>INVOICE</h1><p>${esc(invoice.number)}</p><p>Projek: ${esc(invoice.projectName)}<br>Client: ${esc(invoice.workName || "Seluruh projek")}<br>Tanggal: ${formatDate(invoice.date)}<br>Jatuh tempo: ${formatDate(invoice.dueDate)}<br>Status: ${esc(invoiceStatus(invoice))}</p><table><thead><tr><th>Keterangan</th><th>Nilai</th></tr></thead><tbody><tr><td>${esc(invoice.notes || invoice.workName || invoice.projectName)}</td><td>${rupiah(invoice.amount)}</td></tr></tbody></table><p>Sudah dibayar: ${rupiah(invoicePaid(invoice))}</p><p class="invoice-print-total">Sisa tagihan: ${rupiah(invoiceBalance(invoice))}</p>`;
  window.print();
}

function collectedBetween(start, end = "9999-12-31") {
  return state.payments.filter((payment) => payment.date >= start && payment.date <= end).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function teamPaidBetween(start, end = "9999-12-31") {
  return state.teamPayments.filter((payment) => payment.date >= start && payment.date <= end).reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
}

function pageTitle() {
  const titles = { todos: "To-do & deadline", overview: "Ringkasan", settings: "Pengaturan", clients: "Projek", income: "Pemasukan", payments: "Pembayaran" };
  document.getElementById("pageTitle").textContent = titles[activePage];
  document.querySelectorAll("[data-page]").forEach((button) => button.classList.toggle("active", button.dataset.page === activePage));
  document.querySelectorAll("[data-view]").forEach((section) => section.hidden = section.dataset.view !== activePage);
}

function renderOverview() {
  const weekIn = collectedBetween(mondayStart());
  const monthIn = collectedBetween(monthStart());
  const monthTeam = teamPaidBetween(monthStart());
  const netMonth = monthIn - monthTeam;
  const openBalance = predictedIncome();
  document.getElementById("metricWeek").textContent = rupiah(weekIn);
  document.getElementById("metricMonth").textContent = rupiah(monthIn);
  document.getElementById("metricNet").textContent = rupiah(netMonth);
  document.getElementById("metricOutstanding").textContent = rupiah(openBalance);
  document.getElementById("monthCaption").textContent = `Bersih bulan ini · pembayaran tim ${rupiah(monthTeam)}`;
  document.getElementById("clientCount").textContent = state.clients.length;
  const recent = [...state.payments].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  document.getElementById("recentPayments").innerHTML = recent.length ? recent.map((payment) => {
    const project = getProject(payment.projectId);
    const client = getClient(payment.clientId);
    return `<div class="activity-row"><span class="activity-mark">↓</span><span class="activity-copy"><strong>${esc(client?.name || "Projek dihapus")}</strong><small>${esc(project?.title || "Pembayaran projek")}, ${formatDate(payment.date)}</small></span><b>${rupiah(payment.amount)}</b></div>`;
  }).join("") : '<p class="empty-state">Pembayaran yang dicatat akan muncul di sini.</p>';
  const deadlines = deadlineItems().filter((item) => !item.done).slice(0, 5);
  document.getElementById("deadlinePreview").innerHTML = deadlines.length ? deadlines.map((item) => `<div class="activity-row"><span class="activity-mark project-mark">↗</span><span class="activity-copy"><strong>${esc(item.title)}</strong><small>${esc(getClient(item.clientId)?.name || item.kind)} · ${formatDate(item.date)}</small></span><span class="status-label">${esc(item.kind)}</span></div>`).join("") : '<p class="empty-state">Belum ada deadline aktif.</p>';
}

function deadlineItems() {
  return [
    ...state.todos.map((item) => ({ ...item, date: item.dueDate, kind: "To-do", done: item.status === "done", action: "todo" })),
    ...allWorks().filter((item) => item.dueDate).map((item) => ({ ...item, date: item.dueDate, kind: "Client", done: ["Selesai", "Dibatalkan"].includes(item.status), action: "work" })),
    ...state.clients.filter((item) => item.dueDate).map((item) => ({ ...item, title: item.name, clientId: item.id, date: item.dueDate, kind: "Projek", done: item.works.length > 0 && item.works.every((work) => ["Selesai", "Dibatalkan"].includes(work.status)), action: "client" }))
  ].sort((a, b) => a.date.localeCompare(b.date) || a.title.localeCompare(b.title));
}

function renderTodos() {
  const filter = document.getElementById("todoStatusFilter").value;
  let items = deadlineItems().filter((item) => filter === "all" || item.done === (filter === "done"));
  if (document.getElementById("deadlineSort").value === "furthest") items = items.reverse();
  document.getElementById("todoRows").innerHTML = items.length ? items.map((item) => `<tr><td>${formatDate(item.date)}</td><td><strong>${esc(item.title)}</strong><small>${esc(item.note || "")}</small></td><td>${esc(item.kind)}${item.priority === "high" ? " · Tinggi" : ""}</td><td>${esc(getClient(item.clientId)?.name || "-")}</td><td>${item.done ? "Selesai" : "Belum selesai"}</td><td><button class="row-action" data-edit-${item.action}="${esc(item.id)}" data-parent-id="${esc(item.clientId || "")}">Edit</button>${item.action === "todo" ? `<button class="row-action" data-toggle-todo="${esc(item.id)}">${item.done ? "Buka lagi" : "Selesaikan"}</button><button class="row-action danger-text" data-delete-todo="${esc(item.id)}">Hapus</button>` : ""}</td></tr>`).join("") : '<tr><td colspan="6" class="empty-state">Belum ada deadline pada filter ini.</td></tr>';
}

function editTodo(id = "") {
  const item = state.todos.find((todo) => todo.id === id);
  document.getElementById("todoForm").reset();
  document.getElementById("todoDialogTitle").textContent = item ? "Edit To-do" : "To-do baru";
  for (const [field, value] of Object.entries({Id: item?.id || "", Title: item?.title || "", DueDate: item?.dueDate || today(), Priority: item?.priority || "normal", Status: item?.status || "open", Note: item?.note || ""})) document.getElementById(`todo${field}`).value = value;
  document.getElementById("todoClient").innerHTML = '<option value="">Tanpa projek</option>' + state.clients.map((client) => `<option value="${esc(client.id)}">${esc(client.name)}</option>`).join("");
  document.getElementById("todoClient").value = item?.clientId || "";
  showDialog("todoDialog");
}

function setChoice(selectId, otherId, value) {
  const select = document.getElementById(selectId);
  const known = [...select.options].some((option) => option.value === value);
  select.value = known ? value : "Lainnya";
  document.getElementById(otherId).value = known ? "" : value;
  updateOther(selectId, otherId);
}

function updateOther(selectId, otherId) {
  const input = document.getElementById(otherId);
  const other = document.getElementById(selectId).value === "Lainnya";
  input.parentElement.hidden = !other;
  input.required = other;
}

function choiceValue(selectId, otherId) {
  return document.getElementById(selectId).value === "Lainnya" ? document.getElementById(otherId).value.trim() : document.getElementById(selectId).value;
}

function renderIncome() {
  const start = activeIncomePeriod === "week" ? mondayStart() : monthStart();
  const end = today();
  const payments = state.payments
    .filter((payment) => payment.date >= start && payment.date <= end)
    .sort((a, b) => b.date.localeCompare(a.date));
  const total = payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  const range = `${formatDate(start)} – ${formatDate(end)}`;
  document.getElementById("incomePrediction").textContent = rupiah(predictedIncome());
  const unpaid = allWorks().filter((work) => workBalance(work.clientId, work.id) > 0).length;
  document.getElementById("incomePredictionCaption").textContent = `${unpaid} client belum lunas · seluruh periode`;
  renderInvoices();
  const team = state.teamPayments.filter((payment) => payment.date >= start && payment.date <= end).sort((a, b) => b.date.localeCompare(a.date));
  document.getElementById("teamIncomeRows").innerHTML = team.length ? team.map((payment) => `<tr><td>${formatDate(payment.date)}</td><td>${esc(getClient(payment.clientId)?.name || "Projek dihapus")}<small>${esc(getProject(payment.projectId)?.title || "Seluruh projek")}</small></td><td>${esc(payment.member)}</td><td>${esc(payment.method)}</td><td>${rupiah(payment.amount)}</td><td><button class="row-action danger-text" data-delete-team-payment="${esc(payment.id)}">Hapus</button></td></tr>`).join("") : '<tr><td colspan="6" class="empty-state">Belum ada pengeluaran tim pada periode ini.</td></tr>';

  document.getElementById("incomeTotal").textContent = rupiah(total);
  document.getElementById("incomeCaption").textContent = `${payments.length} transfer projek diterima pada periode ini.`;
  document.getElementById("incomeRange").textContent = range;
  document.getElementById("incomeLedgerRange").textContent = range;
  document.getElementById("incomePaymentCount").textContent = payments.length;
  document.querySelectorAll("[data-income-period]").forEach((button) => {
    const selected = button.dataset.incomePeriod === activeIncomePeriod;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  document.getElementById("incomeRows").innerHTML = payments.length ? payments.map((payment) => {
    const project = getProject(payment.projectId);
    return `<tr><td>${formatDate(payment.date)}</td><td>${esc(getClient(payment.clientId)?.name || "Projek dihapus")}</td><td>${esc(project?.title || "Seluruh projek")}<small>${esc(payment.invoiceNumber || "")}</small></td><td>${esc(payment.method || "Transfer")}</td><td><strong>${rupiah(payment.amount)}</strong></td><td><button class="row-action danger-text" data-delete-payment="${esc(payment.id)}">Hapus</button></td></tr>`;
  }).join("") : '<tr><td colspan="6" class="empty-state">Belum ada transfer projek pada periode ini.</td></tr>';
}

function projectDeadlineInfo(project) {
  const active = project.works.filter((work) => !["Selesai", "Dibatalkan"].includes(work.status));
  const dates = [...active.filter((work) => work.dueDate).map((work) => work.dueDate), ...(project.dueDate && (!project.works.length || active.length) ? [project.dueDate] : [])].sort();
  if (!dates.length) return { text: "Tidak ada deadline aktif", tone: "quiet", count: 0 };
  const date = dates[0];
  const days = Math.round((new Date(`${date}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000);
  return { date, count: dates.length, tone: days < 0 ? "overdue" : days <= 3 ? "soon" : "scheduled", text: `${days < 0 ? "Lewat deadline" : days === 0 ? "Deadline hari ini" : days <= 3 ? "Deadline segera" : "Ada deadline"} · ${formatDate(date)}` };
}

function renderClients() {
  const filter = document.getElementById("projectCategoryFilter");
  const selected = filter.value;
  filter.innerHTML = '<option value="">Semua kategori</option>' + options([...state.settings.projectCategories, ...state.clients.map((project) => project.category)]);
  filter.value = selected;
  const search = document.getElementById("projectSearch").value.trim().toLocaleLowerCase("id");
  const projects = state.clients.filter((project) => (!selected || project.category === selected) && `${project.name} ${project.works.map((work) => work.title).join(" ")}`.toLocaleLowerCase("id").includes(search));
  document.getElementById("projectCards").innerHTML = projects.length ? projects.map((project) => {
    const deadline = projectDeadlineInfo(project);
    const value = clientValue(project);
    return `<article class="project-card"><div class="project-card-heading"><div><span class="project-category">${esc(project.category)}</span><h3>${esc(project.name)}</h3></div><span class="project-client-count">${project.works.length} client</span></div><div class="deadline-badge ${deadline.tone}" role="status"><span aria-hidden="true">◷</span> ${esc(deadline.text)}${deadline.count > 1 ? `<small>${deadline.count} deadline aktif</small>` : ""}</div><div class="project-money"><span>Kesepakatan<strong>${rupiah(value)}</strong></span><span>Sisa tagihan<strong>${rupiah(projectBalance(project.id))}</strong></span></div><div class="project-card-actions"><button class="accent-button" data-add-work="${esc(project.id)}">+ Client</button><button class="row-action" data-client-payment="${esc(project.id)}">Invoice projek</button><button class="row-action" data-edit-client="${esc(project.id)}">Edit projek</button><button class="row-action danger-text" data-delete-client="${esc(project.id)}">Hapus</button></div><details class="project-client-details" data-project-details="${esc(project.id)}"${expandedProjects.has(project.id) ? " open" : ""}><summary>Lihat client <span>${project.works.length}</span></summary><div class="project-client-list">${project.works.length ? project.works.map((work) => `<div class="project-client-item"><div class="client-item-heading"><strong>${esc(work.title)}</strong><span class="status-label">${esc(work.status)}</span></div><span class="client-item-category">${esc(work.category)}</span><div class="client-item-meta"><span>${rupiah(work.price)}</span><span>${work.dueDate ? `Deadline ${formatDate(work.dueDate)}` : "Tanpa deadline"}</span></div>${work.team?.length ? `<p class="client-item-note">Tim: ${esc(work.team.join(", "))}</p>` : ""}${work.notes || work.note ? `<p class="client-item-note">${esc(work.notes || work.note)}</p>` : ""}<div class="client-item-actions"><button class="row-action" data-edit-work="${esc(work.id)}" data-parent-id="${esc(project.id)}">Edit client</button><button class="row-action" data-client-payment="${esc(project.id)}" data-payment-work="${esc(work.id)}">Invoice</button><button class="row-action danger-text" data-delete-work="${esc(work.id)}" data-parent-id="${esc(project.id)}">Hapus client</button></div></div>`).join("") : '<p class="empty-state">Belum ada client. Tambahkan client pertama ke projek ini.</p>'}</div></details></article>`;
  }).join("") : '<p class="empty-state">Belum ada projek yang cocok. Buat projek baru untuk mulai mengelompokkan client.</p>';
  document.querySelectorAll("[data-project-details]").forEach((details) => details.addEventListener("toggle", () => {
    if (!details.isConnected) return;
    if (details.open) expandedProjects.add(details.dataset.projectDetails);
    else expandedProjects.delete(details.dataset.projectDetails);
  }));
}

function formatDate(date) {
  if (!date) return "Tanpa tanggal";
  return new Date(`${date}T12:00:00`).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

function renderPaymentClients(selected = "") {
  const select = document.getElementById("paymentClient");
  select.innerHTML = '<option value="">Pilih projek</option>' + state.clients.map((client) => `<option value="${esc(client.id)}">${esc(client.name)}</option>`).join("");
  select.value = selected;
}

function options(values, selected = "") {
  return [...new Set([...values, ...(selected ? [selected] : [])])].map((value) => `<option value="${esc(value)}"${value === selected ? " selected" : ""}>${esc(value)}</option>`).join("");
}

function renderSettings() {
  for (const [key, id] of [["projectCategories", "settingsProjectCategories"], ["categories", "settingsCategories"], ["methods", "settingsMethods"], ["statuses", "settingsStatuses"]]) document.getElementById(id).value = state.settings[key].join("\n");
}

function editWork(parentId, workId = "") {
  const project = getClient(parentId);
  if (!project) return;
  const work = project.works.find((item) => item.id === workId);
  document.getElementById("workForm").reset();
  document.getElementById("workParentId").value = parentId;
  document.getElementById("workId").value = work?.id || "";
  document.getElementById("workDialogTitle").textContent = work ? "Edit client" : "Client baru";
  document.getElementById("workProjectCaption").textContent = project.name;
  document.getElementById("workName").value = work?.title || "";
  document.getElementById("workCategory").innerHTML = options(state.settings.categories, work?.category || project.category);
  document.getElementById("workPrice").value = work?.price ?? "";
  document.getElementById("workDeadline").value = work?.dueDate || "";
  document.getElementById("workStatus").innerHTML = options(state.settings.statuses, work?.status || "Berjalan");
  document.getElementById("workTeam").value = (work?.team || []).join(", ");
  document.getElementById("workNotes").value = work?.notes || work?.note || "";
  showDialog("workDialog");
}

function renderPaymentWorks(parentId, selected = "") {
  document.getElementById("paymentWork").innerHTML = '<option value="">Pembayaran umum projek</option>' + (getClient(parentId)?.works || []).map((work) => `<option value="${esc(work.id)}">${esc(work.title)}</option>`).join("");
  document.getElementById("paymentWork").value = selected;
}

function renderAll() {
  pageTitle();
  renderOverview();
  renderTodos();
  renderClients();
  renderIncome();
  renderPaymentClients();
  renderPaymentWorks("");
  renderSettings();
}

function showDialog(id) {
  document.getElementById(id).showModal();
}

function editClient(id = "") {
  const project = getClient(id);
  document.getElementById("clientForm").reset();
  document.getElementById("clientId").value = project?.id || "";
  document.getElementById("clientDialogTitle").textContent = project ? "Edit projek" : "Projek baru";
  document.getElementById("clientName").value = project?.name || "";
  document.getElementById("clientCategory").innerHTML = options(state.settings.projectCategories, project?.category);
  document.getElementById("clientDeadline").value = project?.dueDate || "";
  showDialog("clientDialog");
}

function editPayment(type = "team", clientId = "", workId = "", invoiceId = "") {
  document.getElementById("paymentForm").reset();
  renderPaymentClients(clientId);
  renderPaymentWorks(clientId, workId);
  document.getElementById("paymentMethod").innerHTML = options([...state.settings.methods, "Lainnya"]);
  setChoice("paymentMethod", "paymentMethodOther", getClient(clientId)?.paymentPreference || "Transfer bank (TF)");
  document.getElementById("paymentType").value = type;
  const invoice = state.invoices.find((item) => item.id === invoiceId);
  document.getElementById("paymentInvoiceId").value = invoiceId;
  document.getElementById("paymentScopeFields").hidden = !!invoice;
  document.getElementById("paymentClient").required = !invoice;
  document.getElementById("paymentInvoiceCaption").hidden = !invoice;
  document.getElementById("paymentInvoiceCaption").textContent = invoice ? `${invoice.number} · ${invoice.projectName} · ${invoice.workName || "Seluruh projek"} · Sisa ${rupiah(invoiceBalance(invoice))}` : "";
  document.getElementById("paymentAmount").max = invoice ? invoiceBalance(invoice) : "";
  document.getElementById("paymentDate").value = today();
  document.getElementById("paymentAmount").value = invoice ? invoiceBalance(invoice) : "";
  document.getElementById("paymentMemberWrap").hidden = type !== "team";
  document.getElementById("paymentMember").required = type === "team";
  document.getElementById("paymentDialogTitle").textContent = type === "team" ? "Bayar tim" : "Pelunasan invoice";
  showDialog("paymentDialog");
}

function setPage(page) {
  activePage = page;
  pageTitle();
  if (page === "income") renderIncome();
}

function handleClick(event) {
  const target = event.target.closest("button");
  if (!target) return;
  if (target.dataset.page) setPage(target.dataset.page);
  if (target.dataset.incomePeriod) {
    activeIncomePeriod = target.dataset.incomePeriod;
    renderIncome();
  }
  if (target.dataset.payInvoice) {
    const invoice = state.invoices.find((item) => item.id === target.dataset.payInvoice);
    if (invoice && !invoice.cancelled && invoiceBalance(invoice) > 0) editPayment("client", invoice.clientId, invoice.projectId, invoice.id);
  }
  if (target.dataset.printInvoice) printInvoice(target.dataset.printInvoice);
  if (target.dataset.cancelInvoice && confirm("Batalkan invoice ini? Riwayat pembayaran tetap tersimpan.")) {
    const invoice = state.invoices.find((item) => item.id === target.dataset.cancelInvoice);
    if (invoice) invoice.cancelled = true;
    saveState(); renderAll();
  }
  if (target.id === "addTodoBtn") editTodo();
  if (target.dataset.editTodo) editTodo(target.dataset.editTodo);
  if (target.dataset.toggleTodo) {
    const todo = state.todos.find((item) => item.id === target.dataset.toggleTodo);
    if (todo) todo.status = todo.status === "done" ? "open" : "done";
    saveState(); renderAll();
  }
  if (target.dataset.deleteTodo && confirm("Hapus To-do ini?")) {
    state.todos = state.todos.filter((item) => item.id !== target.dataset.deleteTodo);
    saveState(); renderAll();
  }
  if (target.id === "addClientTopBtn") editClient();
  if (target.dataset.addWork) editWork(target.dataset.addWork);
  if (target.dataset.editWork) editWork(target.dataset.parentId, target.dataset.editWork);
  if (target.dataset.deleteWork && confirm("Hapus client ini? Riwayat pembayaran tetap tersimpan.")) {
    const project = getClient(target.dataset.parentId);
    if (project) project.works = project.works.filter((work) => work.id !== target.dataset.deleteWork);
    saveState(); renderAll();
  }
  if (target.id === "addInvoiceBtn") editInvoice();
  if (target.id === "addClientBtn") editClient();
  if (target.id === "addTeamPaymentBtn") editPayment("team");
  if (target.dataset.clientPayment) editInvoice(target.dataset.clientPayment, target.dataset.paymentWork || "");
  if (target.dataset.editClient) editClient(target.dataset.editClient);
  if (target.dataset.deleteClient && confirm("Hapus projek dan daftar client-nya? Riwayat pembayaran tetap tersimpan.")) {
    state.clients = state.clients.filter((client) => client.id !== target.dataset.deleteClient);
    saveState(); renderAll();
  }
  if (target.dataset.deletePayment && confirm("Hapus catatan pembayaran ini?")) {
    state.payments = state.payments.filter((payment) => payment.id !== target.dataset.deletePayment);
    saveState(); renderAll();
  }
  if (target.dataset.deleteTeamPayment && confirm("Hapus catatan pembayaran tim ini?")) {
    state.teamPayments = state.teamPayments.filter((payment) => payment.id !== target.dataset.deleteTeamPayment);
    saveState(); renderAll();
  }
}

function bindForms() {
  document.getElementById("invoiceProject").addEventListener("change", () => { renderInvoiceWorks(); updateInvoiceAmount(); });
  document.getElementById("invoiceWork").addEventListener("change", updateInvoiceAmount);
  document.getElementById("invoiceForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const clientId = document.getElementById("invoiceProject").value;
    const projectId = document.getElementById("invoiceWork").value;
    const project = getClient(clientId);
    const amount = Number(document.getElementById("invoiceAmount").value);
    if (!project || (projectId && !project.works.some((work) => work.id === projectId)) || !Number.isFinite(amount) || amount <= 0 || amount > invoiceAvailable(clientId, projectId)) {
      document.getElementById("invoiceMessage").textContent = "Periksa nilai invoice. Nilai tidak boleh melebihi sisa tagihan yang belum dibuatkan invoice."; return;
    }
    const date = document.getElementById("invoiceDate").value;
    const dueDate = document.getElementById("invoiceDue").value;
    if (dueDate < date) { document.getElementById("invoiceMessage").textContent = "Jatuh tempo harus pada atau setelah tanggal invoice."; return; }
    const id = uid("invoice");
    const invoice = { id, number: `INV-${date.replaceAll("-", "")}-${id.split("_").at(-1).toUpperCase()}`, clientId, projectId, projectName: project.name, workName: project.works.find((work) => work.id === projectId)?.title || "", amount, date, dueDate, notes: document.getElementById("invoiceNotes").value.trim(), cancelled: false };
    state.invoices.push(invoice);
    saveState(); renderAll(); event.target.closest("dialog").close();
  });
  document.getElementById("settingsForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const next = {};
    for (const [key, id] of [["projectCategories", "settingsProjectCategories"], ["categories", "settingsCategories"], ["methods", "settingsMethods"], ["statuses", "settingsStatuses"]]) {
      next[key] = [...new Set(document.getElementById(id).value.split("\n").map((value) => value.trim()).filter(Boolean))];
      if (!next[key].length) { document.getElementById("settingsMessage").textContent = "Isi minimal satu pilihan untuk setiap daftar."; return; }
    }
    next.statuses = [...new Set(["Berjalan", ...next.statuses, "Selesai", "Dibatalkan"])];
    state.settings = next;
    saveState(); renderAll();
    document.getElementById("settingsMessage").textContent = "Pengaturan tersimpan.";
  });
  document.getElementById("paymentClient").addEventListener("change", (event) => {
    renderPaymentWorks(event.target.value);
    setChoice("paymentMethod", "paymentMethodOther", getClient(event.target.value)?.paymentPreference || state.settings.methods[0]);
  });
  document.getElementById("projectSearch").addEventListener("input", renderClients);
  document.getElementById("projectCategoryFilter").addEventListener("change", renderClients);
  for (const [select, input] of [["paymentMethod", "paymentMethodOther"]]) {
    document.getElementById(select).addEventListener("change", () => updateOther(select, input));
  }
  for (const id of ["todoStatusFilter", "deadlineSort"]) document.getElementById(id).addEventListener("change", renderTodos);
  document.getElementById("todoForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = document.getElementById("todoId").value || uid("todo");
    const todo = { id };
    for (const [key, field] of Object.entries({title: "Title", clientId: "Client", dueDate: "DueDate", priority: "Priority", status: "Status", note: "Note"})) todo[key] = document.getElementById(`todo${field}`).value.trim();
    state.todos = [...state.todos.filter((item) => item.id !== id), todo];
    saveState(); renderAll(); event.target.closest("dialog").close();
  });
  document.getElementById("clientForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const id = document.getElementById("clientId").value || uid("client");
    const project = { ...getClient(id), id, works: getClient(id)?.works || [], name: document.getElementById("clientName").value.trim(), category: document.getElementById("clientCategory").value, dueDate: document.getElementById("clientDeadline").value };
    state.clients = [...state.clients.filter((item) => item.id !== id), project];
    saveState(); renderAll(); event.target.closest("dialog").close();
  });
  document.getElementById("workForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const project = getClient(document.getElementById("workParentId").value);
    if (!project) return;
    const id = document.getElementById("workId").value || uid("work");
    const old = project.works.find((work) => work.id === id);
    const work = { ...old, id, title: document.getElementById("workName").value.trim(), category: document.getElementById("workCategory").value, price: Number(document.getElementById("workPrice").value), dueDate: document.getElementById("workDeadline").value, status: document.getElementById("workStatus").value, team: document.getElementById("workTeam").value.split(",").map((name) => name.trim()).filter(Boolean), notes: document.getElementById("workNotes").value.trim() };
    project.works = [...project.works.filter((item) => item.id !== id), work];
    expandedProjects.add(project.id);
    saveState(); renderAll(); event.target.closest("dialog").close();
  });
  document.getElementById("paymentForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const type = document.getElementById("paymentType").value;
    const invoiceId = document.getElementById("paymentInvoiceId").value;
    const invoice = state.invoices.find((item) => item.id === invoiceId);
    const amount = Number(document.getElementById("paymentAmount").value);
    if (!Number.isFinite(amount) || amount <= 0) return;
    if (type !== "team" && (!invoice || invoice.cancelled || !Number.isFinite(amount) || amount <= 0 || amount > invoiceBalance(invoice))) return;
    const clientId = invoice?.clientId || document.getElementById("paymentClient").value;
    const base = { id: uid(type === "team" ? "payout" : "payment"), clientId, invoiceId: invoice?.id || "", invoiceNumber: invoice?.number || "", projectId: invoice ? invoice.projectId : document.getElementById("paymentWork").value, amount: Number(document.getElementById("paymentAmount").value), date: document.getElementById("paymentDate").value, method: choiceValue("paymentMethod", "paymentMethodOther") };
    if (type === "team") state.teamPayments.push({ ...base, member: document.getElementById("paymentMember").value.trim() });
    else state.payments.push(base);
    saveState(); renderAll(); event.target.closest("dialog").close();
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.addEventListener("click", handleClick);
  bindForms();
  renderAll();
  initSync();
});
})();
