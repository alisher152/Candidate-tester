// main.js - Главный файл и главная страница

// Массив для хранения загруженных скриптов
let loadedScripts = [];

// Конфигурация полей для форм
const FIELDS_CONFIG = {
  id: {
    editable: false,
    visible: { create: false, edit: true },
    required: false,
    type: "text",
    title: "ID",
  },
  uuid: {
    editable: false,
    visible: { create: false, edit: true },
    required: false,
    type: "text",
    title: "UUID",
  },
  code: {
    editable: true,
    visible: { create: true, edit: true },
    required: false,
    type: "text",
    title: "Код",
    placeholder: "Введите уникальный код",
  },
  represent: {
    editable: true,
    visible: { create: true, edit: true },
    required: true,
    type: "text",
    title: "Название",
    placeholder: "Введите название",
  },
  // Дефолтная конфигурация для остальных полей
  _default: {
    editable: true,
    visible: { create: true, edit: true },
    required: false,
    type: "text",
    title: null,
    placeholder: null,
  },
};

// Конфигурация колонок таблицы
const TABLE_CONFIG = {
  columns: {
    id: {
      title: "ID",
      width: "80px",
      align: "center",
      visible: true,
    },
    represent: {
      title: "Название",
      width: "auto",
      align: "left",
      visible: true,
    },
  },
  tableStyle: {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "20px",
  },
  headerStyle: {
    background: "#f8f9fa",
    fontWeight: "bold",
  },
  cellStyle: {
    border: "1px solid #ddd",
    padding: "12px",
  },
};

// Класс для работы с API
class ApiClient {
  static async request(endpoint, data) {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    return await response.json();
  }

  static async getNomenclature() {
    return await this.request("/api", { type: "nomenclature" });
  }

  static async getMetadata(table) {
    return await this.request("/api/metadata", { table });
  }

  static async selectInstance(table, uuid) {
    return await this.request("/api/instance/select", { table, uuid });
  }

  static async insertInstance(table, data) {
    return await this.request("/api/instance/insert", { table, data });
  }

  static async updateInstance(table, uuid, data) {
    return await this.request("/api/instance/update", { table, uuid, data });
  }

  static async deleteInstance(table, uuid) {
    return await this.request("/api/instance/delete", { table, uuid });
  }
}

// Класс для управления таблицей
class TableManager {
  constructor(container, config) {
    this.container = container;
    this.config = config;
  }

  render(data) {
    this.container.innerHTML = "";

    // Создаем кнопку "Создать"
    const createButton = this.createButton();
    this.container.appendChild(createButton);

    // Создаем таблицу
    const table = this.createTable(data);
    this.container.appendChild(table);
  }

  createButton() {
    const button = document.createElement("button");
    button.textContent = "+ Создать";
    button.style.cssText = `
      background: #28a745;
      color: white;
      padding: 10px 20px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      margin-bottom: 15px;
      font-size: 14px;
      font-weight: bold;
    `;
    button.addEventListener("click", () => {
      modalManager.openCreateModal();
    });
    return button;
  }

  createTable(data) {
    const table = document.createElement("table");
    table.style.cssText = this.getStyleString(this.config.tableStyle);

    // Заголовки
    const headerRow = this.createHeaderRow();
    table.appendChild(headerRow);

    // Данные
    data.forEach((row) => {
      const dataRow = this.createDataRow(row);
      table.appendChild(dataRow);
    });

    return table;
  }

  createHeaderRow() {
    const row = document.createElement("tr");
    Object.entries(this.config.headerStyle).forEach(([key, value]) => {
      row.style[key] = value;
    });

    Object.entries(this.config.columns).forEach(([fieldName, config]) => {
      if (!config.visible) return;

      const th = document.createElement("th");
      th.textContent = config.title;

      const cellStyles = { ...this.config.cellStyle };
      if (config.width) cellStyles.width = config.width;
      if (config.align) cellStyles.textAlign = config.align;

      th.style.cssText = this.getStyleString(cellStyles);
      row.appendChild(th);
    });

    return row;
  }

  createDataRow(row) {
    const dataRow = document.createElement("tr");
    dataRow.style.cssText = `
      cursor: pointer;
      transition: background-color 0.2s;
    `;

    // Hover эффект
    dataRow.addEventListener("mouseenter", () => {
      dataRow.style.backgroundColor = "#f0f8ff";
    });
    dataRow.addEventListener("mouseleave", () => {
      dataRow.style.backgroundColor = "";
    });

    // Клик по строке
    dataRow.addEventListener("click", () => {
      modalManager.openEditModal(row.uuid);
    });

    // Создаем ячейки
    Object.entries(this.config.columns).forEach(([fieldName, config]) => {
      if (!config.visible) return;

      const td = document.createElement("td");
      td.textContent = row[fieldName] || "";

      const cellStyles = { ...this.config.cellStyle };
      if (config.width) cellStyles.width = config.width;
      if (config.align) cellStyles.textAlign = config.align;

      td.style.cssText = this.getStyleString(cellStyles);
      dataRow.appendChild(td);
    });

    return dataRow;
  }

