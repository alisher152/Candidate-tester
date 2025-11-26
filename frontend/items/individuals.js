// items/individuals.js
console.log("Individuals page loaded");

// 🔧 Утилиты
function validateIIN(code) {
  if (!code) return "ИИН обязателен для заполнения";
  if (code.length !== 12) return "ИИН должен содержать ровно 12 цифр";
  if (!/^\d+$/.test(code)) return "ИИН должен содержать только цифры";
  return null;
}

function validateField(value, fieldName, minLength = 3) {
  if (!value) return `${fieldName} обязателен для заполнения`;
  if (value.length < minLength)
    return `${fieldName} должен содержать минимум ${minLength} символа`;
  if (!/^[a-zA-Zа-яА-ЯёЁ0-9-\s]+$/.test(value))
    return `${fieldName} содержит недопустимые символы`;
  return null;
}

function formatDate(dateString) {
  const date = new Date(dateString);
  return (
    date.toLocaleDateString("ru-RU") +
    " " +
    date.toLocaleTimeString("ru-RU", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
}

// Debounce функция
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// 🔧 Пагинация
let currentPage = 1;
const pageSize = 5;
let totalItems = 0;
let currentData = [];

// 🔧 Поиск
let currentSearchTerm = "";

// 🔧 Сортировка
let sortField = "insertdate";
let sortDirection = "desc";

// 🔥 ОСНОВНАЯ ФУНКЦИЯ СОЗДАНИЯ СТРАНИЦЫ - ДОЛЖНА БЫТЬ ГЛОБАЛЬНОЙ
function createIndividualsPage() {
  console.log("Инициализация страницы физлиц...");

  const pageContainer = document.createElement("div");
  pageContainer.className = "individuals-page";
  pageContainer.style.cssText = `
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
  `;

  // Заголовок
  const title = document.createElement("h2");
  title.textContent = "📋 Управление физическими лицами";
  title.style.cssText = `
    color: #2c3e50;
    margin-bottom: 20px;
    font-size: 24px;
    font-weight: 600;
  `;

  // 🔍 ПОИСК ПО ИИН И ФИО
  const searchSection = document.createElement("div");
  searchSection.style.cssText = `
    margin-bottom: 20px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;

  searchSection.innerHTML = `
    <h4 style="margin: 0 0 15px 0; color: #2c3e50; font-size: 16px; font-weight: 600;">🔍 Поиск по ИИН или ФИО</h4>
    <div style="display: flex; gap: 10px; align-items: end;">
      <div style="flex: 1;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Введите ИИН, фамилию, имя или отчество</label>
        <input type="text" id="searchInput" placeholder="Начните вводить для поиска..." 
               style="width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 13px;">
      </div>
      <button id="clearSearchBtn" style="background: #95a5a6; color: white; padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; height: fit-content;">
        Очистить
      </button>
    </div>
    <div id="searchResult" style="margin-top: 15px;"></div>
  `;

  // Форма добавления
  const formSection = document.createElement("div");
  formSection.style.cssText = `
    margin-bottom: 30px;
    padding: 20px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;

  formSection.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 18px; font-weight: 600;">Добавить Физическое Лицо</h3>
    <form id="individualForm">
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">ИИН (12 цифр):</label>
        <input type="text" id="code" maxlength="12" required 
               style="width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 13px;">
        <div id="codeError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Фамилия:</label>
        <input type="text" id="surname" required 
               style="width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 13px;">
        <div id="surnameError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Имя:</label>
        <input type="text" id="name" required 
               style="width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 13px;">
        <div id="nameError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      <div style="margin-bottom: 20px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">Отчество:</label>
        <input type="text" id="patronymic" 
               style="width: 100%; padding: 8px 12px; border: 1px solid #bdc3c7; border-radius: 4px; font-size: 13px;">
        <div id="patronymicError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      <button type="submit" style="background: #27ae60; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">
        Добавить Физическое Лицо
      </button>
      <div id="formMessage" style="margin-top: 10px; font-size: 13px;"></div>
    </form>
  `;

  // Панель управления таблицей
  const controlsSection = document.createElement("div");
  controlsSection.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 15px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  `;

  controlsSection.innerHTML = `
    <h3 style="margin: 0; color: #2c3e50; font-size: 18px; font-weight: 600;">Список физлиц</h3>
    <div style="display: flex; gap: 10px; align-items: center;">
      <label style="display: flex; align-items: center; gap: 5px; font-size: 13px; color: #2c3e50;">
        <input type="checkbox" id="showDeleted">
        Показать удаленные
      </label>
      <button id="refreshBtn" style="background: #3498db; color: white; padding: 6px 12px; border: none; border-radius: 4px; cursor: pointer; font-size: 12px;">
        Обновить
      </button>
    </div>
  `;

  // Пагинация
  const paginationSection = document.createElement("div");
  paginationSection.id = "paginationSection";
  paginationSection.style.cssText = `
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    padding: 15px;
    background: white;
    border-radius: 8px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    display: none;
  `;

  // Таблица физлиц
  const tableSection = document.createElement("div");
  tableSection.style.marginTop = "10px";

  const loadingDiv = document.createElement("div");
  loadingDiv.id = "individualsLoading";
  loadingDiv.style.cssText = `
    padding: 20px;
    text-align: center;
    color: #7f8c8d;
    font-size: 14px;
  `;
  loadingDiv.textContent = "Загрузка данных...";

  const table = document.createElement("table");
  table.id = "individualsTable";
  table.style.cssText = `
    width: 100%;
    border-collapse: collapse;
    background: white;
    box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    border-radius: 8px;
    overflow: hidden;
    display: none;
  `;

  table.innerHTML = `
    <thead>
      <tr>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none; cursor: pointer;" data-sort="code">
          ИИН ↕
        </th>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none; cursor: pointer;" data-sort="represent">
          ФИО ↕
        </th>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none;">Фамилия</th>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none;">Имя</th>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none;">Отчество</th>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none; cursor: pointer;" data-sort="insertdate">
          Дата создания ↕
        </th>
        <th style="background: #2c3e50; color: white; padding: 12px 8px; font-weight: 600; font-size: 13px; text-align: left; border: none; width: 150px;">Действия</th>
      </tr>
    </thead>
    <tbody id="individualsBody"></tbody>
  `;

  tableSection.appendChild(loadingDiv);
  tableSection.appendChild(table);

  // Собираем страницу
  pageContainer.appendChild(title);
  pageContainer.appendChild(searchSection);
  pageContainer.appendChild(formSection);
  pageContainer.appendChild(controlsSection);
  pageContainer.appendChild(paginationSection);
  pageContainer.appendChild(tableSection);

  console.log("Страница физлиц создана");
  return pageContainer;
}

// Функционал для работы с физлицами (вызывается ПОСЛЕ добавления в DOM)
function initIndividualsFunctionality() {
  console.log("Инициализация функционала физлиц...");

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
      initializeAfterDOMReady();
    });
  } else {
    initializeAfterDOMReady();
  }
}

