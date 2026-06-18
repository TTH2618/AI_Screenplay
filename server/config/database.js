const mysql = require('mysql2/promise');
const { Pool } = require('pg');
require('dotenv').config({ path: require('path').join(__dirname, '..', '..', '.env') });

let activeDbType = null; // 'mysql' or 'postgres'
let mysqlPool = null;
let pgPool = null;

// Initialize connection details
const mysqlConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'ai_screenplay',
    port: parseInt(process.env.DB_PORT || 3306),
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    charset: 'utf8mb4'
};

const pgConfig = {
    host: process.env.PG_HOST || 'localhost',
    user: process.env.PG_USER || 'postgres',
    password: process.env.PG_PASSWORD || '',
    database: process.env.PG_NAME || 'ai_screenplay',
    port: parseInt(process.env.PG_PORT || 5432),
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
};

// Try connecting to MySQL
async function tryConnectMysql() {
    try {
        const pool = mysql.createPool(mysqlConfig);
        const connection = await pool.getConnection();
        connection.release();
        return pool;
    } catch (e) {
        return null;
    }
}

// Try connecting to PostgreSQL
async function tryConnectPg() {
    try {
        const pool = new Pool(pgConfig);
        await pool.query('SELECT NOW()');
        return pool;
    } catch (e) {
        // Error code 3D000 means database does not exist
        if (e.code === '3D000') {
            console.log(`⚠️ Database PostgreSQL "${pgConfig.database}" chưa tồn tại. Đang tiến hành tạo mới...`);
            try {
                const tempPool = new Pool({ ...pgConfig, database: 'postgres' });
                // We use PG query without parameters for DDL statements like CREATE DATABASE
                await tempPool.query(`CREATE DATABASE "${pgConfig.database}"`);
                await tempPool.end();
                console.log(`✅ Đã tạo cơ sở dữ liệu PostgreSQL "${pgConfig.database}" thành công.`);
                
                const pool = new Pool(pgConfig);
                await pool.query('SELECT NOW()');
                return pool;
            } catch (createErr) {
                return null;
            }
        }
        return null;
    }
}

async function ensurePgIndexes(pgClient) {
    try {
        await pgClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_scripts_project_scene" ON "scripts" ("project_id", "type", "scene_number")`);
        await pgClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "username" ON "users" ("username")`);
        await pgClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "email" ON "users" ("email")`);
        await pgClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "order_code" ON "payment_orders" ("order_code")`);
        await pgClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "setting_key" ON "payment_settings" ("setting_key")`);
        await pgClient.query(`CREATE UNIQUE INDEX IF NOT EXISTS "uq_tool_id" ON "system_prompts" ("tool_id")`);
    } catch (e) {
        // Soft error if tables do not exist yet (expected before first migration)
    }
}

// Database initial configuration
const initPromise = (async () => {
    const preferredType = (process.env.DB_TYPE || 'mysql').toLowerCase();
    console.log(`🔌 Khởi tạo kết nối DB. Ưu tiên: ${preferredType}`);
    
    if (preferredType === 'postgres') {
        pgPool = await tryConnectPg();
        if (pgPool) {
            activeDbType = 'postgres';
            console.log('✅ Kết nối PostgreSQL thành công (ưu tiên)!');
            await ensurePgIndexes(pgPool);
            // Try connecting to MySQL to copy if needed
            mysqlPool = await tryConnectMysql();
            if (mysqlPool) {
                console.log('✅ Kết nối MySQL phụ thành công. Đang tiến hành đồng bộ dữ liệu sang PostgreSQL...');
                await migrateMysqlToPostgres();
            }
        } else {
            console.log('⚠️ PostgreSQL thất bại, chuyển hướng sang MySQL...');
            mysqlPool = await tryConnectMysql();
            if (mysqlPool) {
                activeDbType = 'mysql';
                console.log('✅ Kết nối MySQL thành công (fallback)!');
            }
        }
    } else {
        // MySQL first
        mysqlPool = await tryConnectMysql();
        if (mysqlPool) {
            activeDbType = 'mysql';
            console.log('✅ Kết nối MySQL thành công (ưu tiên)!');
            // Try connecting to PostgreSQL to check copy/fallback
            pgPool = await tryConnectPg();
            if (pgPool) {
                console.log('✅ Kết nối PostgreSQL phụ thành công. Đang tiến hành đồng bộ dữ liệu sang PostgreSQL...');
                await migrateMysqlToPostgres();
            }
        } else {
            console.log('⚠️ MySQL thất bại, chuyển hướng sang PostgreSQL...');
            pgPool = await tryConnectPg();
            if (pgPool) {
                activeDbType = 'postgres';
                console.log('✅ Kết nối PostgreSQL thành công (fallback)!');
                await ensurePgIndexes(pgPool);
            }
        }
    }
    
    if (!activeDbType) {
        console.error('❌ KHÔNG THỂ kết nối đến cả MySQL và PostgreSQL!');
    } else {
        console.log(`🎯 Cơ sở dữ liệu đang hoạt động: ${activeDbType.toUpperCase()}`);
    }
})();

