/**
 * TaskFlow — Modern SaaS Vanilla JavaScript App
 * Handles Auth, Sessions, Todo CRUD, UI Transitions, and Error Handling
 */

(function () {
  "use strict";

  // ========================================================
  // Application State
  // ========================================================
  const state = {
    currentUser: null,
    currentView: "tasks", // "tasks" | "activity"
    todos: [],
    activityLogs: [],
    activeFilter: "all", // "all" | "pending" | "completed"
    searchQuery: "",
    activityFilterMethod: "all", // "all" | "GET" | "POST" | "PATCH" | "DELETE"
    activitySearchQuery: "",
    deleteCandidateId: null,
  };

  // ========================================================
  // DOM Elements
  // ========================================================
  const elements = {
    // Top-level containers
    initialLoader: document.getElementById("initial-loader"),
    authView: document.getElementById("auth-view"),
    dashboardView: document.getElementById("dashboard-view"),
    toastContainer: document.getElementById("toast-container"),

    // Subviews & Layout
    tasksView: document.getElementById("tasks-view"),
    activityView: document.getElementById("activity-view"),
    headerTitle: document.querySelector(".header-title"),
    headerSubtitle: document.querySelector(".header-subtitle"),
    navActivity: document.getElementById("nav-activity"),
    sidebarActivityBadge: document.getElementById("sidebar-activity-badge"),

    // Auth forms & tabs
    tabRegisterBtn: document.getElementById("tab-register-btn"),
    tabLoginBtn: document.getElementById("tab-login-btn"),
    registerForm: document.getElementById("register-form"),
    loginForm: document.getElementById("login-form"),
    linkToLogin: document.getElementById("link-to-login"),
    linkToRegister: document.getElementById("link-to-register"),

    // Registration inputs & errors
    regName: document.getElementById("reg-name"),
    regEmail: document.getElementById("reg-email"),
    regPassword: document.getElementById("reg-password"),
    regConfirmPassword: document.getElementById("reg-confirm-password"),
    regNameError: document.getElementById("reg-name-error"),
    regEmailError: document.getElementById("reg-email-error"),
    regPasswordError: document.getElementById("reg-password-error"),
    regConfirmError: document.getElementById("reg-confirm-error"),
    btnSubmitRegister: document.getElementById("btn-submit-register"),

    // Login inputs & errors
    loginEmail: document.getElementById("login-email"),
    loginPassword: document.getElementById("login-password"),
    loginEmailError: document.getElementById("login-email-error"),
    loginPasswordError: document.getElementById("login-password-error"),
    btnSubmitLogin: document.getElementById("btn-submit-login"),

    // Dashboard layout elements
    sidebar: document.getElementById("sidebar"),
    sidebarBackdrop: document.getElementById("sidebar-backdrop"),
    sidebarToggleBtn: document.getElementById("sidebar-toggle-btn"),
    sidebarCloseBtn: document.getElementById("sidebar-close-btn"),
    sidebarLogoutBtn: document.getElementById("sidebar-logout-btn"),
    headerLogoutBtn: document.getElementById("header-logout-btn"),
    headerDate: document.getElementById("header-date"),

    // User profile displays
    userAvatar: document.getElementById("user-avatar"),
    userName: document.getElementById("user-name"),
    userEmail: document.getElementById("user-email"),
    headerUserAvatar: document.getElementById("header-user-avatar"),
    headerUserName: document.getElementById("header-user-name"),
    sidebarTaskBadge: document.getElementById("sidebar-task-badge"),

    // Stats
    statTotal: document.getElementById("stat-total"),
    statCompleted: document.getElementById("stat-completed"),
    statCompletedRate: document.getElementById("stat-completed-rate"),
    statPending: document.getElementById("stat-pending"),

    // Add Todo
    addTodoForm: document.getElementById("add-todo-form"),
    todoTitleInput: document.getElementById("todo-title-input"),
    todoPrioritySelect: document.getElementById("todo-priority-select"),
    todoInputError: document.getElementById("todo-input-error"),
    btnAddTodo: document.getElementById("btn-add-todo"),

    // List & Filters
    filterTabs: document.querySelectorAll(".filter-tab"),
    navItems: document.querySelectorAll(".sidebar-nav .nav-item"),
    todoSearchInput: document.getElementById("todo-search-input"),
    todosSkeleton: document.getElementById("todos-skeleton"),
    todosList: document.getElementById("todos-list"),
    emptyState: document.getElementById("empty-state"),
    emptyTitle: document.getElementById("empty-title"),
    emptySubtitle: document.getElementById("empty-subtitle"),

    // Confirmation Modal
    confirmModal: document.getElementById("confirm-modal"),
    modalBtnCancel: document.getElementById("modal-btn-cancel"),
    modalBtnConfirm: document.getElementById("modal-btn-confirm"),

    // Activity Controls & Displays
    statActivityTotal: document.getElementById("stat-activity-total"),
    statActivitySuccessRate: document.getElementById("stat-activity-success-rate"),
    statActivitySuccessSub: document.getElementById("stat-activity-success-sub"),
    statCurrentBrowser: document.getElementById("stat-current-browser"),
    statCurrentOs: document.getElementById("stat-current-os"),
    btnRefreshActivity: document.getElementById("btn-refresh-activity"),
    activityMethodTabs: document.querySelectorAll("#activity-method-tabs .filter-tab"),
    activitySearchInput: document.getElementById("activity-search-input"),
    activitySkeleton: document.getElementById("activity-skeleton"),
    activityList: document.getElementById("activity-list"),
    activityEmptyState: document.getElementById("activity-empty-state"),
    activityEmptyTitle: document.getElementById("activity-empty-title"),
    activityEmptySubtitle: document.getElementById("activity-empty-subtitle"),
  };

  // ========================================================
  // API Fetch Utility (Supports same-origin cookies)
  // ========================================================
  async function apiFetch(endpoint, options = {}) {
    const config = {
      credentials: "same-origin", // Automatically include session & auth cookies
      headers: {
        "Accept": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    };

    if (config.body && typeof config.body === "object") {
      config.headers["Content-Type"] = "application/json";
      config.body = JSON.stringify(config.body);
    }

    try {
      const response = await fetch(endpoint, config);
      let data = null;

      const contentType = response.headers.get("content-type");
      if (contentType && contentType.includes("application/json")) {
        data = await response.json();
      } else {
        const text = await response.text();
        data = { message: text };
      }

      return {
        ok: response.ok,
        status: response.status,
        data,
      };
    } catch (err) {
      return {
        ok: false,
        status: 0,
        data: { message: "Network connection error. Please check your connection." },
      };
    }
  }

  // ========================================================
  // Toast Notifications
  // ========================================================
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;

    let iconSvg = "";
    if (type === "success") {
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
          <polyline points="22 4 12 14.01 9 11.01"/>
        </svg>`;
    } else if (type === "error") {
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="8" x2="12" y2="12"/>
          <line x1="12" y1="16" x2="12.01" y2="16"/>
        </svg>`;
    } else {
      iconSvg = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="12" y1="16" x2="12" y2="12"/>
          <line x1="12" y1="8" x2="12.01" y2="8"/>
        </svg>`;
    }

    toast.innerHTML = `
      <span class="toast-icon">${iconSvg}</span>
      <span class="toast-message"></span>
      <button type="button" class="toast-close-btn" aria-label="Dismiss notification">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>
    `;

    // Safe text injection against XSS
    toast.querySelector(".toast-message").textContent = message;

    const closeBtn = toast.querySelector(".toast-close-btn");
    const removeToast = () => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(40px)";
      setTimeout(() => {
        if (toast.parentElement) toast.remove();
      }, 200);
    };

    closeBtn.addEventListener("click", removeToast);
    elements.toastContainer.appendChild(toast);

    setTimeout(removeToast, 3800);
  }

  // ========================================================
  // View Navigation & Switching
  // ========================================================
  function showAuthView(activeTab = "register") {
    elements.dashboardView.classList.add("hidden");
    elements.authView.classList.remove("hidden");
    elements.initialLoader.classList.add("hidden");

    if (activeTab === "login") {
      switchAuthTab("login");
    } else {
      switchAuthTab("register");
    }
  }

  function showDashboardView() {
    elements.authView.classList.add("hidden");
    elements.dashboardView.classList.remove("hidden");
    elements.initialLoader.classList.add("hidden");

    updateUserProfileUI();
    detectClientEnvironment();
    switchDashboardView("tasks");
    fetchTodos();
    fetchActivityLogs(false);
  }

  function updateHeaderDate() {
    if (!elements.headerDate) return;
    const now = new Date();
    elements.headerDate.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }

  function formatRelativeTime(dateString) {
    if (!dateString) return "Recently";
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);

    if (diffSec < 45) return "Just now";
    if (diffMin < 60) return `${diffMin} min${diffMin > 1 ? "s" : ""} ago`;
    if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function parseUserAgent(ua) {
    if (!ua || ua === "unknown") {
      return { browser: "Web Client", os: "Unknown Device", summary: "Web Client" };
    }

    let browser = "Web Client";
    let os = "Desktop";

    // Operating System
    if (/windows nt 10/i.test(ua)) os = "Windows 10/11";
    else if (/windows/i.test(ua)) os = "Windows";
    else if (/macintosh|mac os x/i.test(ua)) os = "macOS";
    else if (/android/i.test(ua)) os = "Android";
    else if (/iphone|ipad|ipod/i.test(ua)) os = "iOS";
    else if (/linux/i.test(ua)) os = "Linux";

    // Browser / Client
    if (/edg\//i.test(ua)) browser = "Microsoft Edge";
    else if (/chrome|crios/i.test(ua) && !/opr|opera/i.test(ua)) browser = "Google Chrome";
    else if (/firefox|fxios/i.test(ua)) browser = "Mozilla Firefox";
    else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = "Apple Safari";
    else if (/opr|opera/i.test(ua)) browser = "Opera";
    else if (/curl/i.test(ua)) browser = "cURL";
    else if (/postman/i.test(ua)) browser = "Postman";
    else if (/node/i.test(ua)) browser = "Node.js HTTP";

    return {
      browser,
      os,
      summary: `${browser} • ${os}`,
    };
  }

  function detectClientEnvironment() {
    const parsed = parseUserAgent(navigator.userAgent || "");
    if (elements.statCurrentBrowser) {
      elements.statCurrentBrowser.textContent = parsed.browser;
    }
    if (elements.statCurrentOs) {
      elements.statCurrentOs.textContent = `${parsed.os} (Current Device)`;
    }
  }

  function switchDashboardView(viewName) {
    state.currentView = viewName;

    elements.navItems.forEach((nav) => {
      const targetView = nav.dataset.view || "tasks";
      if (targetView === viewName && (viewName === "activity" || nav.getAttribute("href") === "#dashboard")) {
        nav.classList.add("active");
      } else if (targetView !== viewName) {
        nav.classList.remove("active");
      }
    });

    if (viewName === "activity") {
      elements.tasksView.classList.add("hidden");
      elements.activityView.classList.remove("hidden");
      if (elements.headerTitle) elements.headerTitle.textContent = "My Activity & Logs";
      if (elements.headerSubtitle) {
        elements.headerSubtitle.textContent = `Activity and User-Agent history for ${state.currentUser?.name || "your account"}`;
      }
      fetchActivityLogs(true);
    } else {
      elements.activityView.classList.add("hidden");
      elements.tasksView.classList.remove("hidden");
      if (elements.headerTitle) elements.headerTitle.textContent = "Task Overview";
      updateHeaderDate();
      renderTodos();
    }
  }

  function switchAuthTab(tab) {
    clearFormErrors();
    if (tab === "login") {
      elements.tabLoginBtn.classList.add("active");
      elements.tabLoginBtn.setAttribute("aria-selected", "true");
      elements.tabRegisterBtn.classList.remove("active");
      elements.tabRegisterBtn.setAttribute("aria-selected", "false");
      elements.loginForm.classList.remove("hidden");
      elements.registerForm.classList.add("hidden");
      elements.loginEmail.focus();
    } else {
      elements.tabRegisterBtn.classList.add("active");
      elements.tabRegisterBtn.setAttribute("aria-selected", "true");
      elements.tabLoginBtn.classList.remove("active");
      elements.tabLoginBtn.setAttribute("aria-selected", "false");
      elements.registerForm.classList.remove("hidden");
      elements.loginForm.classList.add("hidden");
      elements.regName.focus();
    }
  }

  function clearFormErrors() {
    elements.regNameError.textContent = "";
    elements.regEmailError.textContent = "";
    elements.regPasswordError.textContent = "";
    elements.regConfirmError.textContent = "";
    elements.loginEmailError.textContent = "";
    elements.loginPasswordError.textContent = "";
  }

  function setButtonLoading(button, isLoading, text) {
    const textEl = button.querySelector(".btn-text");
    const spinnerEl = button.querySelector(".btn-spinner");
    if (isLoading) {
      button.disabled = true;
      if (textEl) textEl.textContent = text || "Please wait...";
      if (spinnerEl) spinnerEl.classList.remove("hidden");
    } else {
      button.disabled = false;
      if (textEl) textEl.textContent = text || button.dataset.defaultText || "Submit";
      if (spinnerEl) spinnerEl.classList.add("hidden");
    }
  }

  // ========================================================
  // Authentication Handlers
  // ========================================================
  async function checkSession() {
    const res = await apiFetch("/api/auth/me");
    if (res.ok && res.data && res.data.data && res.data.data.user) {
      state.currentUser = res.data.data.user;
      showDashboardView();
    } else {
      state.currentUser = null;
      showAuthView("register");
    }
  }

  async function handleRegister(e) {
    e.preventDefault();
    clearFormErrors();

    const name = elements.regName.value.trim();
    const email = elements.regEmail.value.trim();
    const password = elements.regPassword.value;
    const confirmPassword = elements.regConfirmPassword.value;

    let hasError = false;

    if (!name) {
      elements.regNameError.textContent = "Please enter your full name.";
      hasError = true;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      elements.regEmailError.textContent = "Please enter a valid email address.";
      hasError = true;
    }

    if (!password || password.length < 6) {
      elements.regPasswordError.textContent = "Password must be at least 6 characters long.";
      hasError = true;
    }

    if (password !== confirmPassword) {
      elements.regConfirmError.textContent = "Passwords do not match.";
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(elements.btnSubmitRegister, true, "Creating Account...");

    const res = await apiFetch("/api/auth/register", {
      method: "POST",
      body: { name, email, password },
    });

    setButtonLoading(elements.btnSubmitRegister, false, "Create Free Account");

    if (res.ok) {
      showToast("Account created successfully! Please sign in.", "success");
      elements.registerForm.reset();
      elements.loginEmail.value = email;
      switchAuthTab("login");
    } else {
      if (res.status === 409) {
        elements.regEmailError.textContent = "An account with this email already exists.";
        showToast("Email already exists. Try signing in.", "error");
      } else {
        const msg = res.data?.message || "Registration failed. Please check your information.";
        showToast(msg, "error");
      }
    }
  }

  async function handleLogin(e) {
    e.preventDefault();
    clearFormErrors();

    const email = elements.loginEmail.value.trim();
    const password = elements.loginPassword.value;

    let hasError = false;

    if (!email) {
      elements.loginEmailError.textContent = "Please enter your email.";
      hasError = true;
    }

    if (!password) {
      elements.loginPasswordError.textContent = "Please enter your password.";
      hasError = true;
    }

    if (hasError) return;

    setButtonLoading(elements.btnSubmitLogin, true, "Signing in...");

    const res = await apiFetch("/api/auth/login", {
      method: "POST",
      body: { email, password },
    });

    setButtonLoading(elements.btnSubmitLogin, false, "Sign In");

    if (res.ok && res.data?.data?.user) {
      state.currentUser = res.data.data.user;
      showToast("Login successful! Welcome back.", "success");
      elements.loginForm.reset();
      showDashboardView();
    } else {
      const msg = res.data?.message || "Invalid email or password.";
      elements.loginPasswordError.textContent = msg;
      showToast(msg, "error");
    }
  }

  async function handleLogout() {
    await apiFetch("/api/auth/logout", { method: "POST" });
    state.currentUser = null;
    state.todos = [];
    showToast("You have been logged out.", "info");
    showAuthView("login");
  }

  function updateUserProfileUI() {
    if (!state.currentUser) return;
    const name = state.currentUser.name || "User";
    const email = state.currentUser.email || "";
    const initials = name
      .split(" ")
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();

    elements.userName.textContent = name;
    elements.userEmail.textContent = email;
    elements.userAvatar.textContent = initials;

    elements.headerUserName.textContent = name;
    elements.headerUserAvatar.textContent = initials;

    updateHeaderDate();
  }

  // ========================================================
  // Todo Handlers & Rendering
  // ========================================================
  async function fetchTodos() {
    elements.todosSkeleton.classList.remove("hidden");
    elements.emptyState.classList.add("hidden");
    elements.todosList.innerHTML = "";

    const res = await apiFetch("/api/todos");

    elements.todosSkeleton.classList.add("hidden");

    if (res.ok && Array.isArray(res.data?.data)) {
      // Filter for the current authenticated user's tasks
      state.todos = res.data.data.filter(
        (t) => !t.userId || t.userId === state.currentUser?.id
      );
      updateStats();
      renderTodos();
    } else if (res.status === 401) {
      showAuthView("login");
    } else {
      showToast("Unable to load tasks from server.", "error");
    }
  }

  async function handleAddTodo(e) {
    e.preventDefault();
    elements.todoInputError.textContent = "";

    const title = elements.todoTitleInput.value.trim();
    const priority = elements.todoPrioritySelect.value || "medium";

    if (!title) {
      elements.todoInputError.textContent = "Please enter a task title.";
      elements.todoTitleInput.focus();
      return;
    }

    elements.btnAddTodo.disabled = true;

    const res = await apiFetch("/api/todos", {
      method: "POST",
      body: { title, priority },
    });

    elements.btnAddTodo.disabled = false;

    if (res.ok && res.data?.data) {
      state.todos.unshift(res.data.data);
      elements.todoTitleInput.value = "";
      updateStats();
      renderTodos();
      fetchActivityLogs(false);
      showToast("Task added successfully!", "success");
      elements.todoTitleInput.focus();
    } else {
      const msg = res.data?.message || "Failed to add task.";
      elements.todoInputError.textContent = msg;
      showToast(msg, "error");
    }
  }

  async function handleToggleTodo(todoId) {
    const todo = state.todos.find((t) => t.id === todoId);
    if (!todo) return;

    // Optimistic UI update
    todo.completed = !todo.completed;
    updateStats();
    renderTodos();

    const res = await apiFetch(`/api/todos/${todoId}/toggle`, {
      method: "PATCH",
    });

    if (res.ok && res.data?.data) {
      // Sync with server state
      Object.assign(todo, res.data.data);
      updateStats();
      renderTodos();
      fetchActivityLogs(false);
      showToast(
        todo.completed ? "Task marked as completed" : "Task marked as pending",
        "info"
      );
    } else {
      // Revert on failure
      todo.completed = !todo.completed;
      updateStats();
      renderTodos();
      showToast("Failed to update task status.", "error");
    }
  }

  function promptDeleteTodo(todoId) {
    state.deleteCandidateId = todoId;
    elements.confirmModal.classList.remove("hidden");
  }

  function closeConfirmModal() {
    state.deleteCandidateId = null;
    elements.confirmModal.classList.add("hidden");
  }

  async function confirmDeleteTodo() {
    const todoId = state.deleteCandidateId;
    if (!todoId) return;

    elements.modalBtnConfirm.disabled = true;
    elements.modalBtnConfirm.textContent = "Deleting...";

    const res = await apiFetch(`/api/todos/${todoId}`, {
      method: "DELETE",
    });

    elements.modalBtnConfirm.disabled = false;
    elements.modalBtnConfirm.textContent = "Delete";
    closeConfirmModal();

    if (res.ok) {
      state.todos = state.todos.filter((t) => t.id !== todoId);
      updateStats();
      renderTodos();
      fetchActivityLogs(false);
      showToast("Task deleted successfully.", "success");
    } else {
      showToast(res.data?.message || "Failed to delete task.", "error");
    }
  }

  // ========================================================
  // DOM Renderers
  // ========================================================
  function updateStats() {
    const total = state.todos.length;
    const completed = state.todos.filter((t) => t.completed).length;
    const pending = total - completed;
    const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

    elements.statTotal.textContent = total;
    elements.statCompleted.textContent = completed;
    elements.statCompletedRate.textContent = `${rate}% completion rate`;
    elements.statPending.textContent = pending;

    elements.sidebarTaskBadge.textContent = total;
  }

  function renderTodos() {
    const list = elements.todosList;
    list.innerHTML = "";

    const query = state.searchQuery.toLowerCase().trim();

    const filtered = state.todos.filter((todo) => {
      // Status filter
      if (state.activeFilter === "pending" && todo.completed) return false;
      if (state.activeFilter === "completed" && !todo.completed) return false;

      // Search filter
      if (query && !todo.title.toLowerCase().includes(query)) return false;

      return true;
    });

    if (filtered.length === 0) {
      elements.emptyState.classList.remove("hidden");
      if (query) {
        elements.emptyTitle.textContent = "No matching tasks";
        elements.emptySubtitle.textContent = `No tasks matched your search query "${query}".`;
      } else if (state.activeFilter === "completed") {
        elements.emptyTitle.textContent = "No completed tasks yet";
        elements.emptySubtitle.textContent = "Complete a task by clicking its checkbox to see it here.";
      } else if (state.activeFilter === "pending") {
        elements.emptyTitle.textContent = "No pending tasks";
        elements.emptySubtitle.textContent = "Great job! All your tasks are completed.";
      } else {
        elements.emptyTitle.textContent = "No tasks found";
        elements.emptySubtitle.textContent = "You have no tasks scheduled. Type a task title above to get started!";
      }
      return;
    }

    elements.emptyState.classList.add("hidden");

    filtered.forEach((todo) => {
      const li = document.createElement("li");
      li.className = `todo-item ${todo.completed ? "completed" : ""}`;

      // Checkbox container
      const checkboxWrap = document.createElement("div");
      checkboxWrap.className = "todo-checkbox-wrapper";

      const checkBtn = document.createElement("button");
      checkBtn.type = "button";
      checkBtn.className = "todo-checkbox-btn";
      checkBtn.title = todo.completed ? "Mark pending" : "Mark completed";
      checkBtn.setAttribute("aria-label", "Toggle task completion");
      checkBtn.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      `;
      checkBtn.addEventListener("click", () => handleToggleTodo(todo.id));
      checkboxWrap.appendChild(checkBtn);

      // Todo content
      const content = document.createElement("div");
      content.className = "todo-content";

      const title = document.createElement("div");
      title.className = "todo-title";
      title.textContent = todo.title; // Safe against XSS

      const meta = document.createElement("div");
      meta.className = "todo-meta";

      // Formatted date
      const dateSpan = document.createElement("span");
      dateSpan.className = "todo-date";
      const createdDate = todo.createdAt ? new Date(todo.createdAt) : new Date();
      dateSpan.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <polyline points="12 6 12 12 16 14"/>
        </svg>
        ${createdDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
      `;

      // Priority badge
      const priorityBadge = document.createElement("span");
      const priority = (todo.priority || "medium").toLowerCase();
      priorityBadge.className = `priority-badge ${priority}`;
      priorityBadge.textContent = priority;

      // Status badge
      const statusBadge = document.createElement("span");
      statusBadge.className = `status-badge ${todo.completed ? "completed" : "pending"}`;
      statusBadge.textContent = todo.completed ? "Completed" : "Pending";

      meta.appendChild(dateSpan);
      meta.appendChild(priorityBadge);
      meta.appendChild(statusBadge);

      content.appendChild(title);
      content.appendChild(meta);

      // Delete Button
      const deleteBtn = document.createElement("button");
      deleteBtn.type = "button";
      deleteBtn.className = "btn-delete-todo";
      deleteBtn.title = "Delete task";
      deleteBtn.setAttribute("aria-label", "Delete task");
      deleteBtn.innerHTML = `
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M3 6h18"/>
          <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/>
          <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>
        </svg>
      `;
      deleteBtn.addEventListener("click", () => promptDeleteTodo(todo.id));

      li.appendChild(checkboxWrap);
      li.appendChild(content);
      li.appendChild(deleteBtn);

      list.appendChild(li);
    });
  }

  // ========================================================
  // Activity Logs Handlers & Rendering
  // ========================================================
  async function fetchActivityLogs(showLoading = true) {
    if (showLoading) {
      elements.activitySkeleton.classList.remove("hidden");
      elements.activityEmptyState.classList.add("hidden");
      elements.activityList.innerHTML = "";
    }

    const res = await apiFetch("/api/auth/activity");

    if (showLoading) {
      elements.activitySkeleton.classList.add("hidden");
    }

    if (res.ok && Array.isArray(res.data?.data)) {
      state.activityLogs = res.data.data;
      updateActivityStats();
      renderActivityLogs();
    } else if (res.status === 401) {
      showAuthView("login");
    } else {
      if (showLoading) {
        showToast("Unable to load activity logs from server.", "error");
      }
    }
  }

  function updateActivityStats() {
    const total = state.activityLogs.length;
    const successCount = state.activityLogs.filter(
      (l) => l.statusCode >= 200 && l.statusCode < 400
    ).length;
    const successRate = total > 0 ? Math.round((successCount / total) * 100) : 100;

    if (elements.statActivityTotal) {
      elements.statActivityTotal.textContent = total;
    }
    if (elements.sidebarActivityBadge) {
      elements.sidebarActivityBadge.textContent = total;
    }
    if (elements.statActivitySuccessRate) {
      elements.statActivitySuccessRate.textContent = `${successRate}%`;
    }
    if (elements.statActivitySuccessSub) {
      elements.statActivitySuccessSub.textContent = `${successCount} successful of ${total} hits`;
    }
  }

  function renderActivityLogs() {
    const list = elements.activityList;
    if (!list) return;
    list.innerHTML = "";

    const methodFilter = (state.activityFilterMethod || "all").toUpperCase();
    const query = (state.activitySearchQuery || "").toLowerCase().trim();

    const filtered = state.activityLogs.filter((entry) => {
      // Method filter
      if (methodFilter !== "ALL") {
        if (methodFilter === "PATCH") {
          if (entry.method !== "PATCH" && entry.method !== "PUT") return false;
        } else if (entry.method !== methodFilter) {
          return false;
        }
      }

      // Search query filter
      if (query) {
        const urlMatch = entry.url && entry.url.toLowerCase().includes(query);
        const methodMatch = entry.method && entry.method.toLowerCase().includes(query);
        const uaMatch = entry.userAgent && entry.userAgent.toLowerCase().includes(query);
        const ipMatch = entry.ip && entry.ip.toLowerCase().includes(query);
        const statusMatch = entry.statusCode && String(entry.statusCode).includes(query);
        if (!urlMatch && !methodMatch && !uaMatch && !ipMatch && !statusMatch) {
          return false;
        }
      }

      return true;
    });

    if (filtered.length === 0) {
      elements.activityEmptyState.classList.remove("hidden");
      if (query) {
        elements.activityEmptyTitle.textContent = "No matching activity";
        elements.activityEmptySubtitle.textContent = `No requests matched your search query "${query}".`;
      } else if (methodFilter !== "ALL") {
        elements.activityEmptyTitle.textContent = `No ${methodFilter} requests`;
        elements.activityEmptySubtitle.textContent = `No ${methodFilter} operations recorded for your account.`;
      } else {
        elements.activityEmptyTitle.textContent = "No activity logs recorded";
        elements.activityEmptySubtitle.textContent = "Requests hit with your authenticated account will show up here in real time.";
      }
      return;
    }

    elements.activityEmptyState.classList.add("hidden");

    filtered.forEach((entry) => {
      const li = document.createElement("li");
      li.className = "activity-item";

      const methodLower = (entry.method || "get").toLowerCase();
      const code = entry.statusCode || 200;
      const statusClass =
        code >= 500
          ? "status-5xx"
          : code >= 400
          ? "status-4xx"
          : code >= 300
          ? "status-3xx"
          : "status-2xx";

      const parsedUA = parseUserAgent(entry.userAgent);

      // Line 1: Method badge, Route URL, Status code, Duration
      const line1 = document.createElement("div");
      line1.className = "activity-line-1";

      const methodBadge = document.createElement("span");
      methodBadge.className = `method-badge ${methodLower}`;
      methodBadge.textContent = entry.method || "GET";

      const urlEl = document.createElement("code");
      urlEl.className = "activity-url";
      urlEl.textContent = entry.url || "/";

      const statusPill = document.createElement("span");
      statusPill.className = `status-pill ${statusClass}`;
      statusPill.textContent = `${code} ${code < 400 ? "OK" : "ERR"}`;

      const durationBadge = document.createElement("span");
      durationBadge.className = "duration-badge";
      durationBadge.textContent = `${entry.durationMs ?? 0}ms`;

      line1.appendChild(methodBadge);
      line1.appendChild(urlEl);
      line1.appendChild(statusPill);
      line1.appendChild(durationBadge);

      // Line 2: User Agent chip, IP, Timestamp
      const line2 = document.createElement("div");
      line2.className = "activity-line-2";

      const uaChip = document.createElement("span");
      uaChip.className = "ua-chip";
      uaChip.title = `Full User-Agent: ${entry.userAgent || "Unknown"}`;
      uaChip.innerHTML = `
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="10"/>
          <line x1="2" x2="22" y1="12" y2="12"/>
          <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
        </svg>
      `;
      const uaSummarySpan = document.createElement("span");
      uaSummarySpan.className = "ua-summary";
      uaSummarySpan.textContent = parsedUA.summary;
      uaChip.appendChild(uaSummarySpan);

      const ipSpan = document.createElement("span");
      ipSpan.className = "activity-ip";
      ipSpan.textContent = `IP: ${entry.ip || "127.0.0.1"}`;

      const timeSpan = document.createElement("span");
      timeSpan.className = "activity-time";
      timeSpan.title = entry.timestamp ? new Date(entry.timestamp).toLocaleString() : "";
      timeSpan.textContent = formatRelativeTime(entry.timestamp);

      line2.appendChild(uaChip);
      line2.appendChild(ipSpan);
      line2.appendChild(timeSpan);

      // Line 3: Raw user-agent string tag
      const rawWrap = document.createElement("div");
      rawWrap.className = "ua-raw-toggle-wrap";
      const rawSpan = document.createElement("span");
      rawSpan.className = "ua-raw";
      rawSpan.textContent = `User-Agent: ${entry.userAgent || "unknown"}`;
      rawWrap.appendChild(rawSpan);

      li.appendChild(line1);
      li.appendChild(line2);
      li.appendChild(rawWrap);

      list.appendChild(li);
    });
  }

  // ========================================================
  // Event Listeners & Binding
  // ========================================================
  function bindEvents() {
    // Auth Tab switching
    elements.tabRegisterBtn.addEventListener("click", () => switchAuthTab("register"));
    elements.tabLoginBtn.addEventListener("click", () => switchAuthTab("login"));
    elements.linkToLogin.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthTab("login");
    });
    elements.linkToRegister.addEventListener("click", (e) => {
      e.preventDefault();
      switchAuthTab("register");
    });

    // Forms submission
    elements.registerForm.addEventListener("submit", handleRegister);
    elements.loginForm.addEventListener("submit", handleLogin);
    elements.addTodoForm.addEventListener("submit", handleAddTodo);

    // Logout
    elements.sidebarLogoutBtn.addEventListener("click", handleLogout);
    elements.headerLogoutBtn.addEventListener("click", handleLogout);

    // Password visibility toggles
    document.querySelectorAll(".btn-toggle-pw").forEach((btn) => {
      btn.addEventListener("click", () => {
        const inputId = btn.dataset.target;
        const input = document.getElementById(inputId);
        if (!input) return;
        const isPassword = input.type === "password";
        input.type = isPassword ? "text" : "password";

        btn.innerHTML = isPassword
          ? `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24"/>
               <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68"/>
               <path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61"/>
               <line x1="2" x2="22" y1="2" y2="22"/>
             </svg>`
          : `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
               <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
               <circle cx="12" cy="12" r="3"/>
             </svg>`;
      });
    });

    // Mobile Sidebar Drawer
    const openSidebar = () => {
      elements.sidebar.classList.add("open");
      elements.sidebarBackdrop.classList.add("active");
    };

    const closeSidebar = () => {
      elements.sidebar.classList.remove("open");
      elements.sidebarBackdrop.classList.remove("active");
    };

    elements.sidebarToggleBtn.addEventListener("click", openSidebar);
    elements.sidebarCloseBtn.addEventListener("click", closeSidebar);
    elements.sidebarBackdrop.addEventListener("click", closeSidebar);

    // List Toolbar Filter Tabs
    elements.filterTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        elements.filterTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.activeFilter = tab.dataset.filter || "all";
        renderTodos();
      });
    });

    // Sidebar Nav items (Syncs with filter and views)
    elements.navItems.forEach((nav) => {
      nav.addEventListener("click", (e) => {
        e.preventDefault();
        elements.navItems.forEach((n) => n.classList.remove("active"));
        nav.classList.add("active");

        const targetView = nav.dataset.view || "tasks";
        if (targetView === "activity") {
          switchDashboardView("activity");
        } else {
          switchDashboardView("tasks");
          const targetFilter = nav.dataset.filter || "all";
          state.activeFilter = targetFilter;

          elements.filterTabs.forEach((tab) => {
            if (tab.dataset.filter === targetFilter) {
              tab.classList.add("active");
            } else {
              tab.classList.remove("active");
            }
          });

          renderTodos();
        }

        closeSidebar();
      });
    });

    // Activity Method filter tabs
    elements.activityMethodTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        elements.activityMethodTabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        state.activityFilterMethod = tab.dataset.method || "all";
        renderActivityLogs();
      });
    });

    // Activity Search
    if (elements.activitySearchInput) {
      elements.activitySearchInput.addEventListener("input", (e) => {
        state.activitySearchQuery = e.target.value;
        renderActivityLogs();
      });
    }

    // Refresh Activity Button
    if (elements.btnRefreshActivity) {
      elements.btnRefreshActivity.addEventListener("click", () => {
        fetchActivityLogs(true);
        showToast("Activity logs refreshed.", "info");
      });
    }

    // Search Input
    elements.todoSearchInput.addEventListener("input", (e) => {
      state.searchQuery = e.target.value;
      renderTodos();
    });

    // Confirmation Modal Actions
    elements.modalBtnCancel.addEventListener("click", closeConfirmModal);
    elements.modalBtnConfirm.addEventListener("click", confirmDeleteTodo);
    elements.confirmModal.addEventListener("click", (e) => {
      if (e.target === elements.confirmModal) {
        closeConfirmModal();
      }
    });

    // Close modal on Escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && !elements.confirmModal.classList.contains("hidden")) {
        closeConfirmModal();
      }
    });
  }

  // ========================================================
  // Initialize Application
  // ========================================================
  function init() {
    bindEvents();
    checkSession();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
