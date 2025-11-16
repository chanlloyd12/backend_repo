const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

// Load config.json only if environment variables are not present (e.g., for local development fallback)
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
    let sequelizeOptions = {};
    let dbConfig = {};

    // 1. Check for DATABASE_URL (Standard for many PaaS services like Heroku)
    if (process.env.DATABASE_URL) {
        // Sequelize can parse the full connection string
        sequelize = new Sequelize(process.env.DATABASE_URL, {
            dialect: 'mysql',
            // Required for some hosting environments to maintain connection
            dialectOptions: {
                ssl: process.env.NODE_ENV === 'production' ? {
                    require: true,
                    rejectUnauthorized: false // Adjust this based on your provider's SSL setup
                } : false
            }
        });

    } else {
        // 2. Fallback to individual environment variables or config.json
        const host = process.env.DB_HOST || config.database?.host;
        const port = process.env.DB_PORT || config.database?.port;
        const user = process.env.DB_USER || config.database?.user;
        const password = process.env.DB_PASSWORD || config.database?.password;
        const database = process.env.DB_NAME || config.database?.database;

        // --- Database Creation (Only run if using individual variables/config) ---
        if (!host || !user || !database) {
            throw new Error("Missing required database configuration (host, user, or database name).");
        }

        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        connection.end(); // Close the temporary connection

        // --- Sequelize Initialization ---
        sequelize = new Sequelize(database, user, password, {
            host: host,
            port: port,
            dialect: 'mysql',
            // Add SSL options if needed for the cloud environment
            dialectOptions: {
                ssl: process.env.NODE_ENV === 'production' ? {
                    // require: true, // Uncomment if required
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
    
    // --- START MODIFICATION HERE ---
    
    // ⚠️ WARNING: If Employee has data that other tables reference (e.g., Request, Transfer, Workflow),
    // dropping Employee will cause cascade deletion or foreign key constraint errors
    // unless you drop the dependent tables first, or use a cascade option.
    // For a clean restart, it's often safer to drop dependent tables first.
    
    // 1. Temporarily drop the dependent tables first to avoid foreign key issues
    // This is optional but ensures a clean drop.
    // await db.Workflow.drop();
    // await db.Request.drop();
    // await db.Transfer.drop();

    // 2. Drop and recreate the Employee table
    // Using { force: true } will execute DROP TABLE IF EXISTS `employees`; then CREATE TABLE
    await db.Employee.sync({ force: true });
    
    // 3. Sync all remaining models (including Employee, which was just recreated)
    // This ensures all relationships are properly set up again.
    await sequelize.sync({});
    
    // --- END MODIFICATION HERE ---
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