  getStyleString(styleObj) {
    return Object.entries(styleObj)
      .map(
        ([key, value]) =>
          `${key.replace(/([A-Z])/g, "-$1").toLowerCase()}: ${value}`
      )
      .join("; ");
  }
}

// Класс для управления модальными окнами
class ModalManager {
  constructor() {
    this.createModalStructure();
  }

  createModalStructure() {
    // Фон модального окна
    const modalOverlay = document.createElement("div");
    modalOverlay.id = "modal-overlay";
    modalOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: none;
      z-index: 1000;
    `;

    // Само модальное окно
    const modal = document.createElement("div");
    modal.id = "instance-modal";
    modal.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      max-width: 600px;
      width: 90%;
      max-height: 80vh;
      overflow-y: auto;
    `;

    modal.innerHTML = `
      <h3 id="modal-title" style="margin: 0 0 20px 0; color: #333;">Модальное окно</h3>
      <div id="modal-fields" style="margin-bottom: 20px;"></div>
      <div style="display: flex; gap: 10px; justify-content: flex-end;">
        <button id="modal-action-btn" style="background: #28a745; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Действие</button>
        <button id="modal-delete-btn" style="background: #dc3545; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Удалить</button>
        <button id="modal-cancel-btn" style="background: #6c757d; color: white; padding: 10px 20px; border: none; border-radius: 4px; cursor: pointer;">Отмена</button>
      </div>
    `;

    modalOverlay.appendChild(modal);
    document.body.appendChild(modalOverlay);

    // События - добавляем ПОСЛЕ того как элементы добавлены в DOM
    document
      .getElementById("modal-cancel-btn")
      .addEventListener("click", () => this.close());
    modalOverlay.addEventListener("click", (e) => {
      if (e.target === modalOverlay) this.close();
    });
  }

  async openCreateModal() {
    const title = document.getElementById("modal-title");
    const actionBtn = document.getElementById("modal-action-btn");
    const deleteBtn = document.getElementById("modal-delete-btn");

    title.textContent = "Создание нового экземпляра";
    actionBtn.textContent = "Создать";
    deleteBtn.style.display = "none";

    this.show();

    try {
      const metadata = await ApiClient.getMetadata("nomenclature");
      if (!metadata.fields) throw new Error("Не удалось получить метаданные");

      this.renderFields(metadata.fields, "create");
      actionBtn.onclick = () => this.handleCreate();
    } catch (error) {
      this.showError(`Ошибка загрузки полей: ${error.message}`);
    }
  }

  async openEditModal(uuid) {
    const title = document.getElementById("modal-title");
    const actionBtn = document.getElementById("modal-action-btn");
    const deleteBtn = document.getElementById("modal-delete-btn");

    title.textContent = "Редактирование экземпляра";
    actionBtn.textContent = "Обновить";
    deleteBtn.style.display = "inline-block";

    this.show();
    this.showLoading();

    try {
      const result = await ApiClient.selectInstance("nomenclature", uuid);
      if (result.status !== 200) throw new Error(result.message);

      this.renderFieldsWithData(result.data, "edit");
      actionBtn.onclick = () => this.handleUpdate(uuid);
      deleteBtn.onclick = () => this.handleDelete(uuid);
    } catch (error) {
      this.showError(`Ошибка загрузки: ${error.message}`);
    }
  }

  renderFields(fields, mode) {
    const container = document.getElementById("modal-fields");
    container.innerHTML = "";

    fields.forEach((field) => {
      const fieldConfig = FIELDS_CONFIG[field.name] || FIELDS_CONFIG._default;
      if (!fieldConfig.visible[mode]) return;

      const fieldElement = this.createField(field, fieldConfig, null);
      container.appendChild(fieldElement);
    });

    this.addRequiredFieldsNote(container);
  }

  renderFieldsWithData(data, mode) {
    const container = document.getElementById("modal-fields");
    container.innerHTML = "";

    Object.entries(data).forEach(([fieldName, value]) => {
      const fieldConfig = FIELDS_CONFIG[fieldName] || FIELDS_CONFIG._default;
      if (!fieldConfig.visible[mode]) return;

      const field = { name: fieldName };
      const fieldElement = this.createField(field, fieldConfig, value);
      container.appendChild(fieldElement);
    });

    this.addRequiredFieldsNote(container);
  }