function initializeAfterDOMReady() {
  console.log("DOM готов, инициализируем функционал...");

  const form = document.getElementById("individualForm");
  const table = document.getElementById("individualsTable");

  console.log("Найдены элементы:", {
    form: !!form,
    table: !!table,
    searchInput: !!document.getElementById("searchInput"),
    codeInput: !!document.getElementById("code"),
  });

  if (form && table) {
    console.log("✅ Все элементы найдены, запускаем функционал...");
    loadIndividuals();
    setupForm();
    setupSearch();
    setupControls();
    setupSorting();
  } else {
    console.error(
      "❌ Критические элементы не найдены в DOM, повторяем через 500мс"
    );
    setTimeout(initializeAfterDOMReady, 500);
  }
}

// 🔧 НАСТРОЙКА ЭЛЕМЕНТОВ УПРАВЛЕНИЯ
function setupControls() {
  const refreshBtn = document.getElementById("refreshBtn");
  const showDeletedCheckbox = document.getElementById("showDeleted");

  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      currentPage = 1;
      loadIndividuals();
    });
  }

  if (showDeletedCheckbox) {
    showDeletedCheckbox.addEventListener("change", () => {
      currentPage = 1;
      loadIndividuals();
    });
  }
}

// 🔄 НАСТРОЙКА СОРТИРОВКИ
function setupSorting() {
  const sortHeaders = document.querySelectorAll("th[data-sort]");
  sortHeaders.forEach((header) => {
    header.addEventListener("click", () => {
      const field = header.getAttribute("data-sort");
      sortTable(field);
    });
  });
}

