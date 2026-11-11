"use strict";

// ==========================================================================
// 1. DATA MANAGEMENT & LOCAL STORAGE
// ==========================================================================

const STORAGE_KEY = "todo-list_storage";

/**
 * Generates initial sample tasks covering all supported statuses.
 * @returns {Array<Object>}
 */
function getInitialSampleTasks() {
    const now = Date.now();
    const hour = 60 * 60 * 1000;
    const day = 24 * hour;

    return [
        {
            id: "1",
            title: "Programming Algorithm Assignment",
            deadline: new Date(now + 4 * day).toISOString(),
            createdAt: new Date(now - 2 * day).toISOString(),
            body: "Selesaikan bab analisis algoritma sorting dan dynamic programming. Kumpulkan ringkasan dan solusi kode ke portal akademik.",
            additionalNotes: ["GCR: https://classroom.google.com", "Modul Bab 4 & 5"],
            completed: false
        },
        {
            id: "2",
            title: "TypeScript Design Patterns Review",
            deadline: new Date(now + 10 * hour).toISOString(),
            createdAt: new Date(now - 1 * day).toISOString(),
            body: "Pelajari implementasi Factory dan Observer pattern menggunakan generic types dan utility types.",
            additionalNotes: ["Rekaman sesi kuliah", "Latihan di TS Playground"],
            completed: false
        },
        {
            id: "3",
            title: "Inventarisasi & Backup Data Kerja",
            deadline: new Date(now - 1 * day).toISOString(),
            createdAt: new Date(now - 3 * day).toISOString(),
            body: "Lakukan pencadangan berkas proyek penting ke cloud storage dan bersihkan cache penyimpanan lokal.",
            additionalNotes: ["Drive utama", "Repository GitHub"],
            completed: false
        },
        {
            id: "4",
            title: "Laporan Keuangan & Evaluasi Bulanan",
            deadline: new Date(now + 2 * day).toISOString(),
            createdAt: new Date(now - 1 * day).toISOString(),
            body: "Rekap pengeluaran operasional, perbarui catatan anggaran, dan arsipkan bukti transaksi bulanan.",
            additionalNotes: ["Export mutasi rekening", "Spreadsheet keuangan"],
            completed: true
        }
    ];
}

/**
 * Safely loads and normalizes tasks from browser localStorage.
 * @returns {Array<Object>}
 */
function loadTasks() {
    try {
        const savedData = localStorage.getItem(STORAGE_KEY);
        if (savedData === null) {
            return getInitialSampleTasks();
        }

        const parsedData = JSON.parse(savedData);
        if (!Array.isArray(parsedData) || (parsedData.length > 0 && typeof parsedData[0] === "object" && !parsedData[0].title)) {
            return getInitialSampleTasks();
        }

        return parsedData.map(item => ({
            id: String(item.id || createId()),
            title: String(item.title || "Tugas Tanpa Judul"),
            deadline: item.deadline || "",
            createdAt: item.createdAt || new Date().toISOString(),
            body: String(item.body || ""),
            additionalNotes: Array.isArray(item.additionalNotes)
                ? item.additionalNotes
                : typeof item.additionalNotes === "string" && item.additionalNotes.trim()
                    ? [item.additionalNotes.trim()]
                    : [],
            completed: Boolean(item.completed)
        }));
    } catch (error) {
        console.error("Gagal memuat tugas dari localStorage:", error);
        return getInitialSampleTasks();
    }
}

/**
 * Saves current task state to localStorage.
 * @returns {boolean}
 */
function saveTasks() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        return true;
    } catch (error) {
        console.error("Gagal menyimpan tugas:", error);
        showToast("Gagal menyimpan perubahan ke penyimpanan lokal.");
        return false;
    }
}

// ==========================================================================
// 2. STATE & DOM REFERENCES
// ==========================================================================

let tasks = loadTasks();
let editingId = null;
let viewingId = null;

// Metrics & Listing
const totalTasksEl = document.getElementById("totalTasks");
const totalPendingEl = document.getElementById("totalPending");
const totalClosedDeadlineEl = document.getElementById("totalClosedDeadline");
const totalDeadlinePassedEl = document.getElementById("totalDeadlinePassed");
const totalDoneEl = document.getElementById("totalDone");

