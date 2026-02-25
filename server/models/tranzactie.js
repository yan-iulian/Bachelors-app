import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('Tranzactie', {
        idTranzactie: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        suma: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        dataTranzactie: {
            type: DataTypes.DATE,
            allowNull: false,
            defaultValue: DataTypes.NOW
        },
        tipPlata: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        status: {
            type: DataTypes.STRING(255),
            allowNull: false,
            defaultValue: 'Processing'
        },
        tip: {
            type: DataTypes.STRING(50),
            allowNull: false,
            defaultValue: 'Vanzare'
            // 'Vanzare' | 'Discount'
        },
        discountProcent: {
            type: DataTypes.FLOAT,
            allowNull: true
            // Ex: 10.0 = 10% discount solicitat
        },
        motivDiscount: {
            type: DataTypes.TEXT,
            allowNull: true
            // Motivul cererii de discount
        },
        contractPDF: {
            type: DataTypes.STRING(255)
        },
        facturaPDF: {
            type: DataTypes.STRING(255)
        }
    }, {
        tableName: 'tranzactii',
        timestamps: false
    })
}