  createField(field, config, value = null) {
    const fieldGroup = document.createElement("div");
    fieldGroup.style.cssText = "margin-bottom: 15px;";

    const label = document.createElement("label");
    const fieldTitle = config.title || field.name;
    label.textContent = fieldTitle + (config.required ? " *" : "");
    label.style.cssText = `
      display: block;
      margin-bottom: 5px;
      font-weight: bold;
      color: ${config.required ? "#d63384" : "#333"};
    `;

    const input = document.createElement("input");
    input.name = field.name;
    input.type = config.type || "text";
    input.value = value || "";
    input.required = config.required;
    input.placeholder =
      config.placeholder || `Введите ${fieldTitle.toLowerCase()}`;
    input.style.cssText = `
      width: 100%;
      padding: 8px;
      border: 1px solid ${config.required ? "#fd7e14" : "#ddd"};
      border-radius: 4px;
      box-sizing: border-box;
      background: ${config.editable ? "white" : "#f8f9fa"};
    `;

    if (!config.editable) {
      input.disabled = true;
      input.style.color = "#6c757d";
    }

    fieldGroup.appendChild(label);
    fieldGroup.appendChild(input);
    return fieldGroup;
  }

  addRequiredFieldsNote(container) {
    const noteDiv = document.createElement("div");
    noteDiv.style.cssText = `
      margin-top: 15px;
      padding: 10px;
      background: #fff3cd;
      border: 1px solid #ffeaa7;
      border-radius: 4px;
      font-size: 12px;
      color: #856404;
    `;
    noteDiv.innerHTML = "<strong>*</strong> - обязательные поля для заполнения";
    container.appendChild(noteDiv);
  }