const taskCardsGrid = document.getElementById("taskCardsGrid");
const emptyState = document.getElementById("emptyState");
const recordCount = document.getElementById("recordCount");
const searchInput = document.getElementById("searchInput");
const statusFilter = document.getElementById("statusFilter");

// Modal 1: Add / Edit Form
const taskModal = document.getElementById("taskModal");
const taskForm = document.getElementById("taskForm");
const modalTitle = document.getElementById("modalTitle");
const modalSubtitle = document.getElementById("modalSubtitle");
const saveBtn = document.getElementById("saveBtn");
const formError = document.getElementById("formError");
const addBtn = document.getElementById("addBtn");
const emptyAddBtn = document.getElementById("emptyAddBtn");
const closeModalBtn = document.getElementById("closeModalBtn");
const cancelBtn = document.getElementById("cancelBtn");

const formFields = {
    title: document.getElementById("taskTitle"),
    deadline: document.getElementById("taskDeadline"),
    body: document.getElementById("taskBody"),
    additionalNotes: document.getElementById("taskAdditionalNotes")
};

// Modal 2: Detail View
const detailModal = document.getElementById("detailModal");
const closeDetailBtn = document.getElementById("closeDetailBtn");
const detailStatusDot = document.getElementById("detailStatusDot");
const detailStatusText = document.getElementById("detailStatusText");
const detailModalTitle = document.getElementById("detailModalTitle");
const detailDeadline = document.getElementById("detailDeadline");
const detailDescription = document.getElementById("detailDescription");
const detailNotes = document.getElementById("detailNotes");
const detailNotesField = document.getElementById("detailNotesField");
const detailCreatedAt = document.getElementById("detailCreatedAt");
const detailDeleteBtn = document.getElementById("detailDeleteBtn");
const detailToggleBtn = document.getElementById("detailToggleBtn");
const detailEditBtn = document.getElementById("detailEditBtn");

// Toast
const toast = document.getElementById("toast");
let toastTimer = null;

// ==========================================================================
// 3. UTILITIES
// ==========================================================================

function createId() {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID();
    }
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function escapeHTML(str) {
    if (str === null || str === undefined) return "";
    return String(str).replace(/[&<>"']/g, match => {
        const entities = {
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        };
        return entities[match];
    });
}

function showToast(message) {
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        toast.classList.remove("show");
    }, 2400);
}

function getTaskStatus(task) {
    if (task.completed) return "done";
    if (!task.deadline) return "pending";

    const now = Date.now();
    const deadlineTime = new Date(task.deadline).getTime();

    if (isNaN(deadlineTime)) return "pending";
    if (deadlineTime < now) return "deadline-passed";

    const twentyFourHours = 24 * 60 * 60 * 1000;
    if (deadlineTime - now <= twentyFourHours) return "closed-deadline";

    return "pending";
}

function getStatusLabel(status) {
    const labels = {
        done: "Selesai",
        "closed-deadline": "Mendekati Batas",
        "deadline-passed": "Terlewat",
        pending: "Pending"
    };
    return labels[status] || "Pending";
}

function formatDateTime(dateInput) {
    if (!dateInput) return "—";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "—";

    return new Intl.DateTimeFormat("id-ID", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    }).format(date);
}

