// backend/controllers/api.js
const { query } = require("../db/pg");

// ✅ PING функция
function ping(req, res) {
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ pong: true }));
}

// ✅ DB TEST функция
function dbTest(req, res, env) {
  const { getPgSocket } = require("../db/pg");
  getPgSocket(env, (err, socket) => {
    if (err) {
      res.writeHead(500);
      res.end("DB connection error: " + err.message);
      return;
    }
    res.writeHead(200);
    res.end("Connected to DB!");
    socket.end();
  });
}

// 🔧 Утилиты
function buildWhereClause(filters) {
  const conditions =
    filters.deleted === "true"
      ? ["cat2__deleted = true"]
      : ["cat2__deleted = false"];
  const params = [];
  let paramCount = 0;

  if (filters.search) {
    paramCount++;
    conditions.push(`(
      cat2__code ILIKE $${paramCount} OR 
      cat2__represent ILIKE $${paramCount} OR
      cat2__surname ILIKE $${paramCount} OR
      cat2__name ILIKE $${paramCount} OR
      cat2__patronymic ILIKE $${paramCount}
    )`);
    params.push(`%${filters.search}%`);
  }

  return {
    where: conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "",
    params,
  };
}

function buildPagination(page, limit) {
  const offset = (page - 1) * limit;
  return {
    limit: `LIMIT ${limit}`,
    offset: `OFFSET ${offset}`,
  };
}

// ✅ ПОЛУЧЕНИЕ ФИЗЛИЦ С ПАГИНАЦИЕЙ И ПОИСКОМ
async function getIndividuals(req, res) {
  try {
    console.log("Getting individuals with filters...");

    const url = new URL(req.url, `http://${req.headers.host}`);
    const search = url.searchParams.get("search") || "";
    const deleted = url.searchParams.get("deleted") || "false";
    const page = parseInt(url.searchParams.get("page")) || 1;
    const limit = parseInt(url.searchParams.get("limit")) || 10;

    console.log("Filters:", { search, deleted, page, limit });

    // Получаем данные
    const whereClause = buildWhereClause({ search, deleted });
    const pagination = buildPagination(page, limit);

    const dataQuery = `
  SELECT 
    cat2__uuid as "cat2_uuid", 
    cat2__code as "cat2_code", 
    cat2__represent as "cat2_represent", 
    cat2__surname as "cat2_surname", 
    cat2__name as "cat2_name", 
    cat2__patronymic as "cat2_patronymic",
    cat2__insertdate as "cat2_insertdate", 
    cat2__updatedate as "cat2_updatedate", 
    cat2__deleted as "cat2_deleted"
  FROM cat2__individuals 
  ${whereClause.where}
  ORDER BY cat2__insertdate DESC
  ${pagination.limit} ${pagination.offset}
`;

    // Получаем общее количество для пагинации
    const countQuery = `
      SELECT COUNT(*) as total 
      FROM cat2__individuals 
      ${whereClause.where}
    `;

    console.log("Data query:", dataQuery);
    console.log("Count query:", countQuery);
    console.log("Params:", whereClause.params);

    const [dataResult, countResult] = await Promise.all([
      query(dataQuery, whereClause.params),
      query(countQuery, whereClause.params),
    ]);

    const total = parseInt(countResult.rows[0].total);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      })
    );
  } catch (error) {
    console.error("Error getting individuals:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: error.message,
        details: "Проверьте имена таблиц и колонок в базе данных",
      })
    );
  }
}

// ✅ ПОЛУЧЕНИЕ ОДНОГО ФИЗЛИЦА
async function getIndividual(req, res) {
  try {
    const uuid = req.url.split("/").pop();
    console.log("Getting individual:", uuid);

    const result = await query(
      `SELECT 
    cat2__uuid as "cat2_uuid", 
    cat2__code as "cat2_code", 
    cat2__represent as "cat2_represent", 
    cat2__surname as "cat2_surname", 
    cat2__name as "cat2_name", 
    cat2__patronymic as "cat2_patronymic",
    cat2__insertdate as "cat2_insertdate", 
    cat2__updatedate as "cat2_updatedate", 
    cat2__deleted as "cat2_deleted"
   FROM cat2__individuals 
   WHERE cat2__uuid = $1`,
      [uuid]
    );

    if (result.rows.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Физлицо не найдено",
        })
      );
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      })
    );
  } catch (error) {
    console.error("Error getting individual:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error: " + error.message,
      })
    );
  }
}

