const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  return sequelize.define('Workflow', {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    type: { type: DataTypes.STRING, allowNull: false },
    details: { type: DataTypes.TEXT },
    status: {
      type: DataTypes.ENUM('Pending', 'Approved', 'Rejected'),
      allowNull: false,
      defaultValue: 'Pending'
    },
    requestId: { type: DataTypes.INTEGER, allowNull: true },
    transferId: { type: DataTypes.INTEGER, allowNull: true },

    // ✅ Add this field!
    employeeId: { 
      type: DataTypes.STRING, 
      allowNull: false 
    }
  });
};
