const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

const db = {};
let sequelize;

initialize();

async function initialize() {
    // 1. Determine the connection parameters based on the environment
    let connectionUrl, host, port, user, password, database;

    if (process.env.DATABASE_URL) {
        // 🚀 PRODUCTION: Use the single DATABASE_URL environment variable (from Render)
        connectionUrl = process.env.DATABASE_URL;
    } else {
        // 💻 DEVELOPMENT: Fallback to local config.json file
        ({ host, port, user, password, database } = config.database);
    }

    // --- Conditional Database Creation Logic (Only for Local Dev) ---
    if (!connectionUrl) {
        // Connect to the raw MySQL server
        const connection = await mysql.createConnection({ host, port, user, password });
        // Create the specific database if it doesn't exist
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
    }

    // 2. Initialize Sequelize
    if (connectionUrl) {
        // Initialize Sequelize using the full connection URL for production
        sequelize = new Sequelize(connectionUrl, {
            dialect: 'mysql',
            dialectOptions: {
                // REQUIRED for external cloud connections (e.g., Render to Railway)
                ssl: {
                    rejectUnauthorized: false 
                }
            },
            logging: false
        });
    } else {
        // Initialize Sequelize using individual config values for local development
        sequelize = new Sequelize(database, user, password, { 
            dialect: 'mysql', 
            host: host,
            port: port,
            logging: console.log
        });
    }

    db.sequelize = sequelize;

    // 3. Initialize Models
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.Employee = require('../employees/employee.model')(sequelize);
    db.Request = require('../requests/request.model')(sequelize);
    db.Workflow = require('../workflows/workflow.model')(sequelize);
    db.Transfer = require('../transfers/transfer.model')(sequelize);
    db.Department = require('../departments/department.model')(sequelize);

    // 4. Define Relationships (your original relationships are preserved)
    db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'employee' });
    db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });
    db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'refreshTokens' });
    db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });
    db.Employee.hasMany(db.Request, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'requests' });
    db.Request.belongsTo(db.Employee, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'employee' });
    db.Employee.hasMany(db.Transfer, { foreignKey: 'employeeId', as: 'transfers' });
    db.Transfer.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
    db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
    db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });
    db.Transfer.hasOne(db.Workflow, { as: 'workflow', foreignKey: 'transferId' });
    db.Workflow.belongsTo(db.Transfer, { foreignKey: 'transferId', as: 'transfer' });
    db.Request.hasOne(db.Workflow, { foreignKey: 'requestId', as: 'workflow' });
    db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });
    db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows' });
    db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

    // 5. Sync Models to Database (Non-destructive)
    // 🚨 IMPORTANT: Ensure this is NOT set to { force: true } unless you want to wipe data!
    await sequelize.sync({});
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

//     // relationships
//     db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'employee' });
//     db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

//     db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'refreshTokens' });
//     db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

//     db.Employee.hasMany(db.Request, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'requests' });
//     db.Request.belongsTo(db.Employee, { foreignKey: { name: 'employeeId', field: 'employeeId' }, as: 'employee' });

//     db.Employee.hasMany(db.Transfer, { foreignKey: 'employeeId', as: 'transfers' });
//     db.Transfer.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

//     db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
//     db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

//     db.Transfer.hasOne(db.Workflow, { as: 'workflow', foreignKey: 'transferId' });
//     db.Workflow.belongsTo(db.Transfer, { foreignKey: 'transferId', as: 'transfer' });

//     db.Request.hasOne(db.Workflow, { foreignKey: 'requestId', as: 'workflow' });
//     db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });

//     db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows' });
//     db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

//     await sequelize.sync({});
// }

// module.exports = db;
