import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('TestDrive', {
        id: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        dataSolicitare: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        dataProgramata: {
            type: DataTypes.DATE
        },
        status: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '0=Solicitare, 1=Aprobat, 2=Respins, 3=Efectuat'
        },
        motivRespingere: {
            type: DataTypes.STRING(255)
        }
    }, {
        tableName: 'test_drives',
        timestamps: false
    })
}