// Ensure DB is initialized before executing queries
async function ensureDbInitialized() {
    await initPromise;
}

function mapMysqlTypeToPg(col) {
    let type = col.Type.toLowerCase();
    const isAutoIncrement = col.Extra && col.Extra.toLowerCase().includes('auto_increment');
    
    if (isAutoIncrement) {
        if (type.includes('bigint')) {
            return 'BIGSERIAL PRIMARY KEY';
        }
        return 'SERIAL PRIMARY KEY';
    }
    
    let pgType = '';
    if (type.includes('bigint')) {
        pgType = 'BIGINT';
    } else if (type.includes('int')) {
        pgType = 'INTEGER';
    } else if (type.includes('varchar')) {
        const match = type.match(/varchar\((\d+)\)/);
        pgType = match ? `VARCHAR(${match[1]})` : 'VARCHAR(255)';
    } else if (type.includes('text') || type.includes('longtext')) {
        pgType = 'TEXT';
    } else if (type.includes('decimal')) {
        const match = type.match(/decimal\((\d+),(\d+)\)/);
        pgType = match ? `DECIMAL(${match[1]}, ${match[2]})` : 'DECIMAL(12, 4)';
    } else if (type.includes('datetime') || type.includes('timestamp')) {
        pgType = 'TIMESTAMP';
    } else if (type.includes('enum')) {
        pgType = 'VARCHAR(50)';
    } else if (type.includes('double') || type.includes('float')) {
        pgType = 'DOUBLE PRECISION';
    } else if (type.includes('tinyint(1)') || type === 'boolean') {
        pgType = 'BOOLEAN';
    } else if (type.includes('tinyint')) {
        pgType = 'SMALLINT';
    } else {
        pgType = 'TEXT';
    }
    
    if (col.Null === 'NO' && !pgType.includes('PRIMARY KEY')) {
        pgType += ' NOT NULL';
    }
    
    if (col.Default !== null && col.Default !== undefined) {
        if (col.Default.toUpperCase() === 'CURRENT_TIMESTAMP' || col.Default.toLowerCase() === 'current_timestamp()') {
            pgType += ' DEFAULT CURRENT_TIMESTAMP';
        } else {
            pgType += ` DEFAULT '${col.Default}'`;
        }
    }
    
    if (col.Key === 'PRI' && !isAutoIncrement) {
        pgType += ' PRIMARY KEY';
    } else if (col.Key === 'UNI') {
        pgType += ' UNIQUE';
    }
    
    return pgType;
}

