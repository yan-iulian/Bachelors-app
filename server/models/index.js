import { Sequelize } from 'sequelize'
import 'dotenv/config'
import createUtilizatorModel from './utilizator.js'
import createMasinaModel from './masina.js'
import createTranzactieModel from './tranzactie.js'
import createTestDriveModel from './testdrive.js'
import createReparatieModel from './reparatie.js'
import createPiesaModel from './piesa.js'
import createAuditLogModel from './auditlog.js'

const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASS,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT,
        dialect: 'postgres',
        logging: false
    }
)

// Creare modele
const Utilizator = createUtilizatorModel(sequelize)
const Masina = createMasinaModel(sequelize)
const Tranzactie = createTranzactieModel(sequelize)
const TestDrive = createTestDriveModel(sequelize)
const Reparatie = createReparatieModel(sequelize)
const Piesa = createPiesaModel(sequelize)
const AuditLog = createAuditLogModel(sequelize)

// Tabela de jonctiune Piesa_Reparatie (N:M)
const PiesaReparatie = sequelize.define('PiesaReparatie', {}, {
    tableName: 'piesa_reparatie',
    timestamps: false
})

// ========== RELATII ==========

// Director aduce masini (1:N)
Utilizator.hasMany(Masina, { foreignKey: 'idDirector', as: 'masiniAdaugate' })
Masina.belongsTo(Utilizator, { foreignKey: 'idDirector', as: 'director' })

// Client solicita test drive-uri (1:N)
Utilizator.hasMany(TestDrive, { foreignKey: 'idClient', as: 'testDriveSolicitari' })
TestDrive.belongsTo(Utilizator, { foreignKey: 'idClient', as: 'client' })

// Director gestioneaza test drive-uri (1:N)
Utilizator.hasMany(TestDrive, { foreignKey: 'idDirector', as: 'testDriveGestionate' })
TestDrive.belongsTo(Utilizator, { foreignKey: 'idDirector', as: 'directorTD' })

// Masina are test drive-uri (1:N)
Masina.hasMany(TestDrive, { foreignKey: 'idMasina' })
TestDrive.belongsTo(Masina, { foreignKey: 'idMasina' })

// Client initiaza tranzactii (1:N)
Utilizator.hasMany(Tranzactie, { foreignKey: 'idClient', as: 'tranzactiiClient' })
Tranzactie.belongsTo(Utilizator, { foreignKey: 'idClient', as: 'clientTranzactie' })

// Director aproba tranzactii (1:N)
Utilizator.hasMany(Tranzactie, { foreignKey: 'idDirector', as: 'tranzactiiAprobate' })
Tranzactie.belongsTo(Utilizator, { foreignKey: 'idDirector', as: 'directorTranzactie' })

// Masina apare in tranzactii (1:N)
Masina.hasMany(Tranzactie, { foreignKey: 'idMasina' })
Tranzactie.belongsTo(Masina, { foreignKey: 'idMasina' })

// Masina are reparatii (1:N)
Masina.hasMany(Reparatie, { foreignKey: 'idMasina' })
Reparatie.belongsTo(Masina, { foreignKey: 'idMasina' })

// Mecanic efectueaza reparatii (1:N)
Utilizator.hasMany(Reparatie, { foreignKey: 'idMecanic', as: 'reparatiiEfectuate' })
Reparatie.belongsTo(Utilizator, { foreignKey: 'idMecanic', as: 'mecanic' })

// Piesa <-> Reparatie (N:M prin tabela de jonctiune)
Piesa.belongsToMany(Reparatie, { through: PiesaReparatie, foreignKey: 'idPiesa' })
Reparatie.belongsToMany(Piesa, { through: PiesaReparatie, foreignKey: 'idReparatie' })

// Utilizator genereaza audit log-uri (1:N)
Utilizator.hasMany(AuditLog, { foreignKey: 'idUtilizator', as: 'auditLogs' })
AuditLog.belongsTo(Utilizator, { foreignKey: 'idUtilizator', as: 'utilizator' })

// Sincronizare DB
try {
    await sequelize.sync({ alter: true })
    console.log('Baza de date sincronizata cu succes!')
} catch (err) {
    console.error('Eroare sincronizare DB:', err)
}

export default {
    sequelize,
    Utilizator,
    Masina,
    Tranzactie,
    TestDrive,
    Reparatie,
    Piesa,
    PiesaReparatie,
    AuditLog
}
