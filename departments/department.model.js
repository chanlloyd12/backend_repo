const { DataTypes } = require('sequelize');
module.exports = model;

function model(sequelize) {
    const attributes = {
        name: { 
            type: DataTypes.STRING, 
            allowNull: false, 
            unique: true // prevents duplicate names
        },
        description: { 
            type: DataTypes.STRING, 
            allowNull: true 
        }
    };

    const options = {
        tableName: 'Departments',
        timestamps: false
    };

    return sequelize.define('Department', attributes, options);
}