async function pgBatchInsert(tableName, columns, rows) {
    if (rows.length === 0) return;
    const batchSize = Math.floor(60000 / columns.length);
    for (let i = 0; i < rows.length; i += batchSize) {
        const chunk = rows.slice(i, i + batchSize);
        let valueParams = [];
        let values = [];
        let pIndex = 1;
        for (const row of chunk) {
            let rowParams = [];
            for (const col of columns) {
                rowParams.push(`$${pIndex++}`);
                let val = row[col];
                if (val !== null && typeof val === 'object') {
                    if (val instanceof Date) {
                        // Keep Date objects as is
                    } else {
                        val = JSON.stringify(val);
                    }
                }
                values.push(val);
            }
            valueParams.push(`(${rowParams.join(', ')})`);
        }
        const queryText = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${valueParams.join(', ')}`;
        await pgPool.query(queryText, values);
    }
}

async function migrateMysqlToPostgres() {
    try {
        console.log('🔄 Đang đồng bộ hóa dữ liệu từ MySQL sang PostgreSQL...');
        
        // 1. Lấy danh sách bảng từ MySQL
        const [tablesInfo] = await mysqlPool.execute('SHOW TABLES');
        const dbName = mysqlConfig.database;
        const keyName = `Tables_in_${dbName}`;
        let tables = tablesInfo.map(t => t[keyName]);
        
        console.log(`📋 Các bảng tìm thấy trong MySQL: ${tables.join(', ')}`);
        
        // 2. Định nghĩa cấu trúc bảng trong PostgreSQL
        // Sắp xếp thứ tự tạo bảng để tránh lỗi khóa ngoại
        const creationOrder = ['users', 'projects'];
        tables.sort((a, b) => {
            const idxA = creationOrder.indexOf(a);
            const idxB = creationOrder.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
            return 0;
        });
        
        // Tạo bảng trong PostgreSQL nếu chưa tồn tại
        for (const tableName of tables) {
            const [columns] = await mysqlPool.execute(`SHOW COLUMNS FROM \`${tableName}\``);
            
            const colDefinitions = [];
            for (const col of columns) {
                const pgType = mapMysqlTypeToPg(col);
                colDefinitions.push(`"${col.Field}" ${pgType}`);
            }
            
            const createTableSql = `CREATE TABLE IF NOT EXISTS "${tableName}" (\n  ${colDefinitions.join(',\n  ')}\n)`;
            await pgPool.query(createTableSql);
        }
        
        // 2.5 Tạo unique indexes trong PostgreSQL để hỗ trợ ON CONFLICT
        for (const tableName of tables) {
            const [indexes] = await mysqlPool.execute(`SHOW INDEX FROM \`${tableName}\` WHERE Non_unique = 0`);
            const indexGroups = {};
            for (const idx of indexes) {
                const keyName = idx.Key_name;
                if (keyName === 'PRIMARY') continue;
                if (!indexGroups[keyName]) {
                    indexGroups[keyName] = [];
                }
                indexGroups[keyName].push(idx.Column_name);
            }
            
            for (const [keyName, columns] of Object.entries(indexGroups)) {
                const createIndexSql = `CREATE UNIQUE INDEX IF NOT EXISTS "${keyName}" ON "${tableName}" (${columns.map(c => `"${c}"`).join(', ')})`;
                await pgPool.query(createIndexSql);
            }
        }
        
        // 3. Truncate bảng trong PG theo thứ tự ngược để tránh lỗi khóa ngoại
        const reverseOrder = [...tables].reverse();
        for (const tableName of reverseOrder) {
            try {
                await pgPool.query(`TRUNCATE TABLE "${tableName}" CASCADE`);
            } catch (e) {
                console.error(`⚠️ Lỗi truncate bảng ${tableName}:`, e.message);
            }
        }
        
        // 4. Copy dữ liệu từ MySQL sang PG theo thứ tự xuôi
        for (const tableName of tables) {
            const [rows] = await mysqlPool.execute(`SELECT * FROM \`${tableName}\``);
            if (rows.length === 0) continue;
            
            const columns = Object.keys(rows[0]);
            
            await pgBatchInsert(tableName, columns, rows);
            console.log(`✅ Đồng bộ thành công ${rows.length} dòng cho bảng "${tableName}"`);
            
            // Cập nhật SEQUENCE của ID nếu bảng dùng auto_increment
            const [idCol] = await mysqlPool.execute(`SHOW COLUMNS FROM \`${tableName}\` WHERE Extra LIKE '%auto_increment%'`);
            if (idCol.length > 0) {
                const maxIdResult = await pgPool.query(`SELECT MAX(id) AS max_id FROM "${tableName}"`);
                const maxId = maxIdResult.rows[0].max_id || 0;
                if (maxId > 0) {
                    await pgPool.query(`SELECT setval(pg_get_serial_sequence('"${tableName}"', 'id'), $1)`, [maxId]);
                }
            }
        }
        
        console.log('✅ Đồng bộ dữ liệu MySQL -> PostgreSQL hoàn tất thành công!');
    } catch (error) {
        console.error('❌ Lỗi trong quá trình đồng bộ hóa:', error.message);
    }
}

