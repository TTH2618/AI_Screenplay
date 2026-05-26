const mysql = require('mysql2/promise');
require('dotenv').config();

async function run() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'ai_screenplay',
        port: process.env.DB_PORT || 3306
    });

    const sql = `CREATE TABLE IF NOT EXISTS payment_orders (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id INT NOT NULL,
        order_code BIGINT UNIQUE NOT NULL,
        package_id VARCHAR(20) NOT NULL,
        amount INT NOT NULL,
        description VARCHAR(255),
        status ENUM('pending','paid','cancelled','expired') DEFAULT 'pending',
        checkout_url TEXT,
        payment_link_id VARCHAR(100),
        paid_at DATETIME,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_user_id (user_id),
        INDEX idx_order_code (order_code),
        INDEX idx_status (status)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`;

    await pool.execute(sql);
    console.log('✅ Table payment_orders created successfully!');
    process.exit(0);
}

run().catch(e => {
    console.error('❌ Error:', e.message);
    process.exit(1);
});
