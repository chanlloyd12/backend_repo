const { DataTypes } = require('sequelize');
module.exports = model;

function model(sequelize) {
    const attributes = {
        name: {
            type: DataTypes.STRING,
            allowNull: false
            // REMOVED: unique: true. Uniqueness is now enforced by (name, departmentId) 
            // combination in the service layer to allow the same position name in different departments.
        },
        description: {
            type: DataTypes.STRING,
            allowNull: true
        },
        departmentId: {
            type: DataTypes.INTEGER,
            allowNull: false
        }
    };

    const options = {
        tableName: 'Positions',
        timestamps: false
    };

    return sequelize.define('Position', attributes, options);
}