// ✅ СОЗДАНИЕ ФИЗЛИЦА
async function createIndividual(req, res) {
  console.log("🎯 createIndividual API CALLED!");
  console.log("🔍 URL:", req.url);
  console.log("🔍 Method:", req.method);
  console.log("📦 Тело запроса из router:", req.body);

  try {
    const { code, surname, name, patronymic } = req.body;

    console.log("📊 Распарсенные данные:", { code, surname, name, patronymic });

    // Проверяем что данные есть
    if (!code || !surname || !name) {
      console.log("❌ Отсутствуют обязательные поля");
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Необходимы код, фамилия и имя",
        })
      );
    }

    console.log("✅ Данные валидны, продолжаем...");

    // Валидация
    if (code.length !== 12) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "ИИН должен содержать 12 символов",
        })
      );
    }

    if (!/^\d+$/.test(code)) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "ИИН должен содержать только цифры",
        })
      );
    }

    // Проверка уникальности ИИН
    console.log("🔍 Проверяем уникальность ИИН:", code);
    const existing = await query(
      "SELECT cat2__uuid FROM cat2__individuals WHERE cat2__code = $1 AND cat2__deleted = false",
      [code]
    );

    if (existing.rows.length > 0) {
      console.log("❌ ИИН уже существует");
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Физлицо с таким ИИН уже существует",
        })
      );
    }

    const represent = `${surname} ${name} ${patronymic || ""}`.trim();
    console.log("📝 Формируем represent:", represent);

    // Вставляем в базу
    console.log("💾 Вставляем в БД...");
    const result = await query(
      `INSERT INTO cat2__individuals 
   (cat2__code, cat2__represent, cat2__surname, cat2__name, cat2__patronymic) 
   VALUES ($1, $2, $3, $4, $5) 
   RETURNING 
     cat2__uuid as "cat2_uuid", 
     cat2__code as "cat2_code", 
     cat2__represent as "cat2_represent", 
     cat2__surname as "cat2_surname", 
     cat2__name as "cat2_name", 
     cat2__patronymic as "cat2_patronymic"`,
      [code, represent, surname, name, patronymic]
    );

    console.log("✅ Insert successful:", result.rows[0]);

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      })
    );
  } catch (error) {
    console.error("❌ Error in createIndividual:", error);
    console.error("Stack:", error.stack);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error: " + error.message,
      })
    );
  }
}

// ✅ ОБНОВЛЕНИЕ ФИЗЛИЦА
async function updateIndividual(req, res) {
  console.log("🔄 updateIndividual API CALLED!");
  console.log("📦 Тело запроса:", req.body);

  try {
    const uuid = req.url.split("/").pop();
    const { surname, name, patronymic } = req.body;

    console.log("UUID:", uuid);
    console.log("Данные для обновления:", { surname, name, patronymic });

    // Валидация
    if (!surname || surname.length < 2) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Фамилия должна содержать минимум 2 символа",
        })
      );
    }

    if (!name || name.length < 2) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Имя должно содержать минимум 2 символа",
        })
      );
    }

    if (patronymic && patronymic.length < 2) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Отчество должно содержать минимум 2 символа",
        })
      );
    }

    const represent = `${surname} ${name} ${patronymic || ""}`.trim();

    // Обновляем в базе с обновлением updatedate
    const result = await query(
      `UPDATE cat2__individuals 
   SET 
     cat2__represent = $1, 
     cat2__surname = $2, 
     cat2__name = $3, 
     cat2__patronymic = $4,
     cat2__updatedate = NOW()
   WHERE cat2__uuid = $5
   RETURNING 
     cat2__uuid as "cat2_uuid", 
     cat2__code as "cat2_code", 
     cat2__represent as "cat2_represent", 
     cat2__surname as "cat2_surname", 
     cat2__name as "cat2_name", 
     cat2__patronymic as "cat2_patronymic", 
     cat2__updatedate as "cat2_updatedate"`,
      [represent, surname, name, patronymic, uuid]
    );

    if (result.rows.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Физлицо не найдено",
        })
      );
    }

    console.log("Update successful:", result.rows[0]);

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      })
    );
  } catch (error) {
    console.error("❌ Error in updateIndividual:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error: " + error.message,
      })
    );
  }
}

// 🗑️ SOFT DELETE ФИЗЛИЦА
async function softDeleteIndividual(req, res) {
  try {
    const uuid = req.url.split("/").pop();

    console.log("Soft deleting individual:", uuid);

    const result = await query(
      `UPDATE cat2__individuals 
       SET 
         cat2__deleted = true, 
         cat2__deletedate = NOW(), 
         cat2__updatedate = NOW()
       WHERE cat2__uuid = $1
       RETURNING cat2__uuid`,
      [uuid]
    );

    if (result.rows.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Физическое лицо не найдено",
        })
      );
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        message: "Физическое лицо удалено",
      })
    );
  } catch (error) {
    console.error("Error deleting individual:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error: " + error.message,
      })
    );
  }
}

// 🔄 ВОССТАНОВЛЕНИЕ ФИЗЛИЦА
async function restoreIndividual(req, res) {
  try {
    const uuid = req.url.split("/").pop();
    console.log("Restoring individual:", uuid);

    const result = await query(
      `UPDATE cat2__individuals 
       SET 
         cat2__deleted = false, 
         cat2__deletedate = NULL, 
         cat2__updatedate = NOW()
       WHERE cat2__uuid = $1
       RETURNING cat2__uuid`,
      [uuid]
    );

    if (result.rows.length === 0) {
      res.writeHead(404, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Физическое лицо не найдено",
        })
      );
    }

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        message: "Физическое лицо восстановлено",
      })
    );
  } catch (error) {
    console.error("Error restoring individual:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error: " + error.message,
      })
    );
  }
}

module.exports = {
  ping,
  dbTest,
  getIndividuals,
  getIndividual,
  createIndividual,
  updateIndividual,
  softDeleteIndividual,
  restoreIndividual,
};
