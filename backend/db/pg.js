/* global process */

const { Pool } = require("pg");
const DatabaseError = require("./databaseError");

// Покажем, какие переменные реально читает Node.js
console.log("DB CONFIG: ", {
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Создаем пул подключений с вашими переменными из .env
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

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
};
