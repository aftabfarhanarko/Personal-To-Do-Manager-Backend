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
    todos: [],
    activeFilter: "all", // "all" | "pending" | "completed"
    searchQuery: "",
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
    fetchTodos();
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

    // Header date display
    const now = new Date();
    const dateFormatted = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    elements.headerDate.textContent = dateFormatted;
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

    // Sidebar Nav items (Syncs with filter)
    elements.navItems.forEach((nav) => {
      nav.addEventListener("click", (e) => {
        e.preventDefault();
        elements.navItems.forEach((n) => n.classList.remove("active"));
        nav.classList.add("active");

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
        closeSidebar();
      });
    });

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
