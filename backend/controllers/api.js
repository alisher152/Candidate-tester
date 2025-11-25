// backend/controllers/api.js
const { query } = require("../db/pg");

// 🔧 Утилиты
function buildWhereClause(filters) {
  const conditions = ["cat2__deleted = false"];
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

  if (filters.deleted === "true") {
    conditions.push("cat2__deleted = true");
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
      SELECT cat2__uuid, cat2__code, cat2__represent, 
             cat2__surname, cat2__name, cat2__patronymic,
             cat2__insertdate, cat2__updatedate, cat2__deleted
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
        error: "Internal server error",
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
      `SELECT cat2__uuid, cat2__code, cat2__represent, 
              cat2__surname, cat2__name, cat2__patronymic,
              cat2__insertdate, cat2__updatedate, cat2__deleted
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
        error: "Internal server error",
      })
    );
  }
}

// ✅ СОЗДАНИЕ ФИЗЛИЦА
async function createIndividual(req, res) {
  console.log("🎯 createIndividual API CALLED!");

  try {
    let body = "";

    for await (const chunk of req) {
      body += chunk.toString();
    }

    console.log("Request body:", body);

    if (!body) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Empty request body",
        })
      );
    }

    const { code, surname, name, patronymic } = JSON.parse(body);

    console.log("Parsed data:", { code, surname, name, patronymic });

    // Валидация
    if (!code || code.length !== 12) {
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

    if (!surname || !name) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Фамилия и имя обязательны",
        })
      );
    }

    // Проверка уникальности ИИН
    const existing = await query(
      "SELECT cat2__uuid FROM cat2__individuals WHERE cat2__code = $1 AND cat2__deleted = false",
      [code]
    );

    if (existing.rows.length > 0) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Физлицо с таким ИИН уже существует",
        })
      );
    }

    const represent = `${surname} ${name} ${patronymic || ""}`.trim();

    // Вставляем в базу
    const result = await query(
      `INSERT INTO cat2__individuals 
       (cat2__code, cat2__represent, cat2__surname, cat2__name, cat2__patronymic) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING cat2__uuid, cat2__code, cat2__represent, cat2__surname, cat2__name, cat2__patronymic`,
      [code, represent, surname, name, patronymic]
    );

    console.log("Insert successful:", result.rows[0]);

    res.writeHead(201, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: true,
        data: result.rows[0],
      })
    );
  } catch (error) {
    console.error("❌ Error in createIndividual:", error);
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

  try {
    const uuid = req.url.split("/").pop();
    let body = "";

    for await (const chunk of req) {
      body += chunk.toString();
    }

    console.log("Update body:", body);
    console.log("UUID:", uuid);

    if (!body) {
      res.writeHead(400, { "Content-Type": "application/json" });
      return res.end(
        JSON.stringify({
          success: false,
          error: "Empty request body",
        })
      );
    }

    const { surname, name, patronymic } = JSON.parse(body);

    console.log("Parsed update data:", { surname, name, patronymic });

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
       SET cat2__represent = $1, 
           cat2__surname = $2, 
           cat2__name = $3, 
           cat2__patronymic = $4,
           cat2__updatedate = NOW()
       WHERE cat2__uuid = $5
       RETURNING cat2__uuid, cat2__code, cat2__represent, cat2__surname, cat2__name, cat2__patronymic, cat2__updatedate`,
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
       SET cat2__deleted = true, cat2__deletedate = NOW(), cat2__updatedate = NOW()
       WHERE cat2__uuid = $1
       RETURNING cat2__uuid`,
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
        message: "Физлицо удалено",
      })
    );
  } catch (error) {
    console.error("Error deleting individual:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error",
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
       SET cat2__deleted = false, cat2__deletedate = NULL, cat2__updatedate = NOW()
       WHERE cat2__uuid = $1
       RETURNING cat2__uuid`,
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
        message: "Физлицо восстановлено",
      })
    );
  } catch (error) {
    console.error("Error restoring individual:", error);
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        success: false,
        error: "Internal server error",
      })
    );
  }
  function ping(req, res) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ message: "pong" }));
  }

  async function dbTest(req, res) {
    try {
      const result = await query("SELECT NOW()");
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, time: result.rows[0].now }));
    } catch (error) {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: false, error: error.message }));
    }
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