// 🔍 НАСТРОЙКА ПОИСКА
function setupSearch() {
  const clearSearchBtn = document.getElementById("clearSearchBtn");
  const searchInput = document.getElementById("searchInput");
  const searchResult = document.getElementById("searchResult");

  if (!searchInput || !searchResult) {
    console.error("❌ Элементы поиска не найдены");
    return;
  }

  console.log("✅ Поиск инициализирован");

  // Debounce поиск по мере ввода
  const debouncedSearch = debounce(async (searchTerm) => {
    if (searchTerm.length >= 2) {
      currentSearchTerm = searchTerm;
      currentPage = 1;
      await loadIndividuals();
    } else if (searchTerm.length === 0) {
      currentSearchTerm = "";
      currentPage = 1;
      await loadIndividuals();
      searchResult.innerHTML = "";
    }
  }, 500);

  searchInput.addEventListener("input", (e) => {
    const searchTerm = e.target.value.trim();
    debouncedSearch(searchTerm);
  });

  clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    currentSearchTerm = "";
    currentPage = 1;
    searchResult.innerHTML = "";
    loadIndividuals();
  });
}

// 📊 ЗАГРУЗКА ДАННЫХ
async function loadIndividuals() {
  try {
    const loadingDiv = document.getElementById("individualsLoading");
    const table = document.getElementById("individualsTable");
    const tbody = document.getElementById("individualsBody");

    if (!loadingDiv || !table || !tbody) {
      console.error("❌ Элементы таблицы не найдены в DOM");
      return;
    }

    console.log("📥 Начинаем загрузку данных...");

    // Принудительно показываем загрузку
    loadingDiv.style.display = "block";
    loadingDiv.textContent = "Загрузка данных...";
    table.style.display = "none";
    tbody.innerHTML = ""; // Очищаем таблицу

    // Формируем URL с параметрами
    const params = new URLSearchParams();
    const showDeleted =
      document.getElementById("showDeleted")?.checked || false;

    if (showDeleted) params.append("deleted", "true");
    if (currentSearchTerm) params.append("search", currentSearchTerm);
    params.append("page", currentPage);
    params.append("limit", pageSize);
    params.append("_t", Date.now());

    const url = `/api/individuals?${params.toString()}`;
    console.log("🌐 Запрос к:", url);

    const response = await fetch(url);
    console.log("📨 Ответ получен, статус:", response.status);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Тело ошибки:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("📊 Результат API:", result);

    if (result.success) {
      currentData = result.data;
      totalItems = result.pagination?.total || result.data.length;

      console.log("✅ Данные получены:", currentData);

      sortData();
      renderTable();
      renderPagination();

      loadingDiv.style.display = "none";
      table.style.display = "table";

      console.log("🎉 Таблица должна быть обновлена");
    } else {
      console.error("❌ Ошибка в ответе API:", result.error);
      loadingDiv.textContent =
        "Ошибка загрузки: " + (result.error || "Неизвестная ошибка");
    }
  } catch (error) {
    console.error("❌ Ошибка загрузки:", error);
    const loadingDiv = document.getElementById("individualsLoading");
    if (loadingDiv) {
      loadingDiv.textContent = "Ошибка загрузки: " + error.message;
    }
  }
}

