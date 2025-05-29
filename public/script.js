<script>
const API_BASE = "https://pegatepass-fzzy.onrender.com";

// Helper: fetch records from API
async function fetchRecords() {
  const res = await fetch(`${API_BASE}/records`);
  return res.ok ? await res.json() : [];
}

// Helper: send new record to API
async function saveRecordToAPI(record) {
  const res = await fetch(`${API_BASE}/records`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  return res.ok;
}

// Helper: update approval/rejection
async function updateRecordStatus(key, data) {
  await fetch(`${API_BASE}/records/${key}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

// Helper: delete all records
async function deleteAllRecords() {
  await fetch(`${API_BASE}/records`, { method: "DELETE" });
}

// ---------- Your Existing Functions (with modifications) ----------
function isMobileView() { return true; }
function getOutAmPmValue() {
  return document.getElementById('mobileOutAmPm').value;
}
function getInAmPmValue() {
  return document.getElementById('mobileInAmPm').value;
}
const adminCredentials = {
  hr: "admin123",
  ceo: "admin123",
  sectionhead: "admin123",
  saleshead: "admin123",
  accountshead: "admin123"
};
let loggedInAdmin = null;
let notificationPanelOpen = false;
let loggedInSecurity = false;

function formatDateDMY(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return '';
  const parts = yyyy_mm_dd.split("-");
  if (parts.length !== 3) return yyyy_mm_dd;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}
function toggleVehicleFields(value) {
  document.getElementById("vehicleFields").classList.toggle("hidden", value !== "Yes");
}
function showSuccessPopup(msg) {
  const popup = document.getElementById("successPopup");
  popup.textContent = msg;
  popup.classList.remove("hidden");
  popup.style.opacity = '1';
  setTimeout(() => {
    popup.style.opacity = '0';
    setTimeout(() => { popup.classList.add("hidden"); }, 550);
  }, 2100);
}
function generateRandomCode() {
  let letters = '';
  for (let i = 0; i < 3; i++) {
    letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  let digits = Math.floor(100 + Math.random() * 900);
  return `pe${letters}${digits}`;
}
function downloadTextFile(text, filename) {
  const blob = new Blob([text], { type: "text/plain" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
async function submitForm() {
  const formData = {
    domain: document.getElementById("domain").value,
    name: document.getElementById("name").value,
    date: document.getElementById("date").value,
    outTime: document.getElementById("outTime").value + " " + getOutAmPmValue(),
    inTime: document.getElementById("inTime").value + " " + getInAmPmValue(),
    reason: document.getElementById("reason").value,
    vehicleUsed: document.getElementById("vehicleUsed").value,
    vehicleNo: document.getElementById("vehicleNo").value,
    readingOut: document.getElementById("readingOut").value,
    readingIn: document.getElementById("readingIn").value,
    authority: document.getElementById("authority").value,
    approved: false,
    rejected: false,
    key: generateRandomCode()
  };
  if (!formData.domain || !formData.name || !formData.date || !formData.reason || !formData.authority) {
    alert("Please fill all mandatory fields.");
    return;
  }
  await saveRecordToAPI(formData);
  clearForm();
  renderNotificationBellAndPanel();
  showSuccessPopup("Response submitted successfully!");
  setTimeout(() => downloadTextFile(formData.key, "outpass-key.txt"), 650);
}
function clearForm() {
  document.querySelectorAll("#outpassForm input, #outpassForm textarea, #outpassForm select").forEach(el => el.value = "");
  document.getElementById("vehicleFields").classList.add("hidden");
}
function showStatusResponse(statusArr) {
  const resp = document.getElementById("statusResponse");
  if (!statusArr || statusArr.length === 0) {
    resp.className = "hidden";
    resp.innerHTML = "";
    return;
  }
  let html = "";
  statusArr.forEach(rec => {
    let status = rec.rejected ? "rejected" : rec.approved ? "approved" : "pending";
    let icon = status === "approved" ? `<i class="fas fa-check-circle"></i>` :
               status === "rejected" ? `<i class="fas fa-times-circle"></i>` :
               `<i class="fas fa-clock"></i>`;
    let colorClass = `status-${status}`;
    let label = status.charAt(0).toUpperCase() + status.slice(1);
    html += `<div class="status-response ${colorClass}">${icon} Request by <b>${rec.name}</b> (${rec.key}) is <b>${label}</b>.</div>`;
  });
  resp.className = "";
  resp.innerHTML = html;
}
document.getElementById("statusCodeInput").addEventListener("input", async function () {
  const code = this.value.trim();
  const namePrompt = document.getElementById("namePromptContainer");
  const resp = document.getElementById("statusResponse");
  namePrompt.classList.add("hidden");
  document.getElementById("statusNameInput").value = "";
  resp.classList.add("hidden");
  resp.innerHTML = "";
  if (!code) return;
  const records = await fetchRecords();
  const matches = records.filter(r => r.key && r.key.toLowerCase() === code.toLowerCase());
  if (matches.length === 0) return;
  const uniqueNames = [...new Set(matches.map(m => (m.name || "").trim().toLowerCase()))];
  if (uniqueNames.length > 1) {
    namePrompt.classList.remove("hidden");
  } else {
    showStatusResponse(matches);
  }
});
document.getElementById("statusNameInput").addEventListener("input", async function () {
  const code = document.getElementById("statusCodeInput").value.trim();
  const name = this.value.trim().toLowerCase();
  const resp = document.getElementById("statusResponse");
  resp.classList.add("hidden");
  resp.innerHTML = "";
  if (!code || !name) return;
  const records = await fetchRecords();
  const matches = records.filter(r => r.key && r.key.toLowerCase() === code.toLowerCase() && (r.name || "").trim().toLowerCase() === name);
  if (matches.length === 0) return;
  showStatusResponse(matches);
});
async function renderTable() {
  const records = await fetchRecords();
  const tbody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";
  document.getElementById("deleteTableMainBtn").classList.toggle("hidden", loggedInAdmin !== "hr");
  records.forEach((rec, i) => {
    if (loggedInAdmin !== "hr" && loggedInAdmin !== rec.authority) return;
    const row = tbody.insertRow();
    row.innerHTML = `
      <td>${rec.domain}</td>
      <td>${rec.name}</td>
      <td>${formatDateDMY(rec.date)}</td>
      <td>${rec.outTime}</td>
      <td>${rec.inTime}</td>
      <td>${rec.reason}</td>
      <td>${rec.vehicleUsed}</td>
      <td>${rec.vehicleNo}</td>
      <td>${rec.readingOut}</td>
      <td>${rec.readingIn}</td>
      <td>${rec.authority}</td>
      <td>
        ${rec.rejected ? '❌ Rejected' :
          rec.approved ? '✅ Approved' :
          `<button class="approve-button" onclick="approveRecord('${rec.key}')">Approve</button>
           <button class="reject-button" onclick="rejectRecord('${rec.key}')">Reject</button>`}
      </td>`;
  });
}
async function approveRecord(key) {
  await updateRecordStatus(key, { approved: true, rejected: false });
  renderTable();
  renderNotificationBellAndPanel();
}
async function rejectRecord(key) {
  await updateRecordStatus(key, { approved: false, rejected: true });
  renderTable();
  renderNotificationBellAndPanel();
}
async function renderNotificationBellAndPanel() {
  if (loggedInAdmin || loggedInSecurity) {
    document.getElementById("notifBellWrapper").style.display = "none";
    previousNotifCount = 0;
    return;
  } else {
    document.getElementById("notifBellWrapper").style.display = "flex";
  }
  const records = await fetchRecords();
  const unapproved = records.filter(rec => !rec.approved && !rec.rejected);
  const notifBadge = document.getElementById("notifBadge");
  notifBadge.style.display = unapproved.length > 0 ? "inline-block" : "none";
  notifBadge.textContent = unapproved.length > 0 ? unapproved.length : "";
  if (unapproved.length > previousNotifCount) {
    document.getElementById("notifSound").play().catch(() => {});
  }
  previousNotifCount = unapproved.length;
  if (notificationPanelOpen) fillNotificationPanel(unapproved);
  else document.getElementById("notificationPanel").style.display = "none";
}
async function fillNotificationPanel(unapproved) {
  const notifPanel = document.getElementById("notificationPanel");
  const notifList = document.getElementById("notifList");
  notifList.innerHTML = "";
  if (unapproved.length === 0) {
    notifPanel.style.display = "none";
    notificationPanelOpen = false;
    return;
  }
  notifPanel.style.display = "block";
  unapproved.forEach(rec => {
    let msg = `Request from <strong>${rec.name}</strong> (${rec.domain})<br><small>${formatDateDMY(rec.date)} to <strong>${rec.authority?.toUpperCase?.() || rec.authority}</strong></small>`;
    let li = document.createElement("li");
    li.innerHTML = msg;
    notifList.appendChild(li);
  });
}
function toggleNotificationPanel() {
  if (loggedInAdmin || loggedInSecurity) return;
  notificationPanelOpen = !notificationPanelOpen;
  renderNotificationBellAndPanel();
  if (notificationPanelOpen) {
    var bell = document.getElementById("notifBell");
    var panel = document.getElementById("notificationPanel");
    panel.style.left = "0";
    panel.style.top = (bell.offsetHeight + 7) + "px";
  }
}
async function deleteAndDownloadTable() {
  downloadPDF();
  setTimeout(async () => {
    await deleteAllRecords();
    renderTable();
    closeDeleteModal();
    alert("Table deleted.");
  }, 600);
}
</script>
