const config = require('../config.json');
const mysql = require('mysql2/promise');
const { Sequelize } = require('sequelize');

const db = {};
let sequelize;

initialize();

async function initialize() {
    try {
        const { host, port, user, password, database } = config.database;

        // Create database if it doesn't exist
        const connection = await mysql.createConnection({ host, port, user, password });
        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\`;`);
        await connection.end();

        // Initialize Sequelize
        sequelize = new Sequelize(database, user, password, { 
            host,
            port,
            dialect: 'mysql',
            logging: false, // Disable SQL logging, remove if you want logs
        });
        db.sequelize = sequelize;

        // Initialize models
        db.Account = require('../accounts/account.model')(sequelize);
        db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
        db.Employee = require('../employees/employee.model')(sequelize);
        db.Request = require('../requests/request.model')(sequelize);
        db.Workflow = require('../workflows/workflow.model')(sequelize);
        db.Transfer = require('../transfers/transfer.model')(sequelize);
        db.Department = require('../departments/department.model')(sequelize);
        db.Position = require('../positions/position.model')(sequelize);

        // Define relationships
        db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'employee' });
        db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

        db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'refreshTokens' });
        db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

        db.Employee.hasMany(db.Request, { foreignKey: 'employeeId', as: 'requests' });
        db.Request.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

        db.Employee.hasMany(db.Transfer, { foreignKey: 'employeeId', as: 'transfers' });
        db.Transfer.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

        db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
        db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

        db.Department.hasMany(db.Position, { foreignKey: 'departmentId', as: 'positions' });
        db.Position.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

        db.Position.hasMany(db.Employee, { foreignKey: 'positionId', as: 'employees' });
        db.Employee.belongsTo(db.Position, { foreignKey: 'positionId', as: 'position' });

        db.Transfer.hasOne(db.Workflow, { foreignKey: 'transferId', as: 'workflow' });
        db.Workflow.belongsTo(db.Transfer, { foreignKey: 'transferId', as: 'transfer' });

        db.Request.hasOne(db.Workflow, { foreignKey: 'requestId', as: 'workflow' });
        db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });

        db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows' });
        db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

        // Sync models with DB
        await sequelize.sync({ alter: true }); // Use { force: true } to drop & recreate tables

        console.log('Database initialized successfully.');
    } catch (error) {
        console.error('Database initialization failed:', error);
        process.exit(1);
    }
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