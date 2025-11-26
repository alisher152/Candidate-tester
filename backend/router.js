// backend/router.js
const mainController = require("./controllers/mainController");
const Metadata = require("./controllers/Metadata");
const api = require("./controllers/api");

// Парсинг тела запроса (POST, PUT, PATCH)
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk.toString()));
    req.on("end", () => {
      try {
        req.body = body ? JSON.parse(body) : {};
        resolve();
      } catch (e) {
        reject(e);
      }
    });
    req.on("error", reject);
  });
}

// Регулярка для UUID v4
const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function router(req, res, env) {
  console.log("=== ROUTER START ===");
  console.log("ROUTER:", req.method, req.url);

  const url = new URL(req.url, `http://${req.headers.host}`);
  const pathname = url.pathname;

  console.log("Parsed pathname:", pathname);
  console.log("Method:", req.method);

  // 🔥 ВРЕМЕННЫЙ ДИАГНОСТИЧЕСКИЙ МАРШРУТ - ДОБАВЬ ЭТО
  if (pathname === "/api/individuals" && req.method === "POST") {
    console.log("🔥 ДИАГНОСТИКА: Пойман POST /api/individuals!");
    console.log("🔥 Вызываю api.createIndividual напрямую...");
    return api.createIndividual(req, res);
  }
  console.log("=== ROUTER END ===");

  console.log("🔍 Обрабатываем путь:", pathname, "Метод:", req.method);

  // Парсим тело для методов с payload
  if (["POST", "PUT", "PATCH"].includes(req.method)) {
    try {
      await parseBody(req);
      console.log("📦 Тело запроса parsed:", req.body);
    } catch (err) {
      console.error("❌ Ошибка парсинга тела:", err);
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(JSON.stringify({ success: false, error: "Invalid JSON" }));
    }
  }

  // ==============================================================
  // 🔥 КРИТИЧЕСКИЕ ИСПРАВЛЕНИЯ: СПЕЦИФИЧЕСКИЕ МАРШРУТЫ ПЕРВЫМИ
  // ==============================================================

  // 🔥 1. ФИЗИЧЕСКИЕ ЛИЦА - САМЫЕ ВАЖНЫЕ И ПЕРВЫЕ
  if (pathname === "/api/individuals") {
    console.log("🎯 Маршрут /api/individuals обнаружен");

    if (req.method === "GET") {
      console.log("✅ Обрабатываем GET /api/individuals");
      return api.getIndividuals(req, res);
    }

    if (req.method === "POST") {
      console.log("✅ Обрабатываем POST /api/individuals");
      return api.createIndividual(req, res);
    }
  }

  if (
    pathname.startsWith("/api/individuals/") &&
    UUID_REGEX.test(pathname.slice(17))
  ) {
    const uuid = pathname.slice(17);
    console.log("🎯 Маршрут /api/individuals/:uuid обнаружен, UUID:", uuid);

    if (req.method === "GET") {
      console.log("✅ Обрабатываем GET /api/individuals/:uuid");
      return api.getIndividual(req, res);
    }

    if (req.method === "PUT") {
      console.log("✅ Обрабатываем PUT /api/individuals/:uuid");
      return api.updateIndividual(req, res);
    }

    if (req.method === "DELETE") {
      console.log("✅ Обрабатываем DELETE /api/individuals/:uuid");
      return api.softDeleteIndividual(req, res);
    }

    if (req.method === "PATCH") {
      console.log("✅ Обрабатываем PATCH /api/individuals/:uuid");
      return api.restoreIndividual(req, res);
    }
  }

  // ==============================================================
  // 🔥 3. ВСЕ ОСТАЛЬНЫЕ МАРШРУТЫ
  // ==============================================================

  if (pathname === "/api" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api");
    return mainController.doEvent(req, res);
  }

  if (pathname === "/" && req.method === "POST") {
    console.log("✅ Маршрут: POST /");
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api");
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api/metadata" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/metadata");
    return Metadata.getPublicMetadata(req, res);
  }

  // API для экземпляров
  if (pathname === "/api/instance" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/instance");
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api/instance/select" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/instance/select");
    req.body = { ...req.body, type: "instance_select" };
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api/instance/insert" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/instance/insert");
    req.body = { ...req.body, type: "instance_insert" };
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api/instance/update" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/instance/update");
    req.body = { ...req.body, type: "instance_update" };
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api/instance/delete" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/instance/delete");
    req.body = { ...req.body, type: "instance_delete" };
    return mainController.doEvent(req, res);
  }

  if (pathname === "/api/instance/list" && req.method === "POST") {
    console.log("✅ Маршрут: POST /api/instance/list");
    req.body = { ...req.body, type: "instance_list" };
    return mainController.doEvent(req, res);
  }

  // 🔥 4. ТЕСТОВЫЙ МАРШРУТ ДЛЯ ДИАГНОСТИКИ
  if (pathname === "/api/test" && req.method === "POST") {
    console.log("✅ Тестовый маршрут вызван");
    res.writeHead(200, { "Content-Type": "application/json" });
    return res.end(
      JSON.stringify({
        success: true,
        message: "Test OK",
        timestamp: new Date().toISOString(),
      })
    );
  }

  // 404 — если ничего не нашли
  console.log("❌ Маршрут не найден:", req.method, pathname);
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(
    JSON.stringify({
      success: false,
      error: "Not found",
      path: pathname,
      method: req.method,
    })
  );
}

module.exports = { router };
