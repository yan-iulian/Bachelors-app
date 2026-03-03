import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('ImagineMasina', {
        idImagine: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        caleFisier: {
            type: DataTypes.STRING(500),
            allowNull: false
        },
        esteHero: {
            type: DataTypes.BOOLEAN,
            defaultValue: false
        },
        ordine: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        }
    }, {
        tableName: 'imagini_masina',
        timestamps: false
    })
}