function formatDateTimeLocal(dateInput) {
    if (!dateInput) return "";
    const date = new Date(dateInput);
    if (isNaN(date.getTime())) return "";

    const pad = n => String(n).padStart(2, "0");
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ==========================================================================
// 4. METRICS & RENDERING
// ==========================================================================

function updateStatistics() {
    let pending = 0;
    let closed = 0;
    let passed = 0;
    let done = 0;

    tasks.forEach(task => {
        const status = getTaskStatus(task);
        if (status === "done") done++;
        else if (status === "closed-deadline") closed++;
        else if (status === "deadline-passed") passed++;
        else pending++;
    });

    if (totalTasksEl) totalTasksEl.textContent = tasks.length;
    if (totalPendingEl) totalPendingEl.textContent = pending;
    if (totalClosedDeadlineEl) totalClosedDeadlineEl.textContent = closed;
    if (totalDeadlinePassedEl) totalDeadlinePassedEl.textContent = passed;
    if (totalDoneEl) totalDoneEl.textContent = done;
}

function renderTasks() {
    const keyword = searchInput ? searchInput.value.trim().toLowerCase() : "";
    const selectedStatus = statusFilter ? statusFilter.value : "";

    const filtered = tasks.filter(task => {
        const status = getTaskStatus(task);

        const matchesKeyword =
            !keyword ||
            task.title.toLowerCase().includes(keyword) ||
            task.body.toLowerCase().includes(keyword) ||
            (Array.isArray(task.additionalNotes) &&
                task.additionalNotes.some(note => note.toLowerCase().includes(keyword)));

        const matchesStatus = !selectedStatus || status === selectedStatus;
        return matchesKeyword && matchesStatus;
    });

    if (taskCardsGrid) {
        taskCardsGrid.innerHTML = "";

        filtered.forEach(task => {
            const status = getTaskStatus(task);
            const statusLabel = getStatusLabel(status);

            let notesMarkup = "";
            if (Array.isArray(task.additionalNotes) && task.additionalNotes.length > 0) {
                const validNotes = task.additionalNotes.filter(n => typeof n === "string" && n.trim() !== "");
                if (validNotes.length > 0) {
                    const visible = validNotes.slice(0, 2);
                    const remaining = validNotes.length - 2;

                    notesMarkup = `
                        <div class="notes-chip-container">
                            ${visible.map(n => `<span class="note-chip">${escapeHTML(n)}</span>`).join("")}
                            ${remaining > 0 ? `<span class="note-chip">+${remaining}</span>` : ""}
                        </div>
                    `;
                }
            }

            const card = document.createElement("article");
            card.className = "task-card";
            card.dataset.id = task.id;
            card.setAttribute("role", "button");
            card.setAttribute("tabindex", "0");
            card.setAttribute("aria-label", `Buka detail tugas: ${task.title}`);

            card.innerHTML = `
                <div>
                    <div class="card-top">
                        <span class="status-pill">
                            <span class="status-dot" data-status="${status}"></span>
                            <span>${statusLabel}</span>
                        </span>
                    </div>

                    <h3 class="card-title">${escapeHTML(task.title)}</h3>
                    <p class="card-desc">${escapeHTML(task.body)}</p>

                    <div class="card-meta-list">
                        <div class="meta-item is-deadline">
                            <span>Tenggat: ${formatDateTime(task.deadline)}</span>
                        </div>
                        <div class="meta-item">
                            <span>Dibuat: ${formatDateTime(task.createdAt)}</span>
                        </div>
                    </div>

                    ${notesMarkup}
                </div>

                <div class="card-footer">
                    <span class="card-click-hint">Lihat rincian</span>
                    <button
                        type="button"
                        class="btn-subtle-toggle ${task.completed ? "is-completed" : ""}"
                        data-action="toggle"
                        data-id="${escapeHTML(task.id)}"
                    >
                        ${task.completed ? "Selesai" : "Tandai Selesai"}
                    </button>
                </div>
            `;

            taskCardsGrid.appendChild(card);
        });
    }

    if (emptyState) {
        emptyState.hidden = filtered.length > 0;
    }

    if (recordCount) {
        recordCount.textContent = `${filtered.length} tugas`;
    }

    updateStatistics();
}

// ==========================================================================
// 5. MODAL 1: FORM (ADD / EDIT)
// ==========================================================================

function openAddModal() {
    editingId = null;
    taskForm.reset();

    if (modalTitle) modalTitle.textContent = "Tambah Tugas Baru";
    if (modalSubtitle) modalSubtitle.textContent = "Lengkapi informasi tugas dan tenggat waktu.";
    if (saveBtn) saveBtn.textContent = "Simpan Tugas";

    hideFormError();
    taskModal.hidden = false;
    taskModal.setAttribute("aria-hidden", "false");
    if (formFields.title) formFields.title.focus();
}

function openEditModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
        showToast("Tugas tidak ditemukan.");
        return;
    }

    closeDetailModal();
    editingId = id;

    formFields.title.value = task.title;
    formFields.deadline.value = formatDateTimeLocal(task.deadline);
    formFields.body.value = task.body;
    formFields.additionalNotes.value = Array.isArray(task.additionalNotes)
        ? task.additionalNotes.join(", ")
        : "";

    if (modalTitle) modalTitle.textContent = "Edit Tugas";
    if (modalSubtitle) modalSubtitle.textContent = "Perbarui detail dan tenggat waktu tugas ini.";
    if (saveBtn) saveBtn.textContent = "Simpan Perubahan";

    hideFormError();
    taskModal.hidden = false;
    taskModal.setAttribute("aria-hidden", "false");
    if (formFields.title) formFields.title.focus();
}

