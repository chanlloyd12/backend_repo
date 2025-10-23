const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Transfer = sequelize.define('Transfer', {
    transferId: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      field: 'transferId'
    },
    employeeId: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'employeeId'
    },
    fromDept: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'fromDept'
    },
    toDept: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'toDept'
    },
    status: {
      type: DataTypes.STRING,
      allowNull: true,
      defaultValue: 'Pending',
      field: 'status'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'createdAt'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updatedAt'
    }
  }, {
    tableName: 'transfers',
    timestamps: true
  });

  return Transfer;
};
