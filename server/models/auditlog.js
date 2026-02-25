import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('AuditLog', {
        idLog: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        actiune: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        detalii: {
            type: DataTypes.TEXT
        },
        dataOra: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        ip: {
            type: DataTypes.STRING(45)
        }
    }, {
        tableName: 'audit_log',
        timestamps: false
    })
}