function closeModal() {
    if (taskModal) {
        taskModal.hidden = true;
        taskModal.setAttribute("aria-hidden", "true");
    }
    editingId = null;
    if (taskForm) taskForm.reset();
    hideFormError();
}

function showFormError(message) {
    if (formError) {
        formError.textContent = message;
        formError.hidden = false;
    }
}

function hideFormError() {
    if (formError) {
        formError.hidden = true;
        formError.textContent = "";
    }
}

function getFormData() {
    const title = formFields.title.value.trim();
    const deadlineVal = formFields.deadline.value.trim();
    const body = formFields.body.value.trim();
    const notesVal = formFields.additionalNotes.value.trim();

    if (!title) throw new Error("Judul tugas wajib diisi.");
    if (!deadlineVal) throw new Error("Tenggat waktu wajib ditentukan.");
    if (!body) throw new Error("Deskripsi tugas wajib diisi.");

    const deadlineDate = new Date(deadlineVal);
    if (isNaN(deadlineDate.getTime())) throw new Error("Format tanggal tidak valid.");

    const additionalNotes = notesVal
        ? notesVal.split(/[\n,]+/).map(s => s.trim()).filter(Boolean)
        : [];

    return {
        title,
        deadline: deadlineDate.toISOString(),
        body,
        additionalNotes
    };
}

if (taskForm) {
    taskForm.addEventListener("submit", event => {
        event.preventDefault();

        try {
            const data = getFormData();

            if (editingId !== null) {
                const index = tasks.findIndex(t => t.id === editingId);
                if (index === -1) throw new Error("Tugas yang diedit tidak ditemukan.");

                const updated = [...tasks];
                updated[index] = { ...updated[index], ...data };

                const prev = tasks;
                tasks = updated;
                if (!saveTasks()) {
                    tasks = prev;
                    return;
                }

                closeModal();
                renderTasks();
                showToast("Tugas berhasil diperbarui.");
            } else {
                const newTask = {
                    id: createId(),
                    ...data,
                    createdAt: new Date().toISOString(),
                    completed: false
                };

                const prev = tasks;
                tasks = [newTask, ...tasks];
                if (!saveTasks()) {
                    tasks = prev;
                    return;
                }

                closeModal();
                renderTasks();
                showToast("Tugas baru berhasil ditambahkan.");
            }
        } catch (error) {
            showFormError(error.message);
        }
    });
}

// ==========================================================================
// 6. MODAL 2: DETAIL VIEW
// ==========================================================================