// 📄 ПАГИНАЦИЯ
function renderPagination() {
  const paginationSection = document.getElementById("paginationSection");
  if (!paginationSection) return;

  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalPages <= 1) {
    paginationSection.style.display = "none";
    return;
  }

  paginationSection.style.display = "flex";
  paginationSection.innerHTML = `
    <div style="font-size: 13px; color: #2c3e50;">
      Показано ${(currentPage - 1) * pageSize + 1}-${Math.min(
    currentPage * pageSize,
    totalItems
  )} из ${totalItems}
    </div>
    <div style="display: flex; gap: 5px; align-items: center;">
      <button id="prevPage" ${currentPage === 1 ? "disabled" : ""} 
        style="padding: 6px 12px; border: 1px solid #bdc3c7; background: ${
          currentPage === 1 ? "#ecf0f1" : "white"
        }; color: ${
    currentPage === 1 ? "#95a5a6" : "#2c3e50"
  }; border-radius: 4px; cursor: ${
    currentPage === 1 ? "not-allowed" : "pointer"
  }; font-size: 12px;">
        ← Назад
      </button>
      <span style="font-size: 13px; color: #2c3e50; padding: 0 10px;">
        Страница ${currentPage} из ${totalPages}
      </span>
      <button id="nextPage" ${currentPage === totalPages ? "disabled" : ""}
        style="padding: 6px 12px; border: 1px solid #bdc3c7; background: ${
          currentPage === totalPages ? "#ecf0f1" : "white"
        }; color: ${
    currentPage === totalPages ? "#95a5a6" : "#2c3e50"
  }; border-radius: 4px; cursor: ${
    currentPage === totalPages ? "not-allowed" : "pointer"
  }; font-size: 12px;">
        Вперед →
      </button>
    </div>
  `;

  // Обработчики пагинации
  document.getElementById("prevPage")?.addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      loadIndividuals();
    }
  });

  document.getElementById("nextPage")?.addEventListener("click", () => {
    if (currentPage < totalPages) {
      currentPage++;
      loadIndividuals();
    }
  });
}

// 🔄 СОРТИРОВКА ДАННЫХ
function sortTable(field) {
  if (sortField === field) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortField = field;
    sortDirection = "asc";
  }
  sortData();
  renderTable();
}

