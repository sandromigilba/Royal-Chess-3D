import mysql from 'mysql2/promise';

let pool: mysql.Pool;

async function initDb() {
  const host = process.env.MYSQL_HOST || 'localhost';
  const user = process.env.MYSQL_USER || 'root';
  const password = process.env.MYSQL_PASSWORD || '';
  const database = process.env.MYSQL_DATABASE || 'chess_3d';
  const port = parseInt(process.env.MYSQL_PORT || '3306');

  // TiDB Cloud (Serverless) or other secure cloud DBs require SSL
  const ssl = process.env.MYSQL_SSL === 'true' ? {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: process.env.MYSQL_SSL_REJECT_UNAUTHORIZED !== 'false',
  } : undefined;

  try {
    // Create connection first to create the database if it doesn't exist
    const connection = await mysql.createConnection({
      host,
      user,
      password,
      port,
      ssl,
    });

    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\``);
    await connection.end();

    // Create the connection pool
    pool = mysql.createPool({
      host,
      user,
      password,
      database,
      port,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      ssl,
    });

    // Create table if not exists
    await pool.query(`
      CREATE TABLE IF NOT EXISTS games (
        id INT AUTO_INCREMENT PRIMARY KEY,
        invite_code VARCHAR(10) UNIQUE NOT NULL,
        game_mode VARCHAR(20) NOT NULL,
        fen VARCHAR(255) NOT NULL,
        turn VARCHAR(2) NOT NULL,
        player_white_id VARCHAR(50),
        player_black_id VARCHAR(50),
        history TEXT,
        fen_history TEXT,
        last_move VARCHAR(255),
        white_time INT,
        black_time INT,
        initial_time INT,
        is_game_over BOOLEAN DEFAULT FALSE,
        game_over_reason VARCHAR(50),
        winner VARCHAR(10),
        last_move_at TIMESTAMP NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )
    `);

    console.log('MySQL Database initialized successfully.');
  } catch (error) {
    console.error('Error initializing MySQL database:', error);
    throw error;
  }
}

// Initialize on load
let initPromise: Promise<void> | null = null;

export async function getDb(): Promise<mysql.Pool> {
  if (!initPromise) {
    initPromise = initDb();
  }
  await initPromise;
  return pool;
}

export async function query(sql: string, params?: any[]): Promise<any> {
  const dbPool = await getDb();
  const [results] = await dbPool.query(sql, params);
  return results;
}
