const API_BASE = "https://pegatepass-fzzy.onrender.com";

// Utility Functions
function isMobileView() { return true; }
function getOutAmPmValue() {
  return document.getElementById('mobileOutAmPm').value;
}
function getInAmPmValue() {
  return document.getElementById('mobileInAmPm').value;
}
function formatDateDMY(yyyy_mm_dd) {
  if (!yyyy_mm_dd) return '';
  const parts = yyyy_mm_dd.split("-");
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
    setTimeout(() => popup.classList.add("hidden"), 550);
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

const adminCredentials = {
  hr: "admin123",
  ceo: "admin123",
  sectionhead: "admin123",
  saleshead: "admin123",
  accountshead: "admin123"
};
let loggedInAdmin = null;
let loggedInSecurity = false;
let notificationPanelOpen = false;

// Submit Form
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
    await fetch(`${API_BASE}/records`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });

    clearForm();
    renderNotificationBellAndPanel();
    showSuccessPopup("Response submitted successfully!");
    setTimeout(() => downloadTextFile(formData.key, "outpass-key.txt"), 650);
  } catch (err) {
    alert("Error submitting form.");
    console.error(err);
  }
}
function clearForm() {
  document.querySelectorAll("#outpassForm input, #outpassForm textarea, #outpassForm select").forEach(el => el.value = "");
  document.getElementById("vehicleFields").classList.add("hidden");
}

// Status Functions
async function checkStatusCodeInput() {
  const code = document.getElementById("statusCodeInput").value.trim();
  const namePrompt = document.getElementById("namePromptContainer");
  const resp = document.getElementById("statusResponse");
  namePrompt.classList.add("hidden");
  document.getElementById("statusNameInput").value = "";
  resp.classList.add("hidden");
  resp.innerHTML = "";

  if (!code) return;

  const res = await fetch(`${API_BASE}/records`);
  const records = await res.json();
  const matches = records.filter(r => r.key?.toLowerCase() === code.toLowerCase());

  if (matches.length === 0) return;

  const uniqueNames = [...new Set(matches.map(m => m.name.trim().toLowerCase()))];
  if (uniqueNames.length > 1) {
    namePrompt.classList.remove("hidden");
  } else {
    showStatusResponse(matches);
  }
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
    html += `<div class="status-response ${colorClass}">${icon} Request by <b>${rec.name}</b> (${rec.key}) is <b>${label}</b>.</div>`;
  });
  resp.className = "";
  resp.innerHTML = html;
}

document.getElementById("statusCodeInput").addEventListener("input", checkStatusCodeInput);
document.getElementById("statusNameInput").addEventListener("input", async function () {
  const code = document.getElementById("statusCodeInput").value.trim();
  const name = this.value.trim().toLowerCase();

  if (!code || !name) return;

  const res = await fetch(`${API_BASE}/records`);
  const records = await res.json();
  const matches = records.filter(r => r.key.toLowerCase() === code.toLowerCase() && r.name.trim().toLowerCase() === name);
  showStatusResponse(matches);
});

// Admin
async function renderTable() {
  const res = await fetch(`${API_BASE}/records`);
  const records = await res.json();
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
      <td>${rec.rejected ? '❌ Rejected' :
        rec.approved ? '✅ Approved' :
        `<button onclick="approveRecord('${rec._id}')">Approve</button>
         <button onclick="rejectRecord('${rec._id}')">Reject</button>`}
      </td>`;
  });
}
async function approveRecord(id) {
  await fetch(`${API_BASE}/records/${id}/approve`, { method: "PUT" });
  renderTable();
}
async function rejectRecord(id) {
  await fetch(`${API_BASE}/records/${id}/reject`, { method: "PUT" });
  renderTable();
}

// Delete All
async function deleteAndDownloadTable() {
  downloadPDF(); // You should define this if needed
  await fetch(`${API_BASE}/records`, { method: "DELETE" });
  renderTable();
  alert("Table deleted.");
}

// Security Table
async function renderSecurityTable() {
  const res = await fetch(`${API_BASE}/records`);
  const records = await res.json();
  const tbody = document.getElementById("securityDataTable").getElementsByTagName("tbody")[0];
  tbody.innerHTML = "";

  records.forEach(rec => {
    const status = rec.rejected ? '❌ Rejected' : rec.approved ? '✅ Approved' : '⏳ Pending';
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
      <td>${status}</td>`;
  });
}

// Notifications
async function renderNotificationBellAndPanel() {
  if (loggedInAdmin || loggedInSecurity) return;

  const res = await fetch(`${API_BASE}/records`);
  const records = await res.json();
  const unapproved = records.filter(r => !r.approved && !r.rejected);

  const notifBadge = document.getElementById("notifBadge");
  notifBadge.style.display = unapproved.length > 0 ? "inline-block" : "none";
  notifBadge.textContent = unapproved.length;

  if (notificationPanelOpen) fillNotificationPanel(unapproved);
}
function fillNotificationPanel(unapproved) {
  const notifList = document.getElementById("notifList");
  notifList.innerHTML = "";
  unapproved.forEach(rec => {
    const li = document.createElement("li");
    li.innerHTML = `Request from <strong>${rec.name}</strong> (${rec.domain})<br><small>${formatDateDMY(rec.date)} → ${rec.authority}</small>`;
    notifList.appendChild(li);
  });
}

// Initialization
document.getElementById("outpassForm").classList.remove("hidden");
renderNotificationBellAndPanel();