function sortData() {
  currentData.sort((a, b) => {
    let aValue = a[`cat2_${sortField}`];
    let bValue = b[`cat2_${sortField}`];

    if (sortField === "insertdate") {
      aValue = new Date(aValue);
      bValue = new Date(bValue);
    }

    if (aValue < bValue) return sortDirection === "asc" ? -1 : 1;
    if (aValue > bValue) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
}

// 🎨 ОТРИСОВКА ТАБЛИЦЫ
function renderTable() {
  const tbody = document.getElementById("individualsBody");
  if (!tbody) {
    console.error("❌ tbody не найден!");
    return;
  }

  console.log("🎨 renderTable вызван, данные:", currentData);

  if (currentData.length === 0) {
    console.log("📭 Нет данных для отображения");
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 30px; color: #7f8c8d; font-style: italic;">
          ${
            currentSearchTerm
              ? "По вашему запросу ничего не найдено"
              : "Нет данных для отображения"
          }
        </td>
      </tr>
    `;
  } else {
    console.log("📊 Отрисовываем", currentData.length, "записей");

    const tableHTML = currentData
      .map(
        (individual) => `
      <tr style="transition: background-color 0.2s;" 
          onmouseenter="this.style.backgroundColor='#f8f9fa'" 
          onmouseleave="this.style.backgroundColor=''">
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px; font-size: 13px; font-family: 'Courier New', monospace;">
          ${individual.cat2_code}
        </td>
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px; font-size: 13px; font-weight: 500;">
          ${individual.cat2_represent}
        </td>
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px; font-size: 13px;">
          ${individual.cat2_surname}
        </td>
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px; font-size: 13px;">
          ${individual.cat2_name}
        </td>
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px; font-size: 13px;">
          ${individual.cat2_patronymic || "-"}
        </td>
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px; font-size: 13px; color: #7f8c8d;">
          ${formatDate(individual.cat2_insertdate)}
          ${
            individual.cat2_updatedate !== individual.cat2_insertdate
              ? `<br><small style="color: #3498db;">изм: ${formatDate(
                  individual.cat2_updatedate
                )}</small>`
              : ""
          }
        </td>
        <td style="border-bottom: 1px solid #ecf0f1; padding: 10px 8px;">
          <div style="display: flex; gap: 5px;">
            <button onclick="openEditModal('${individual.cat2_uuid}')" 
                    style="background: #3498db; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
              ✏️
            </button>
            ${
              individual.cat2_deleted
                ? `<button onclick="restoreIndividual('${individual.cat2_uuid}')" style="background: #27ae60; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                   ↩️
                 </button>`
                : `<button onclick="deleteIndividual('${individual.cat2_uuid}')" style="background: #e74c3c; color: white; padding: 5px 10px; border: none; border-radius: 3px; cursor: pointer; font-size: 12px;">
                   🗑️
                 </button>`
            }
          </div>
        </td>
      </tr>
    `
      )
      .join("");

    console.log("📝 HTML таблицы сгенерирован");
    tbody.innerHTML = tableHTML;
    console.log("✅ Таблица отрисована");
  }
}

// 🗑️ SOFT DELETE ФИЗЛИЦА
async function deleteIndividual(uuid) {
  if (!confirm("Вы уверены, что хотите удалить это Физическое Лицо?")) return;

  try {
    const response = await fetch(`/api/individuals/${uuid}`, {
      method: "DELETE",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();

    if (result.success) {
      alert("Физическое лицо удалено");
      await loadIndividuals();
    } else {
      alert("Ошибка удаления: " + result.error);
    }
  } catch (error) {
    console.error("Error deleting individual:", error);
    alert("Ошибка при удалении: " + error.message);
  }
}

// 🔄 ВОССТАНОВЛЕНИЕ ФИЗЛИЦА
async function restoreIndividual(uuid) {
  if (!confirm("Вы уверены, что хотите восстановить это Физическое Лицо?"))
    return;

  try {
    const response = await fetch(`/api/individuals/${uuid}`, {
      method: "PATCH",
    });

    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();

    if (result.success) {
      alert("Физическое лицо восстановлено");
      await loadIndividuals();
    } else {
      alert("Ошибка восстановления: " + result.error);
    }
  } catch (error) {
    console.error("Error restoring individual:", error);
    alert("Ошибка при восстановлении: " + error.message);
  }
}

// ✏️ РЕДАКТИРОВАНИЕ ФИЗЛИЦА
async function openEditModal(uuid) {
  try {
    console.log("📝 Загрузка данных для редактирования:", uuid);

    const response = await fetch(`/api/individuals/${uuid}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || "Ошибка загрузки данных");
    }

    const individual = result.data;
    showEditModal(individual);
  } catch (error) {
    console.error("Ошибка загрузки данных для редактирования:", error);
    alert("Ошибка загрузки данных: " + error.message);
  }
}