function convertPlaceholders(sql) {
    let result = '';
    let placeholderIndex = 1;
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let escape = false;

    for (let i = 0; i < sql.length; i++) {
        const char = sql[i];
        if (escape) {
            result += char;
            escape = false;
            continue;
        }
        if (char === '\\') {
            result += char;
            escape = true;
            continue;
        }
        if (char === "'" && !inDoubleQuote) {
            inSingleQuote = !inSingleQuote;
            result += char;
        } else if (char === '"' && !inSingleQuote) {
            inDoubleQuote = !inDoubleQuote;
            result += char;
        } else if (char === '?' && !inSingleQuote && !inDoubleQuote) {
            result += `$${placeholderIndex++}`;
        } else {
            result += char;
        }
    }
    return result;
}

function translateCreateQuery(sql) {
    // 1. Remove ENGINE=InnoDB and trailing options
    sql = sql.replace(/ENGINE\s*=\s*\w+[^;]*/gi, '');
    sql = sql.replace(/DEFAULT\s+CHARSET\s*=\s*\w+[^;]*/gi, '');
    sql = sql.replace(/COLLATE\s*=\s*\w+[^;]*/gi, '');
    
    // 2. Remove in-table indexes (e.g. INDEX idx_name (col))
    sql = sql.replace(/,\s*INDEX\s+\w+\s*\([^)]+\)/gi, '');
    sql = sql.replace(/INDEX\s+\w+\s*\([^)]+\)\s*,?/gi, '');
    
    // 3. Replace AUTO_INCREMENT
    sql = sql.replace(/(\w+)\s+INT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, '$1 SERIAL PRIMARY KEY');
    sql = sql.replace(/(\w+)\s+BIGINT\s+AUTO_INCREMENT\s+PRIMARY\s+KEY/gi, '$1 BIGSERIAL PRIMARY KEY');
    sql = sql.replace(/(\w+)\s+INT\s+AUTO_INCREMENT/gi, '$1 SERIAL');
    sql = sql.replace(/(\w+)\s+BIGINT\s+AUTO_INCREMENT/gi, '$1 BIGSERIAL');
    
    // 4. Replace DATETIME and ENUM
    sql = sql.replace(/DATETIME/gi, 'TIMESTAMP');
    sql = sql.replace(/ENUM\s*\([^)]+\)/gi, 'VARCHAR(50)');
    
    // 5. Replace ON UPDATE CURRENT_TIMESTAMP
    sql = sql.replace(/ON\s+UPDATE\s+CURRENT_TIMESTAMP(\(\))?/gi, '');
    
    // 6. Fix trailing commas inside parentheses
    sql = sql.replace(/,\s*\)/g, '\n)');
    
    return sql;
}