  async handleCreate() {
    const data = this.collectFormData();
    if (!data) return;

    try {
      const result = await ApiClient.insertInstance("nomenclature", data);
      if (result.status === 200) {
        alert("Запись успешно создана");
        this.close();
        nomenclatureManager.loadData();
      } else {
        alert(`Ошибка создания: ${result.message}`);
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  }

  async handleUpdate(uuid) {
    const data = this.collectFormData();
    if (!data) return;

    try {
      const result = await ApiClient.updateInstance("nomenclature", uuid, data);
      if (result.status === 200) {
        alert("Запись успешно обновлена");
        this.close();
        nomenclatureManager.loadData();
      } else {
        alert(`Ошибка обновления: ${result.message}`);
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  }

  async handleDelete(uuid) {
    if (!confirm("Вы уверены что хотите удалить эту запись?")) return;

    try {
      const result = await ApiClient.deleteInstance("nomenclature", uuid);
      if (result.status === 200) {
        alert("Запись успешно удалена");
        this.close();
        nomenclatureManager.loadData();
      } else {
        alert(`Ошибка удаления: ${result.message}`);
      }
    } catch (error) {
      alert(`Ошибка: ${error.message}`);
    }
  }

  collectFormData() {
    const inputs = document.querySelectorAll(
      "#modal-fields input:not([disabled])"
    );
    const data = {};
    let hasRequiredFields = true;
    const missingFields = [];

    inputs.forEach((input) => {
      const fieldConfig = FIELDS_CONFIG[input.name] || FIELDS_CONFIG._default;
      const value = input.value.trim();

      if (fieldConfig.required && !value) {
        hasRequiredFields = false;
        missingFields.push(fieldConfig.title || input.name);
        input.style.borderColor = "#dc3545";
      } else {
        input.style.borderColor = fieldConfig.required ? "#fd7e14" : "#ddd";
      }

      if (value !== "") {
        data[input.name] = value;
      }
    });

    if (!hasRequiredFields) {
      alert(`Заполните обязательные поля: ${missingFields.join(", ")}`);
      return null;
    }

    if (Object.keys(data).length === 0) {
      alert("Нет данных для сохранения");
      return null;
    }

    return data;
  }

  show() {
    document.getElementById("modal-overlay").style.display = "block";
  }

  close() {
    document.getElementById("modal-overlay").style.display = "none";
  }

  showLoading() {
    document.getElementById("modal-fields").innerHTML =
      "<p>Загрузка данных...</p>";
  }

  showError(message) {
    document.getElementById(
      "modal-fields"
    ).innerHTML = `<p style="color: red;">${message}</p>`;
  }
}

// Класс для управления номенклатурой
class NomenclatureManager {
  constructor() {
    this.container = null;
    this.tableManager = null;
  }

  async init(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) return;

    this.tableManager = new TableManager(this.container, TABLE_CONFIG);
    await this.loadData();
  }

  async loadData() {
    if (!this.container) return;

    this.container.innerHTML = "<p>Загрузка номенклатуры...</p>";

    try {
      const result = await ApiClient.getNomenclature();

      if (result.status !== 200) {
        throw new Error(result.message || "Ошибка запроса");
      }

      if (!result.data || !result.data.length) {
        this.container.innerHTML = "<p>Нет данных</p>";
        return;
      }

      this.tableManager.render(result.data);
    } catch (error) {
      this.container.innerHTML = `<p style='color:red'>Ошибка: ${error.message}</p>`;
    }
  }
}

// Глобальные экземпляры
let modalManager;
let nomenclatureManager;

// Функция для динамической загрузки JS файлов из папки items
async function loadPageScript(pageName) {
  const scriptPath = `items/${pageName}.js`;

  return new Promise((resolve, reject) => {
    if (loadedScripts.includes(scriptPath)) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = scriptPath;
    script.onload = () => {
      loadedScripts.push(scriptPath);
      console.log(`Загружен скрипт страницы: ${scriptPath}`);
      resolve();
    };
    script.onerror = () => {
      console.error(`Ошибка загрузки скрипта: ${scriptPath}`);
      reject(new Error(`Не удалось загрузить ${scriptPath}`));
    };
    document.head.appendChild(script);
  });
}

// Функция для очистки контейнера приложения
function clearApp() {
  const app = document.getElementById("app");
  app.innerHTML = "";
}

// Главная страница
async function createHomePage() {
  clearApp();
  const app = document.getElementById("app");

  const homeContainer = document.createElement("div");
  homeContainer.className = "home-page";

  const title = document.createElement("h2");
  title.textContent = "Главная страница";
  title.style.color = "#28a745";
  title.style.marginBottom = "20px";

  const description = document.createElement("p");
  description.textContent =
    "Добро пожаловать! Кликните на строку в таблице для редактирования";
  description.style.marginBottom = "20px";

  const loadingDiv = document.createElement("div");
  loadingDiv.id = "nomenclature-container";

  homeContainer.appendChild(title);
  homeContainer.appendChild(description);
  homeContainer.appendChild(loadingDiv);
  app.appendChild(homeContainer);

  // Инициализируем менеджеры
  modalManager = new ModalManager();
  nomenclatureManager = new NomenclatureManager();
  await nomenclatureManager.init("nomenclature-container");
}

// Универсальная функция для загрузки и создания страниц
async function loadAndCreatePage(pageName, createFunctionName) {
  clearApp();
  const app = document.getElementById("app");

  const loadingDiv = document.createElement("div");
  loadingDiv.textContent = `Загрузка ${pageName}...`;
  loadingDiv.style.cssText = "padding: 20px; text-align: center; color: #666;";
  app.appendChild(loadingDiv);

  try {
    await loadPageScript(pageName);
    app.removeChild(loadingDiv);

    if (typeof window[createFunctionName] === "function") {
      const pageElement = await window[createFunctionName]();
      app.appendChild(pageElement);

      // 🔥 ИНИЦИАЛИЗАЦИЯ ТОЛЬКО ДЛЯ ФИЗЛИЦ И ТОЛЬКО ОДИН РАЗ
      if (
        pageName === "individuals" &&
        typeof window.initIndividualsFunctionality === "function"
      ) {
        console.log("🚀 Инициализация страницы физлиц...");
        window.initIndividualsFunctionality();
      }
    } else {
      throw new Error(`Функция ${createFunctionName} не найдена`);
    }
  } catch (error) {
    app.innerHTML = `<p style="color: red;">Ошибка загрузки страницы: ${error.message}</p>`;
    console.error("Ошибка загрузки страницы:", error);
  }
}

// Роутинг
const routes = {
  home: async () => {
    await createHomePage();
  },
  page1: async () => {
    await loadAndCreatePage("page1", "createPage1");
  },
  individuals: async () => {
    await loadAndCreatePage("individuals", "createIndividualsPage");
  },
};

// Функция рендеринга
async function render() {
  const hash = location.hash.replace("#", "") || "home";

  if (routes[hash]) {
    await routes[hash]();
  } else {
    clearApp();
    const app = document.getElementById("app");
    const errorDiv = document.createElement("div");
    errorDiv.innerHTML = "<h2>404</h2><p>Страница не найдена</p>";
    errorDiv.style.cssText = "text-align: center; padding: 40px; color: #666;";
    app.appendChild(errorDiv);
  }
}

// Инициализация
window.addEventListener("hashchange", render);
window.addEventListener("DOMContentLoaded", render);
