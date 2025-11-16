const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

// Load config.json only if environment variables are not present
let config = {};
if (process.env.NODE_ENV !== 'production' && !process.env.DATABASE_URL) {
    try {
        config = require('../config.json');
    } catch (error) {
        console.warn("config.json not found. Using environment variables or defaults.");
    }
}

const db = {};
let sequelize;

initialize();

async function initialize() {
    // 1. Determine connection method (URL or individual settings)
    let isUrl = false;
    let dbName = '';

    if (process.env.DATABASE_URL) {
        isUrl = true;
        // Simple way to extract DB name from URL for the connection query
        const urlParts = new URL(process.env.DATABASE_URL);
        dbName = urlParts.pathname.substring(1); 
        
    } else {
        dbName = process.env.DB_NAME || config.database?.database;
        // Fallback to individual environment variables or config.json
        const host = process.env.DB_HOST || config.database?.host;
        const port = process.env.DB_PORT || config.database?.port;
        const user = process.env.DB_USER || config.database?.user;
        const password = process.env.DB_PASSWORD || config.database?.password;
        
        if (!host || !user || !dbName) {
            throw new Error("Missing required database configuration (host, user, or database name).");
        }

        // --- Database Creation (Simplified for cleaner connection handling) ---
        // This temporary connection is the one most likely to cause the "Connection lost" error,
        // so we minimize its lifetime.
        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\`;`);
        connection.end(); // Close the temporary connection immediately
        
        sequelize = new Sequelize(dbName, user, password, {
            host: host,
            port: port,
            dialect: 'mysql',
            // Add SSL options if needed for the cloud environment
            dialectOptions: {
                ssl: process.env.NODE_ENV === 'production' ? {
                    rejectUnauthorized: false 
                } : false
            }
        });
    }

    if (isUrl) {
        sequelize = new Sequelize(process.env.DATABASE_URL, {
            dialect: 'mysql',
            dialectOptions: {
                ssl: process.env.NODE_ENV === 'production' ? {
                    require: true,
                    rejectUnauthorized: false
                } : false
            }
        });
    }


    db.sequelize = sequelize;

    // init models (Keep this section as is)
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.Employee = require('../employees/employee.model')(sequelize);
    db.Request = require('../requests/request.model')(sequelize);
    db.Workflow = require('../workflows/workflow.model')(sequelize);
    db.Transfer = require('../transfers/transfer.model')(sequelize);
    db.Department = require('../departments/department.model')(sequelize);
    db.Position = require('../positions/position.model')(sequelize); 

    // relationships (Keep this section as is)
    db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'employee' });
    db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

    db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'refreshTokens' });
    db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });
    // ... all other relationships remain the same

    db.Employee.hasMany(db.Request, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'requests' });
    db.Request.belongsTo(db.Employee, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'employee' });
    db.Employee.hasMany(db.Transfer, { foreignKey: 'employeeId', as: 'transfers' });
    db.Transfer.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
    db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
    db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
    db.Department.hasMany(db.Position, { foreignKey: 'departmentId', as: 'positions' });
    db.Position.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
    db.Position.hasMany(db.Employee, { foreignKey: 'positionId', as: 'employees' });
    db.Employee.belongsTo(db.Position, { foreignKey: 'positionId', as: 'position' });
    db.Transfer.hasOne(db.Workflow, { as: 'workflow', foreignKey: 'transferId' });
    db.Workflow.belongsTo(db.Transfer, { foreignKey: 'transferId', as: 'transfer' });
    db.Request.hasOne(db.Workflow, { foreignKey: 'requestId', as: 'workflow' });
    db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });
    db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows' });
    db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });


    // ----------------------------------------------------------------------
    // 🔥🔥 DANGER ZONE: DROP ALL TABLES EXCEPT 'Account' 🔥🔥
    // ----------------------------------------------------------------------
    const queryInterface = sequelize.getQueryInterface();
    
    // List of tables to drop (in an order that respects foreign keys pointing to each other)
    const tablesToDrop = [
        // Dependent on Request, Transfer
        'Workflows',
        // Dependent on Employee
        'Requests',
        'Transfers',
        // Dependent on Department, Position, Account
        'Employees', 
        // Dependent on Department
        'Positions',
        'Departments',
        // Dependent on Account
        'RefreshTokens',
        // 'Accounts' is deliberately excluded
    ];

    console.log(`\nATTENTION: Forcing drop and re-creation of all tables EXCEPT 'Accounts'.`);

    // Execute drop for each table
    for (const tableName of tablesToDrop) {
        await queryInterface.dropTable(tableName, { cascade: true })
            .then(() => console.log(`   ✅ Dropped table: ${tableName}`))
            .catch(error => {
                // Ignore if table doesn't exist, but log other errors
                if (error.original.code !== 'ER_BAD_TABLE_ERROR') {
                    console.warn(`   ⚠️ Error dropping ${tableName}: ${error.message}`);
                } else {
                    console.log(`   (Table ${tableName} did not exist, skipping drop)`);
                }
            });
    }

    // Now, synchronize all models. This will recreate all dropped tables and ensure 'Account' structure is current.
    await sequelize.sync({}); 
    console.log(`\nDatabase synchronized. All tables re-created. 'Accounts' table data preserved.`);
}

module.exports = db;

// const config = require('../config.json');
// const mysql = require('mysql2/promise');
// const { Sequelize } = require('sequelize');

// const db = {};
// let sequelize;

// initialize();

// async function initialize() {
//     const { host, port, user, password, database } = config.database;
//     const connection = await mysql.createConnection({ host, port, user, password });
//     await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);

//     sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });
//     db.sequelize = sequelize;

//     // init models
//     db.Account = require('../accounts/account.model')(sequelize);
//     db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
//     db.Employee = require('../employees/employee.model')(sequelize);
//     db.Request = require('../requests/request.model')(sequelize);
//     db.Workflow = require('../workflows/workflow.model')(sequelize);
//     db.Transfer = require('../transfers/transfer.model')(sequelize);
//     db.Department = require('../departments/department.model')(sequelize);
//     db.Position = require('../positions/position.model')(sequelize); // <-- ADDED: Position Model

//     // relationships
//     db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'employee' });
//     db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

//     db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'refreshTokens' });
//     db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

//     db.Employee.hasMany(db.Request, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'requests' });
//     db.Request.belongsTo(db.Employee, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'employee' });

//     db.Employee.hasMany(db.Transfer, { foreignKey: 'employeeId', as: 'transfers' });
//     db.Transfer.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

//     // Department <-> Employee (Kept for existing Department service compatibility)
//     db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
//     db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

//     // Position <-> Department (1:N)
//     db.Department.hasMany(db.Position, { foreignKey: 'departmentId', as: 'positions' });
//     db.Position.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

//     // Position <-> Employee (1:N) - Required for position employee count logic
//     // Note: This assumes the Employee model has a 'positionId' foreign key.
//     db.Position.hasMany(db.Employee, { foreignKey: 'positionId', as: 'employees' });
//     db.Employee.belongsTo(db.Position, { foreignKey: 'positionId', as: 'position' });

//     db.Transfer.hasOne(db.Workflow, { as: 'workflow', foreignKey: 'transferId' });
//     db.Workflow.belongsTo(db.Transfer, { foreignKey: 'transferId', as: 'transfer' });

//     db.Request.hasOne(db.Workflow, { foreignKey: 'requestId', as: 'workflow' });
//     db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });

//     db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows' });
//     db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

//     await sequelize.sync({});
// }

// module.exports = db;