// AM/PM dropdown logic for mobile
function isMobileView() { return true; }
function getOutAmPmValue() {
  return document.getElementById('mobileOutAmPm').value;
}
function getInAmPmValue() {
  return document.getElementById('mobileInAmPm').value;
}

// --------- State ---------
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

// Random code generator
function generateRandomCode() {
  let letters = '';
  for (let i = 0; i < 3; i++) {
    letters += String.fromCharCode(65 + Math.floor(Math.random() * 26));
  }
  let digits = Math.floor(100 + Math.random() * 900);
  return `pe${letters}${digits}`;
}

// ------------ API HELPERS -----------
const API_BASE = "https://pegatepass-fzzy.onrender.com/api/requests";
const API_APPROVE = "https://pegatepass-fzzy.onrender.com/api/approve";
const API_STATUS = "https://pegatepass-fzzy.onrender.com/api/status";

async function fetchWithTimeout(resource, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000); // 5s timeout
  try {
    const response = await fetch(resource, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (e) {
    clearTimeout(id);
    throw e;
  }
}

async function saveRecordAPI(formData) {
  const res = await fetchWithTimeout("https://pegatepass-fzzy.onrender.com/api/submit", {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });
  if (!res.ok) throw new Error("API failed");
  return await res.json();
}

async function getRecordsAPI() {
  const res = await fetchWithTimeout(API_BASE);
  if (!res.ok) throw new Error("API failed");
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error("Data not array");
  return data;
}

async function updateRecordAPI(keycode, updateObj) {
  const res = await fetchWithTimeout(`${API_BASE}/${encodeURIComponent(keycode)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(updateObj)
  });
  if (!res.ok) throw new Error("API failed");
  return await res.json();
}

// Delete all records (HR only), API only
async function deleteAllRecordsAPI() {
  const res = await fetchWithTimeout(API_BASE, { method: 'DELETE' });
  if (!res.ok) throw new Error("API failed");
  return await res.json();
}

function downloadTextFile(text, filename) {
  const blob = new Blob([text], {type: "text/plain"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

// --------- Submit Form ---------
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
  try {
    await saveRecordAPI(formData);
    clearForm();
    renderNotificationBellAndPanel();
    showSuccessPopup("Response submitted successfully!");
    setTimeout(() => {
      downloadTextFile(formData.key, "outpass-key.txt");
    }, 650);
  } catch (e) {
    alert("Failed to submit to server.");
  }
}

function clearForm() {
  document.querySelectorAll("#outpassForm input, #outpassForm textarea, #outpassForm select").forEach(el => el.value = "");
  document.getElementById("vehicleFields").classList.add("hidden");
}

// --------- Know Your Status ---------
// Uses /api/status?key=...&name=...
async function showStatusResponse(statusArr) {
  const resp = document.getElementById("statusResponse");
  if (!statusArr || statusArr.length === 0) {
    resp.className = "hidden";
    resp.innerHTML = "";
    return;
  }
  let html = "";
  statusArr.forEach(rec => {
    let status = rec.rejected ? "rejected" : rec.approved ? "approved" : "pending";
    let icon, colorClass, label;
    if (status === "approved") {
      icon = `<i class="fas fa-check-circle"></i>`;
      colorClass = "status-approved";
      label = "Approved";
    } else if (status === "rejected") {
      icon = `<i class="fas fa-times-circle"></i>`;
      colorClass = "status-rejected";
      label = "Rejected";
    } else {
      icon = `<i class="fas fa-clock"></i>`;
      colorClass = "status-pending";
      label = "Pending";
    }
    html += `<div class="status-response ${colorClass}">${icon} Request by <b>${rec.name}</b> (${rec.keycode}) is <b>${label}</b>.</div>`;
  });
  resp.className = "";
  resp.innerHTML = html;
}

async function checkStatusCodeInput() {
  const code = document.getElementById("statusCodeInput").value.trim();
  const namePrompt = document.getElementById("namePromptContainer");
  const resp = document.getElementById("statusResponse");
  namePrompt.classList.add("hidden");
  document.getElementById("statusNameInput").value = "";
  resp.classList.add("hidden");
  resp.innerHTML = "";
  if (!code) return;
  // Use backend /api/status endpoint
  let matches = [];
  try {
    const res = await fetchWithTimeout(`${API_STATUS}?key=${encodeURIComponent(code)}`);
    if (res.ok) {
      matches = await res.json();
    }
  } catch {}
  if (!matches || matches.length === 0) {
    resp.className = "hidden";
    resp.innerHTML = "";
    return;
  }
  const uniqueNames = [...new Set(matches.map(m => (m.name || "").trim().toLowerCase()))];
  if (uniqueNames.length > 1) {
    namePrompt.classList.remove("hidden");
  } else {
    showStatusResponse(matches);
  }
}

document.getElementById("statusCodeInput").addEventListener("input", function() {
  checkStatusCodeInput();
});
document.getElementById("statusNameInput").addEventListener("input", async function() {
  const code = document.getElementById("statusCodeInput").value.trim();
  const name = this.value.trim();
  const resp = document.getElementById("statusResponse");
  resp.classList.add("hidden");
  resp.innerHTML = "";
  if (!code || !name) return;
  let matches = [];
  try {
    const res = await fetchWithTimeout(`${API_STATUS}?key=${encodeURIComponent(code)}&name=${encodeURIComponent(name)}`);
    if (res.ok) {
      matches = await res.json();
    }
  } catch {}
  if (!matches || matches.length === 0) {
    resp.className = "hidden";
    resp.innerHTML = "";
    return;
  }
  showStatusResponse(matches);
});
document.getElementById("statusCodeInput").addEventListener("input", function() {
  if (!this.value.trim()) {
    document.getElementById("namePromptContainer").classList.add("hidden");
    document.getElementById("statusResponse").classList.add("hidden");
    document.getElementById("statusResponse").innerHTML = "";
    document.getElementById("statusNameInput").value = "";
  }
});

// --------- Admin Logic ---------
async function renderTable() {
  const records = await getRecordsAPI();
  const tbody = document.getElementById("dataTable").getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";
  document.getElementById("deleteTableMainBtn").classList.toggle("hidden", loggedInAdmin !== "hr");
  records.forEach((rec, i) => {
    if (loggedInAdmin !== "hr" && loggedInAdmin !== rec.authority) return;
    const row = tbody.insertRow();
    if (rec.rejected) {
      row.innerHTML =
        `<td>${rec.domain}</td>
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
        <td>❌ Rejected</td>`;
    } else {
      row.innerHTML =
        `<td>${rec.domain}</td>
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
        <td>${rec.approved ? '✅ Approved' :
          `<button class="approve-button" onclick="approveRecord('${rec.keycode}')">Approve</button>
          <button class="reject-button" onclick="rejectRecord('${rec.keycode}')">Reject</button>`}
        </td>`;
    }
  });
}

async function approveRecord(keycode) {
  const records = await getRecordsAPI();
  const rec = records.find(r => r.keycode === keycode);
  if (!rec) {
    alert("Record not found");
    return;
  }
  try {
    const res = await fetchWithTimeout(API_APPROVE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id, action: "approve" })
    });
    if (!res.ok) throw new Error("Failed to approve");
  } catch {
    alert("Failed to approve record");
  }
  renderTable();
  renderNotificationBellAndPanel();
}

async function rejectRecord(keycode) {
  const records = await getRecordsAPI();
  const rec = records.find(r => r.keycode === keycode);
  if (!rec) {
    alert("Record not found");
    return;
  }
  try {
    const res = await fetchWithTimeout(API_APPROVE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: rec.id, action: "reject" })
    });
    if (!res.ok) throw new Error("Failed to reject");
  } catch {
    alert("Failed to reject record");
  }
  renderTable();
  renderNotificationBellAndPanel();
}

function handleSearchInput() {
  const input = document.getElementById("searchInput").value.trim().toLowerCase();
  document.getElementById("adminDropdown").classList.toggle("hidden", input !== "admin");
  if (input === "security") {
    openSecurityModal();
  }
}
function openAdminModal(role) {
  if (!role) return;
  document.getElementById("adminSelect").value = role;
  document.getElementById("adminPassword").value = "";
  document.getElementById("adminLoginModal").classList.add("show");
}
function loginAdmin() {
  const user = document.getElementById("adminSelect").value;
  const pass = document.getElementById("adminPassword").value;
  if (adminCredentials[user] === pass) {
    loggedInAdmin = user;
    document.getElementById("adminLoginModal").classList.remove("show");
    document.getElementById("outpassForm").classList.add("hidden");
    document.getElementById("notifBellWrapper").style.display = "none";
    document.getElementById("adminPanel").classList.remove("hidden");
    renderTable();
  } else {
    alert("Incorrect password!");
  }
}
function closeAdminLogin() {
  document.getElementById("adminLoginModal").classList.remove("show");
}
function logout() {
  loggedInAdmin = null;
  document.getElementById("adminPanel").classList.add("hidden");
  document.getElementById("outpassForm").classList.remove("hidden");
  document.getElementById("notifBellWrapper").style.display = "flex";
  renderNotificationBellAndPanel();
}
function downloadPDF() {
  const element = document.getElementById("pdfContent");
  const opt = {
    margin: 0.3,
    filename: 'outpass_records.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(element).save();
}

// Security Panel
function openSecurityModal() {
  document.getElementById("securityUser").value = "";
  document.getElementById("securityPassword").value = "";
  document.getElementById("securityLoginModal").classList.add("show");
}
function closeSecurityLogin() {
  document.getElementById("securityLoginModal").classList.remove("show");
}
function loginSecurity() {
  const user = document.getElementById("securityUser").value.trim();
  const pass = document.getElementById("securityPassword").value;
  if (user === "security" && pass === "security123") {
    loggedInSecurity = true;
    document.getElementById("securityLoginModal").classList.remove("show");
    document.getElementById("securityPanel").classList.remove("hidden");
    document.getElementById("outpassForm").classList.add("hidden");
    renderSecurityTable();
  } else {
    alert("Invalid credentials!");
  }
}
async function renderSecurityTable() {
  const records = await getRecordsAPI();
  const tbody = document.getElementById("securityDataTable").getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";
  records.forEach((rec) => {
    let status;
    if (rec.rejected) status = '❌ Rejected';
    else if (rec.approved) status = '✅ Approved';
    else status = '⏳ Pending';
    const row = tbody.insertRow();
    row.innerHTML =
      `<td>${rec.domain}</td>
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
      <td>${status}</td>`;
  });
}
function downloadPDFSecurity() {
  const element = document.getElementById("securityPdfContent");
  const opt = {
    margin: 0.3,
    filename: 'security_outpass_requests.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
  };
  html2pdf().set(opt).from(element).save();
}
function logoutSecurity() {
  loggedInSecurity = false;
  document.getElementById("securityPanel").classList.add("hidden");
  document.getElementById("outpassForm").classList.remove("hidden");
  document.getElementById("notifBellWrapper").style.display = "flex";
  renderNotificationBellAndPanel();
}

// Notification Bell & Panel
let previousNotifCount = 0;
async function renderNotificationBellAndPanel() {
  if (loggedInAdmin || loggedInSecurity) {
    document.getElementById("notifBellWrapper").style.display = "none";
    previousNotifCount = 0;
    return;
  } else {
    document.getElementById("notifBellWrapper").style.display = "flex";
  }
  const records = await getRecordsAPI();
  const unapproved = records.map((rec, idx) => ({...rec, idx})).filter(rec => !rec.approved && !rec.rejected);
  const notifBadge = document.getElementById("notifBadge");
  notifBadge.style.display = unapproved.length > 0 ? "inline-block" : "none";
  notifBadge.textContent = unapproved.length > 0 ? unapproved.length : "";
  if (unapproved.length > previousNotifCount) {
    document.getElementById("notifSound").play().catch(()=>{});
  }
  previousNotifCount = unapproved.length;
  if (notificationPanelOpen) {
    fillNotificationPanel(unapproved);
  } else {
    document.getElementById("notificationPanel").style.display = "none";
  }
}
function fillNotificationPanel(unapproved) {
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
    let msg = `Request from <strong>${rec.name}</strong> (${rec.domain})<br><small>${formatDateDMY(rec.date)} to <strong>${rec.authority && rec.authority.toUpperCase ? rec.authority.toUpperCase() : rec.authority}</strong></small>`;
    let li = document.createElement("li");
    li.innerHTML = msg;
    notifList.appendChild(li);
  });
}
async function toggleNotificationPanel() {
  if (loggedInAdmin || loggedInSecurity) return;
  notificationPanelOpen = !notificationPanelOpen;
  await renderNotificationBellAndPanel();
  if (notificationPanelOpen) {
    var bell = document.getElementById("notifBell");
    var panel = document.getElementById("notificationPanel");
    panel.style.left = "0";
    panel.style.top = (bell.offsetHeight + 7) + "px";
  }
}
function closeNotificationPanel() {
  notificationPanelOpen = false;
  document.getElementById("notificationPanel").style.display = "none";
}

// Delete Table (HR only)
function openDeleteModal() {
  document.getElementById("deleteModal").classList.add("show");
  document.getElementById("deleteCodeInput").value = "";
  document.getElementById("deleteTableBtn").disabled = true;
  document.getElementById("deleteTableBtn").innerHTML = '<i class="fas fa-trash"></i>';
  document.getElementById("deleteCodeInput").oninput = function() {
    document.getElementById("deleteTableBtn").disabled = (this.value.trim() !== "333");
  }
  document.getElementById("deleteTableBtn").onclick = deleteAndDownloadTable;
}
function closeDeleteModal() {
  document.getElementById("deleteModal").classList.remove("show");
}
async function deleteAndDownloadTable() {
  const btn = document.getElementById("deleteTableBtn");
  btn.disabled = true;
  btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

  const element = document.getElementById("pdfContent");
  const opt = {
    margin: 0.3,
    filename: 'outpass_records.pdf',
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'in', format: 'letter', orientation: 'landscape' }
  };

  try {
    await html2pdf().set(opt).from(element).save();
    setTimeout(async () => {
      btn.innerHTML = '<i class="fas fa-trash"></i>';
      if (confirm("PDF downloaded. Do you want to delete all outpass records?")) {
        btn.disabled = true;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        try {
          await deleteAllRecordsAPI();
          renderTable();
          closeDeleteModal();
          alert("Table deleted.");
        } catch (e) {
          alert("Delete failed. Please try again.");
        }
      } else {
        closeDeleteModal();
      }
      btn.innerHTML = '<i class="fas fa-trash"></i>';
      btn.disabled = false;
    }, 500); // Slight delay to allow download to start
  } catch(e) {
    alert("PDF download failed. Table not deleted.");
    btn.innerHTML = '<i class="fas fa-trash"></i>';
    btn.disabled = false;
  }
}

// --------- Initialization ---------
document.getElementById("outpassForm").classList.remove("hidden");
renderNotificationBellAndPanel();
document.getElementById("adminLoginModal").classList.remove("show");
document.getElementById("securityLoginModal").classList.remove("show");
document.getElementById("deleteModal").classList.remove("show");
window.addEventListener('keydown', function(e) {
  if (e.key === "Escape") {
    closeAdminLogin();
    closeSecurityLogin();
    closeDeleteModal();
  }
});