function showEditModal(individual) {
  // Создаем модальное окно
  const modalOverlay = document.createElement("div");
  modalOverlay.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0,0,0,0.5);
    display: flex;
    justify-content: center;
    align-items: center;
    z-index: 1000;
  `;

  const modalContent = document.createElement("div");
  modalContent.style.cssText = `
    background: white;
    padding: 30px;
    border-radius: 12px;
    box-shadow: 0 10px 30px rgba(0,0,0,0.3);
    width: 90%;
    max-width: 500px;
    max-height: 90vh;
    overflow-y: auto;
  `;

  modalContent.innerHTML = `
    <h3 style="margin: 0 0 20px 0; color: #2c3e50; font-size: 20px; font-weight: 600;">
      ✏️ Редактирование физлица
    </h3>
    
    <form id="editForm">
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">
          ИИН (12 цифр):
        </label>
        <input type="text" id="editCode" value="${individual.cat2_code}" 
               maxlength="12" required readonly
               style="width: 100%; padding: 10px 12px; border: 1px solid #bdc3c7; border-radius: 6px; font-size: 14px; background: #f8f9fa;">
        <div id="editCodeError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">
          Фамилия:
        </label>
        <input type="text" id="editSurname" value="${individual.cat2_surname}" 
               required style="width: 100%; padding: 10px 12px; border: 1px solid #bdc3c7; border-radius: 6px; font-size: 14px;">
        <div id="editSurnameError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      
      <div style="margin-bottom: 15px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">
          Имя:
        </label>
        <input type="text" id="editName" value="${individual.cat2_name}" 
               required style="width: 100%; padding: 10px 12px; border: 1px solid #bdc3c7; border-radius: 6px; font-size: 14px;">
        <div id="editNameError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      
      <div style="margin-bottom: 25px;">
        <label style="display: block; margin-bottom: 5px; font-weight: 600; color: #2c3e50; font-size: 13px;">
          Отчество:
        </label>
        <input type="text" id="editPatronymic" value="${
          individual.cat2_patronymic || ""
        }" 
               style="width: 100%; padding: 10px 12px; border: 1px solid #bdc3c7; border-radius: 6px; font-size: 14px;">
        <div id="editPatronymicError" style="color: #e74c3c; margin-top: 5px; font-size: 12px;"></div>
      </div>
      
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button type="button" id="editCancelBtn" 
                style="background: #6c757d; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
          Отмена
        </button>
        <button type="submit" 
                style="background: #3498db; color: white; padding: 12px 24px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 600;">
          💾 Сохранить изменения
        </button>
      </div>
      
      <div id="editMessage" style="margin-top: 15px; font-size: 13px;"></div>
    </form>
  `;

  modalOverlay.appendChild(modalContent);
  document.body.appendChild(modalOverlay);

  // Валидация полей в реальном времени
  document.getElementById("editSurname").addEventListener("input", function () {
    const error = validateField(this.value, "Фамилия", 2);
    document.getElementById("editSurnameError").textContent = error || "";
  });

  document.getElementById("editName").addEventListener("input", function () {
    const error = validateField(this.value, "Имя", 2);
    document.getElementById("editNameError").textContent = error || "";
  });

  document
    .getElementById("editPatronymic")
    .addEventListener("input", function () {
      if (this.value) {
        const error = validateField(this.value, "Отчество", 2);
        document.getElementById("editPatronymicError").textContent =
          error || "";
      } else {
        document.getElementById("editPatronymicError").textContent = "";
      }
    });

  // Отправка формы
  document.getElementById("editForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateIndividual(individual.cat2_uuid);
  });

  // Закрытие модального окна
  document.getElementById("editCancelBtn").addEventListener("click", () => {
    document.body.removeChild(modalOverlay);
  });

  modalOverlay.addEventListener("click", (e) => {
    if (e.target === modalOverlay) {
      document.body.removeChild(modalOverlay);
    }
  });
}

// 🔄 ОБНОВЛЕНИЕ ФИЗЛИЦА
let isUpdating = false;

async function updateIndividual(uuid) {
  if (isUpdating) {
    console.log("⚠️ Обновление уже выполняется, пропускаем...");
    return;
  }

  isUpdating = true;
  console.log("🔄 Обновление физлица:", uuid);

  try {
    const surnameInput = document.getElementById("editSurname");
    const nameInput = document.getElementById("editName");
    const patronymicInput = document.getElementById("editPatronymic");
    const messageDiv = document.getElementById("editMessage");

    const formData = {
      surname: surnameInput.value.trim(),
      name: nameInput.value.trim(),
      patronymic: patronymicInput.value.trim(),
    };

    console.log("📤 Данные для обновления:", formData);

    // Валидация
    const surnameError = validateField(formData.surname, "Фамилия", 2);
    const nameError = validateField(formData.name, "Имя", 2);
    const patronymicError = formData.patronymic
      ? validateField(formData.patronymic, "Отчество", 2)
      : null;

    if (surnameError || nameError || patronymicError) {
      messageDiv.style.color = "#e74c3c";
      messageDiv.textContent = "Исправьте ошибки в форме";
      isUpdating = false;
      return;
    }

    // Показываем загрузку
    messageDiv.style.color = "#3498db";
    messageDiv.textContent = "Сохранение изменений...";

    const response = await fetch(`/api/individuals/${uuid}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(formData),
    });

    console.log("Response status:", response.status);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("📥 Ответ сервера:", result);

    if (result.success) {
      messageDiv.style.color = "#27ae60";
      messageDiv.textContent = "✅ Изменения успешно сохранены!";

      // Закрываем модальное окно через 1 секунду
      setTimeout(() => {
        const modalOverlay = document.querySelector(
          'div[style*="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5)"]'
        );
        if (modalOverlay) {
          document.body.removeChild(modalOverlay);
        }
        loadIndividuals();
      }, 1000);
    } else {
      messageDiv.style.color = "#e74c3c";
      messageDiv.textContent =
        "❌ Ошибка: " + (result.error || "Неизвестная ошибка");
    }
  } catch (error) {
    console.error("❌ Ошибка обновления:", error);
    const messageDiv = document.getElementById("editMessage");
    if (messageDiv) {
      messageDiv.style.color = "#e74c3c";
      messageDiv.textContent = "❌ Ошибка при обновлении: " + error.message;
    }
  } finally {
    isUpdating = false;
  }
}

