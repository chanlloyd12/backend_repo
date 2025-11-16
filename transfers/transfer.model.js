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
    // Department Fields (Existing)
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
    // Position Fields (New)
    fromPosition: {
      type: DataTypes.STRING, // Store Position Name for history/readability
      allowNull: false,
      field: 'fromPosition',
    },
    toPosition: {
      type: DataTypes.STRING, // Store Position Name for history/readability
      allowNull: false,
      field: 'toPosition',
    },
    toDepartmentId: { // New: Store Department ID for easier lookup
      type: DataTypes.INTEGER,
      allowNull: true, // Allow null if only position is changing
      field: 'toDepartmentId'
    },
    toPositionId: { // New: Store Position ID for applying the change
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'toPositionId'
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