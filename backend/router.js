// backend/router.js
const mainController = require("./controllers/mainController");
const Metadata = require("./controllers/Metadata");
const api = require("./controllers/api");

// Функция для чтения тела запроса
async function parseBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk.toString();
    });
    req.on("end", () => {
      try {
        if (body) {
          req.body = JSON.parse(body);
        } else {
          req.body = {};
        }
        resolve();
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

async function router(req, res, env) {
  console.log("🔍 ROUTER:", req.method, req.url);

  // Для POST/PUT запросов сначала читаем тело
  if (req.method === "POST" || req.method === "PUT" || req.method === "PATCH") {
    try {
      await parseBody(req);
      console.log("📦 Parsed body:", req.body);
    } catch (error) {
      console.error("❌ Error parsing body:", error);
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Invalid JSON",
        })
      );
    }
  }

  // 🔥 API ДЛЯ ФИЗЛИЦ
  if (req.url === "/api/individuals" && req.method === "GET") {
    return api.getIndividuals(req, res);
  }

  if (req.url.startsWith("/api/individuals/") && req.method === "GET") {
    return api.getIndividual(req, res);
  }

  if (req.url === "/api/individuals" && req.method === "POST") {
    return api.createIndividual(req, res);
  }

  if (req.url.startsWith("/api/individuals/") && req.method === "PUT") {
    return api.updateIndividual(req, res);
  }

  if (req.url.startsWith("/api/individuals/") && req.method === "DELETE") {
    return api.softDeleteIndividual(req, res);
  }

  if (req.url.startsWith("/api/individuals/") && req.method === "PATCH") {
    return api.restoreIndividual(req, res);
  }

  // Старые маршруты
  if (req.url === "/" && req.method === "GET")
    return mainController.doGet(req, res);
  if (req.url === "/" && req.method === "POST")
    return mainController.doEvent(req, res);
  if (req.url === "/api" && req.method === "POST")
    return mainController.doEvent(req, res);
  if (req.url === "/api/metadata" && req.method === "POST")
    return Metadata.getPublicMetadata(req, res);

  // API для работы с экземплярами
  if (req.url === "/api/instance" && req.method === "POST")
    return mainController.doEvent(req, res);
  if (req.url === "/api/instance/select" && req.method === "POST") {
    req.body = { ...req.body, type: "instance_select" };
    return mainController.doEvent(req, res);
  }
  if (req.url === "/api/instance/insert" && req.method === "POST") {
    req.body = { ...req.body, type: "instance_insert" };
    return mainController.doEvent(req, res);
  }
  if (req.url === "/api/instance/update" && req.method === "POST") {
    req.body = { ...req.body, type: "instance_update" };
    return mainController.doEvent(req, res);
  }
  if (req.url === "/api/instance/delete" && req.method === "POST") {
    req.body = { ...req.body, type: "instance_delete" };
    return mainController.doEvent(req, res);
  }
  if (req.url === "/api/instance/list" && req.method === "POST") {
    req.body = { ...req.body, type: "instance_list" };
    return mainController.doEvent(req, res);
  }

  res.writeHead(404);
  res.end("Not found");
}

module.exports = { router };
