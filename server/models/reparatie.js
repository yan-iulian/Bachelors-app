import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('Reparatie', {
        idReparatie: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        dataInceput: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        dataFinalizare: {
            type: DataTypes.DATE
        },
        listaPieseNecesare: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        cost: {
            type: DataTypes.FLOAT,
            defaultValue: 0
        },
        statusReparatie: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: '0=In Asteptare, 1=In Lucru, 2=Finalizat'
        },
        descriereProblema: {
            type: DataTypes.STRING(255),
            allowNull: false
        }
    }, {
        tableName: 'reparatii',
        timestamps: false
    })
}
