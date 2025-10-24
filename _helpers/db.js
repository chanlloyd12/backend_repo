const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

const db = {};
let sequelize;

initialize();

async function initialize() {
    // 1. Prioritize using DATABASE_URL environment variable for deployment (e.g., Railway)
    const databaseUrl = process.env.DATABASE_URL;

    if (databaseUrl) {
        // Use the full connection string provided by the environment
        sequelize = new Sequelize(databaseUrl, {
            // Note: Railway often provisions PostgreSQL, but since your original code used 'mysql', 
            // I've kept the dialect here. You might need to change this if your Railway database is Postgres.
            dialect: 'mysql', 
            logging: false, // Set to true for debugging SQL queries
        });

        console.log('Using DATABASE_URL from environment variables for connection.');
        
        // No need to create the database when using a full DATABASE_URL; it already exists.

    } else {
        // 2. Fallback to local config.json for development environment

        const { host, port, user, password, database } = config.database;
        
        // Connect to MySQL server to create database if it doesn't exist (for local setup)
        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        
        // Connect to the database
        sequelize = new Sequelize(database, user, password, { dialect: 'mysql' });

        console.log('Using local config.json for connection.');
    }
    
    db.sequelize = sequelize;

    // init models
    db.Account = require('../accounts/account.model')(sequelize);
    db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
    db.Employee = require('../employees/employee.model')(sequelize);
    db.Request = require('../requests/request.model')(sequelize);
    db.Workflow = require('../workflows/workflow.model')(sequelize);
    db.Transfer = require('../transfers/transfer.model')(sequelize);
    db.Department = require('../departments/department.model')(sequelize);

    // relationships
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

    // Sync all models with the database
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
