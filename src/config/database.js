const mysql = require("mysql2/promise");
const config = require("./index");

let pool;
let useInMemoryDB = false;

// In-memory storage for degraded mode
const inMemoryDB = {
  users: [],
  userProfiles: [],
  infoCollectAnswers: [],
  mbtiAnswers: [],
  aiTeamAnswers: [],
  analysisTasks: [],
  analysisResults: [],
  userFeedback: [],
  userReviews: [],
  sysConfigs: [],
  aiLogs: [],
  nextUserId: 1
};

function isDBConfigured() {
  return config.db.password && config.db.password !== '' && config.db.password !== 'your_database_password_here';
}

async function createPool() {
  if (!pool) {
    if (!isDBConfigured()) {
      console.log("⚠️  Database not configured, using in-memory storage");
      useInMemoryDB = true;
      return null;
    }

    try {
      pool = mysql.createPool(config.db);
      const connection = await pool.getConnection();
      console.log("✓ Database connection pool created successfully");
      connection.release();
    } catch (error) {
      console.log("⚠️  Database connection failed, using in-memory storage");
      console.log(`   Error: ${error.message}`);
      useInMemoryDB = true;
      pool = null;
    }
  }
  return pool;
}

async function getPool() {
  if (!pool && !useInMemoryDB) {
    await createPool();
  }
  return pool;
}

async function query(sql, params) {
  if (useInMemoryDB) {
    throw new Error("Database not available");
  }
  const pool = await getPool();
  return pool.query(sql, params);
}

async function transaction(callback) {
  if (useInMemoryDB) {
    throw new Error("Database not available");
  }
  const pool = await getPool();
  const connection = await pool.getConnection();
  await connection.beginTransaction();
  try {
    const result = await callback(connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log("✓ Database connection pool closed");
  }
}

function isUsingInMemoryDB() {
  return useInMemoryDB;
}

function getInMemoryDB() {
  return inMemoryDB;
}

module.exports = {
  createPool,
  getPool,
  query,
  transaction,
  closePool,
  isUsingInMemoryDB,
  getInMemoryDB,
};
