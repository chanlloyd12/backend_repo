const { Sequelize } = require('sequelize');
const config = require('../config.json');

const db = {};

// Destructure database config
const { host, port, user, password, database } = config.database;

// Initialize Sequelize
const sequelize = new Sequelize(database, user, password, {
  host,
  port,
  dialect: 'mysql',
  logging: false, // Set true if you want SQL logs
});

// Add sequelize instance to db
db.sequelize = sequelize;

// Function to test DB connection
async function testConnection() {
  try {
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully.');
  } catch (err) {
    console.error('❌ Unable to connect to the database:', err.message);
    process.exit(1); // Stop app if DB is unreachable
  }
}

// Initialize models and relationships
function initModels() {
  // Models
  db.Account = require('../accounts/account.model')(sequelize);
  db.RefreshToken = require('../accounts/refresh-token.model')(sequelize);
  db.Employee = require('../employees/employee.model')(sequelize);
  db.Request = require('../requests/request.model')(sequelize);
  db.Workflow = require('../workflows/workflow.model')(sequelize);
  db.Transfer = require('../transfers/transfer.model')(sequelize);
  db.Department = require('../departments/department.model')(sequelize);
  db.Position = require('../positions/position.model')(sequelize);

  // Relationships

  // Account ↔ Employee
  db.Account.hasOne(db.Employee, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'employee' });
  db.Employee.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

  // Account ↔ RefreshToken
  db.Account.hasMany(db.RefreshToken, { foreignKey: 'accountId', onDelete: 'CASCADE', as: 'refreshTokens' });
  db.RefreshToken.belongsTo(db.Account, { foreignKey: 'accountId', as: 'account' });

  // Employee ↔ Request
  db.Employee.hasMany(db.Request, { foreignKey: 'employeeId', as: 'requests' });
  db.Request.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

  // Employee ↔ Transfer
  db.Employee.hasMany(db.Transfer, { foreignKey: 'employeeId', as: 'transfers' });
  db.Transfer.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });

  // Department ↔ Employee
  db.Department.hasMany(db.Employee, { foreignKey: 'departmentId', as: 'employees' });
  db.Employee.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

  // Department ↔ Position
  db.Department.hasMany(db.Position, { foreignKey: 'departmentId', as: 'positions' });
  db.Position.belongsTo(db.Department, { foreignKey: 'departmentId', as: 'department' });

  // Position ↔ Employee
  db.Position.hasMany(db.Employee, { foreignKey: 'positionId', as: 'employees' });
  db.Employee.belongsTo(db.Position, { foreignKey: 'positionId', as: 'position' });

  // Transfer ↔ Workflow
  db.Transfer.hasOne(db.Workflow, { foreignKey: 'transferId', as: 'workflow' });
  db.Workflow.belongsTo(db.Transfer, { foreignKey: 'transferId', as: 'transfer' });

  // Request ↔ Workflow
  db.Request.hasOne(db.Workflow, { foreignKey: 'requestId', as: 'workflow' });
  db.Workflow.belongsTo(db.Request, { foreignKey: 'requestId', as: 'request' });

  // Employee ↔ Workflow
  db.Employee.hasMany(db.Workflow, { foreignKey: 'employeeId', as: 'workflows' });
  db.Workflow.belongsTo(db.Employee, { foreignKey: 'employeeId', as: 'employee' });
}

// Initialize everything
async function initialize() {
  await testConnection();
  initModels();
  await sequelize.sync({ alter: true }); // Update tables to match models
  console.log('✅ Models initialized and synced with database.');
}

// Run initialization immediately
initialize();

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