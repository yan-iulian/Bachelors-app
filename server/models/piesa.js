import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('Piesa', {
        idPiesa: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        denumire: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        categorie: {
            type: DataTypes.STRING(255)
        },
        pret: {
            type: DataTypes.FLOAT,
            allowNull: false
        },
        stoc: {
            type: DataTypes.INTEGER,
            allowNull: false,
            defaultValue: 0
        },
        compatibilitate: {
            type: DataTypes.STRING(255)
        },
        furnizorNume: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        furnizorTelefon: {
            type: DataTypes.STRING(255)
        },
        timpLivrareOre: {
            type: DataTypes.INTEGER
        }
    }, {
        tableName: 'piese',
        timestamps: false
    })
}
