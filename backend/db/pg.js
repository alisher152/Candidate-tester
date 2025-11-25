/* global process */

const { Pool } = require("pg");
const DatabaseError = require("./databaseError");
const path = require("path");

// Загружаем переменные окружения из .env файла
require("dotenv").config({ path: path.resolve(__dirname, "../../.env") });

// Покажем, какие переменные реально читает Node.js
console.log("DB CONFIG: ", {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD ? "***" : undefined,
  port: process.env.DB_PORT,
});

// Создаем пул подключений с вашими переменными из .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
});

// Обработка ошибок подключения
pool.on("error", (err, client) => {
  console.error("Unexpected error on idle client", err);
  process.exit(-1);
});

// Тестовое подключение к базе данных
const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log("✅ PostgreSQL connected successfully");
    client.release();
  } catch (err) {
    console.error("❌ PostgreSQL connection error:", err.message);
  }
};

// Вызываем тест подключения при старте
testConnection();

module.exports = {
  query: (text, params, callback) => {
    return new Promise(function (resolve, reject) {
      pool.query(text, params, (err, res) => {
        if (err) {
          return reject(new DatabaseError(err, text));
        }
        if (typeof callback === "function") return resolve(callback(err, res));
        resolve(res);
      });
    });
  },
  getClient: async () => {
    return await pool.connect();
  },
  // Добавляем метод для тестирования подключения
  testConnection,
};
