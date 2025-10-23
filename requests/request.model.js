const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Request = sequelize.define('Request', {
    requestId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'requestId'
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'type'
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'employeeId'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Pending',
      field: 'status'
    },
    items: {
      type: DataTypes.JSON,
      allowNull: true,
      field: 'items'
    },
    createdAt: { type: DataTypes.DATE, field: 'createdAt' },
    updatedAt: { type: DataTypes.DATE, field: 'updatedAt' }
  }, {
    tableName: 'requests',
    timestamps: true   // uses createdAt, updatedAt
  });

  return Request;
};