// 📝 НАСТРОЙКА ФОРМЫ
function setupForm() {
  const form = document.getElementById("individualForm");
  const codeInput = document.getElementById("code");
  const surnameInput = document.getElementById("surname");
  const nameInput = document.getElementById("name");
  const patronymicInput = document.getElementById("patronymic");
  const codeError = document.getElementById("codeError");
  const surnameError = document.getElementById("surnameError");
  const nameError = document.getElementById("nameError");
  const patronymicError = document.getElementById("patronymicError");
  const messageDiv = document.getElementById("formMessage");

  if (!form || !codeInput || !surnameInput || !nameInput || !messageDiv) {
    console.error("❌ Элементы формы не найдены");
    return;
  }

  console.log("✅ Форма инициализирована");

  // Валидация в реальном времени
  codeInput.addEventListener("input", () => {
    const error = validateIIN(codeInput.value);
    codeError.textContent = error || "";
  });

  surnameInput.addEventListener("input", () => {
    const error = validateField(surnameInput.value, "Фамилия", 2);
    surnameError.textContent = error || "";
  });

  nameInput.addEventListener("input", () => {
    const error = validateField(nameInput.value, "Имя", 2);
    nameError.textContent = error || "";
  });

  patronymicInput.addEventListener("input", () => {
    if (patronymicInput.value) {
      const error = validateField(patronymicInput.value, "Отчество", 2);
      patronymicError.textContent = error || "";
    } else {
      patronymicError.textContent = "";
    }
  });

  // Отправка формы
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("✅ Форма отправлена!");
    await createIndividual();
  });
}

// ➕ СОЗДАНИЕ НОВОГО ФИЗЛИЦА
let isCreating = false;

