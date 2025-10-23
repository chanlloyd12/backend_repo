const { DataTypes } = require('sequelize');

module.exports = model;

function model(sequelize) {
    const attributes = {
        employeeId: {
            type: DataTypes.STRING,
            primaryKey: true,
            field: 'employeeId'   // <-- match DB exactly
        },
        accountId: { 
            type: DataTypes.INTEGER, 
            allowNull: false, 
            field: 'accountId' 
        },
        departmentId: { 
            type: DataTypes.INTEGER, 
            field: 'departmentId' 
        },
        position: { type: DataTypes.STRING, field: 'position' },
        hireDate: { type: DataTypes.DATE, allowNull: false, field: 'hireDate' },
        status: { 
            type: DataTypes.STRING, 
            allowNull: false,
            defaultValue: 'Active',
            field: 'status'
        }
    };

    const options = { 
        tableName: 'employees',   // <-- force exact table name
        timestamps: false         // no createdAt/updatedAt since schema doesn’t have them
    };

    return sequelize.define('Employee', attributes, options);
}