function translateQuery(sql) {
    if (activeDbType === 'postgres') {
        const trimmed = sql.trim();
        const upperTrimmed = trimmed.toUpperCase();
        
        if (upperTrimmed.startsWith('CREATE')) {
            sql = translateCreateQuery(sql);
        }
        
        // 1. Convert backticks to double quotes
        sql = sql.replace(/\`([a-zA-Z0-9_]+)\`/g, '"$1"');
        
        // 2. Replace ON DUPLICATE KEY UPDATE with ON CONFLICT DO UPDATE
        if (sql.toUpperCase().includes('ON DUPLICATE KEY UPDATE')) {
            let conflictKey = '';
            const upperSql = sql.toUpperCase();
            if (upperSql.includes('SYSTEM_PROMPTS')) {
                conflictKey = 'tool_id';
            } else if (upperSql.includes('PAYMENT_SETTINGS')) {
                conflictKey = 'setting_key';
            } else if (upperSql.includes('PAYMENT_ORDERS')) {
                conflictKey = 'order_code';
            } else if (upperSql.includes('SCRIPTS')) {
                conflictKey = 'project_id, type, scene_number';
            }
            
            let updatePart = sql.substring(sql.toLowerCase().indexOf('on duplicate key update') + 'on duplicate key update'.length);
            updatePart = updatePart.replace(/VALUES\((.*?)\)/gi, 'EXCLUDED.$1');
            
            const insertPart = sql.substring(0, sql.toLowerCase().indexOf('on duplicate key update'));
            sql = `${insertPart} ON CONFLICT (${conflictKey}) DO UPDATE SET ${updatePart}`;
        }
        
        // 3. Translate CURDATE() -> CURRENT_DATE
        sql = sql.replace(/CURDATE\(\)/gi, 'CURRENT_DATE');
        
        // 4. Translate YEARWEEK(..., 1) -> to_char(..., 'IYYYIW')
        sql = sql.replace(/YEARWEEK\((.*?), 1\)/gi, "to_char($1, 'IYYYIW')");
        sql = sql.replace(/YEARWEEK\((.*?)\)/gi, "to_char($1, 'IYYYIW')");
        
        // 5. Translate YEAR(...) -> EXTRACT(YEAR FROM ...)
        sql = sql.replace(/YEAR\((.*?)\)/gi, 'EXTRACT(YEAR FROM $1)');
        
        // 6. Translate MONTH(...) -> EXTRACT(MONTH FROM ...)
        sql = sql.replace(/MONTH\((.*?)\)/gi, 'EXTRACT(MONTH FROM $1)');
        
        // 7. Translate DATE(created_at) or DATE(updated_at) -> created_at::date
        sql = sql.replace(/DATE\((.*?)\)/gi, 'CAST($1 AS DATE)');
        
        // 8. Translate DATE_SUB(..., INTERVAL ... DAY) -> ... - (... * INTERVAL '1 day')
        sql = sql.replace(/DATE_SUB\((.*?), INTERVAL (.*?) DAY\)/gi, "($1 - (CAST($2 AS INTEGER) * INTERVAL '1 day'))");
        
        // 9. Translate DATE_FORMAT(..., '%Y-%m-%d') -> to_char(..., 'YYYY-MM-DD')
        sql = sql.replace(/DATE_FORMAT\((.*?), '%Y-%m-%d'\)/gi, "to_char($1, 'YYYY-MM-DD')");
        
        // 10. For INSERT queries, append RETURNING id if not present
        const isInsert = upperTrimmed.startsWith('INSERT');
        if (isInsert && !upperTrimmed.includes('RETURNING')) {
            sql += ' RETURNING id';
        }
        
        // 11. Convert ? placeholders to $1, $2...
        sql = convertPlaceholders(sql);
    }
    return sql;
}

async function query(sql, params) {
    await ensureDbInitialized();
    if (!activeDbType) {
        throw new Error('Không có kết nối cơ sở dữ liệu nào hoạt động.');
    }
    
    if (activeDbType === 'postgres') {
        const pgSql = translateQuery(sql);
        try {
            const pgResult = await pgPool.query(pgSql, params || []);
            const queryType = sql.trim().split(/\s+/)[0].toUpperCase();
            const isSelect = ['SELECT', 'SHOW', 'DESCRIBE', 'EXPLAIN'].includes(queryType);
            
            if (isSelect) {
                return pgResult.rows;
            } else {
                return {
                    insertId: pgResult.rows && pgResult.rows[0] ? pgResult.rows[0].id : null,
                    affectedRows: pgResult.rowCount,
                    rows: pgResult.rows
                };
            }
        } catch (error) {
            console.error('Lỗi query PostgreSQL:', error.message, '\nSQL Gốc:', sql, '\nSQL Dịch:', pgSql);
            throw error;
        }
    } else {
        // MySQL
        try {
            const [results] = await mysqlPool.execute(sql, params);
            return results;
        } catch (error) {
            console.error('Lỗi query MySQL:', error.message, '\nSQL:', sql);
            throw error;
        }
    }
}

async function testConnection() {
    await ensureDbInitialized();
    if (!activeDbType) return false;
    
    if (activeDbType === 'postgres') {
        try {
            const res = await pgPool.query('SELECT NOW()');
            console.log('✅ Kết nối PostgreSQL thành công!');
            console.log(`📦 Database: ${process.env.PG_NAME}`);
            return true;
        } catch (error) {
            console.error('❌ Lỗi kết nối PostgreSQL:', error.message);
            return false;
        }
    } else {
        try {
            const connection = await mysqlPool.getConnection();
            console.log('✅ Kết nối MySQL thành công!');
            console.log(`📦 Database: ${process.env.DB_NAME}`);
            connection.release();
            return true;
        } catch (error) {
            console.error('❌ Lỗi kết nối MySQL:', error.message);
            return false;
        }
    }
}

const poolWrapper = {
    async execute(sql, params) {
        const results = await query(sql, params);
        return [results, null];
    },
    async query(sql, params) {
        const results = await query(sql, params);
        return [results, null];
    },
    async getConnection() {
        return {
            execute: async (sql, params) => {
                const results = await query(sql, params);
                return [results, null];
            },
            query: async (sql, params) => {
                const results = await query(sql, params);
                return [results, null];
            },
            release: () => {}
        };
    }
};

module.exports = {
    pool: poolWrapper,
    query,
    testConnection
};