async function createIndividual() {
  if (isCreating) {
    console.log("⚠️ Создание уже выполняется, пропускаем...");
    return;
  }

  isCreating = true;
  console.log("🔥 createIndividual FUNCTION CALLED!");

  try {
    const codeInput = document.getElementById("code");
    const surnameInput = document.getElementById("surname");
    const nameInput = document.getElementById("name");
    const patronymicInput = document.getElementById("patronymic");
    const messageDiv = document.getElementById("formMessage");

    console.log("🔍 Элементы формы:", {
      codeInput: !!codeInput,
      surnameInput: !!surnameInput,
      nameInput: !!nameInput,
      patronymicInput: !!patronymicInput,
      messageDiv: !!messageDiv
    });

    if (!codeInput || !surnameInput || !nameInput || !messageDiv) {
      console.error("❌ Элементы формы не найдены");
      isCreating = false;
      return;
    }

    const formData = {
      code: codeInput.value.trim(),
      surname: surnameInput.value.trim(),
      name: nameInput.value.trim(),
      patronymic: patronymicInput.value.trim(),
    };

    console.log("📤 Отправка данных:", formData);

    // Валидация
    const iinError = validateIIN(formData.code);
    const surnameError = validateField(formData.surname, "Фамилия", 2);
    const nameError = validateField(formData.name, "Имя", 2);
    const patronymicError = formData.patronymic
      ? validateField(formData.patronymic, "Отчество", 2)
      : null;

    if (iinError || surnameError || nameError || patronymicError) {
      console.log("❌ Ошибки валидации:", { iinError, surnameError, nameError, patronymicError });
      messageDiv.style.color = "#e74c3c";
      messageDiv.textContent = "Исправьте ошибки в форме перед отправкой";
      isCreating = false;
      return;
    }

    // Показываем загрузку
    messageDiv.style.color = "#3498db";
    messageDiv.textContent = "Отправка данных...";

    console.log("🌐 Отправляю fetch запрос на /api/individuals...");
    
    const fetchOptions = {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(formData),
    };

    console.log("📦 Fetch options:", fetchOptions);

    const response = await fetch("/api/individuals", fetchOptions);

    console.log("📨 Response status:", response.status);
    console.log("📨 Response ok:", response.ok);
    console.log("📨 Response headers:", Object.fromEntries(response.headers.entries()));

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Response error text:", errorText);
      throw new Error(`HTTP ${response.status}: ${errorText}`);
    }

    const result = await response.json();
    console.log("📥 Полный ответ сервера:", result);

    if (result.success) {
      console.log("✅ Успешно создано физлицо:", result.data);
      messageDiv.style.color = "#27ae60";
      messageDiv.textContent = "✅ Физическое лицо успешно добавлено!";
      document.getElementById("individualForm").reset();

      // 🔄 ПЕРЕЗАГРУЗКА С ЗАДЕРЖКОЙ ДЛЯ СИНХРОНИЗАЦИИ БД
      setTimeout(async () => {
        console.log("🔄 Перезагружаем таблицу...");
        await loadIndividuals();
        console.log("✅ Таблица обновлена после создания!");
      }, 500);
    } else {
      console.error("❌ Ошибка от сервера:", result.error);
      messageDiv.style.color = "#e74c3c";
      messageDiv.textContent = "❌ Ошибка: " + (result.error || "Неизвестная ошибка");
    }
  } catch (error) {
    console.error("❌ CATCH ERROR:", error);
    console.error("❌ Error stack:", error.stack);
    
    const messageDiv = document.getElementById("formMessage");
    if (messageDiv) {
      messageDiv.style.color = "#e74c3c";
      messageDiv.textContent = "❌ Ошибка при создании: " + error.message;
    }
  } finally {
    isCreating = false;
    console.log("🏁 createIndividual завершён");
  }
}

// 🔥 ГЛОБАЛЬНЫЙ ЭКСПОРТ ФУНКЦИЙ
window.createIndividualsPage = createIndividualsPage;
window.initIndividualsFunctionality = initIndividualsFunctionality;
window.deleteIndividual = deleteIndividual;
window.restoreIndividual = restoreIndividual;
window.openEditModal = openEditModal;
window.sortTable = sortTable;
