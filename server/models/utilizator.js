import { DataTypes } from 'sequelize'

export default (sequelize) => {
    return sequelize.define('Utilizator', {
        idUtilizator: {
            type: DataTypes.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        nume: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        prenume: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        email: {
            type: DataTypes.STRING(255),
            allowNull: false,
            unique: true
        },
        adresa: {
            type: DataTypes.STRING(255)
        },
        parola: {
            type: DataTypes.STRING(255),
            allowNull: false
        },
        telefon: {
            type: DataTypes.STRING(255)
        },
        activ: {
            type: DataTypes.BOOLEAN,
            defaultValue: true
        },
        dataInregistrare: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        wishlist: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        specializare: {
            type: DataTypes.STRING(255)
        },
        rol: {
            type: DataTypes.STRING(255),
            allowNull: false,
            validate: {
                isIn: [['Director', 'Client', 'Mecanic']]
            }
        }
    }, {
        tableName: 'utilizatori',
        timestamps: false
    })
}