function openDetailModal(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) {
        showToast("Tugas tidak ditemukan.");
        return;
    }

    viewingId = id;
    const status = getTaskStatus(task);
    const statusLabel = getStatusLabel(status);

    if (detailStatusDot) detailStatusDot.dataset.status = status;
    if (detailStatusText) detailStatusText.textContent = statusLabel;
    if (detailModalTitle) detailModalTitle.textContent = task.title;
    if (detailDeadline) detailDeadline.textContent = formatDateTime(task.deadline);
    if (detailDescription) detailDescription.textContent = task.body;

    if (detailNotes && detailNotesField) {
        const valid = Array.isArray(task.additionalNotes)
            ? task.additionalNotes.filter(n => typeof n === "string" && n.trim() !== "")
            : [];

        if (valid.length > 0) {
            detailNotes.innerHTML = valid.map(n => `<span class="note-chip">${escapeHTML(n)}</span>`).join("");
            detailNotesField.hidden = false;
        } else {
            detailNotes.innerHTML = "";
            detailNotesField.hidden = true;
        }
    }

    if (detailCreatedAt) {
        detailCreatedAt.textContent = formatDateTime(task.createdAt);
    }

    if (detailToggleBtn) {
        detailToggleBtn.textContent = task.completed ? "Batal Selesai" : "Tandai Selesai";
    }

    detailModal.hidden = false;
    detailModal.setAttribute("aria-hidden", "false");
    if (closeDetailBtn) closeDetailBtn.focus();
}

function closeDetailModal() {
    if (detailModal) {
        detailModal.hidden = true;
        detailModal.setAttribute("aria-hidden", "true");
    }
    viewingId = null;
}

// ==========================================================================
// 7. ACTIONS (TOGGLE & DELETE)
// ==========================================================================

function toggleTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    task.completed = !task.completed;
    saveTasks();
    renderTasks();

    const msg = task.completed ? "Tugas ditandai selesai." : "Tugas dikembalikan ke pending.";
    showToast(msg);

    if (viewingId === id) {
        openDetailModal(id);
    }
}

function deleteTask(id) {
    const task = tasks.find(t => t.id === id);
    if (!task) return;

    const confirmed = confirm(`Hapus tugas "${task.title}"?\nTindakan ini tidak dapat dibatalkan.`);
    if (!confirmed) return;

    tasks = tasks.filter(t => t.id !== id);
    saveTasks();
    renderTasks();

    if (viewingId === id) {
        closeDetailModal();
    }

    showToast("Tugas berhasil dihapus.");
}

// ==========================================================================
// 8. EVENT BINDINGS
// ==========================================================================

if (addBtn) addBtn.addEventListener("click", openAddModal);
if (emptyAddBtn) emptyAddBtn.addEventListener("click", openAddModal);
if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

if (taskModal) {
    taskModal.addEventListener("click", event => {
        if (event.target === taskModal) closeModal();
    });
}

if (closeDetailBtn) closeDetailBtn.addEventListener("click", closeDetailModal);

if (detailModal) {
    detailModal.addEventListener("click", event => {
        if (event.target === detailModal) closeDetailModal();
    });
}

if (detailDeleteBtn) {
    detailDeleteBtn.addEventListener("click", () => {
        if (viewingId) deleteTask(viewingId);
    });
}

if (detailEditBtn) {
    detailEditBtn.addEventListener("click", () => {
        if (viewingId) openEditModal(viewingId);
    });
}

if (detailToggleBtn) {
    detailToggleBtn.addEventListener("click", () => {
        if (viewingId) toggleTask(viewingId);
    });
}

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        if (taskModal && !taskModal.hidden) closeModal();
        else if (detailModal && !detailModal.hidden) closeDetailModal();
    }
});

if (searchInput) searchInput.addEventListener("input", renderTasks);
if (statusFilter) statusFilter.addEventListener("change", renderTasks);

if (taskCardsGrid) {
    taskCardsGrid.addEventListener("click", event => {
        const toggleBtn = event.target.closest("button[data-action='toggle']");
        if (toggleBtn) {
            event.stopPropagation();
            toggleTask(toggleBtn.dataset.id);
            return;
        }

        const card = event.target.closest(".task-card");
        if (card && card.dataset.id) {
            openDetailModal(card.dataset.id);
        }
    });

    taskCardsGrid.addEventListener("keydown", event => {
        if (event.key === "Enter" || event.key === " ") {
            const card = event.target.closest(".task-card");
            if (card && card.dataset.id && event.target === card) {
                event.preventDefault();
                openDetailModal(card.dataset.id);
            }
        }
    });
}

// ==========================================================================
// 9. INITIALIZATION
// ==========================================================================

if (localStorage.getItem(STORAGE_KEY) === null) {
    saveTasks();
}

renderTasks();
