import db from './models/index.js'
import bcrypt from 'bcrypt'

async function seed() {
    console.log('Inserare date de test...')

    // ========== UTILIZATORI ==========
    const parolaCriptata = await bcrypt.hash('parola123', 10)

    const director = await db.Utilizator.create({
        nume: 'Popescu', prenume: 'Ion', email: 'director@aeryan.ro',
        parola: parolaCriptata, telefon: '0721000001', adresa: 'Str. Principala 1, București',
        rol: 'Director'
    })

    const client1 = await db.Utilizator.create({
        nume: 'Ionescu', prenume: 'Maria', email: 'maria@email.com',
        parola: parolaCriptata, telefon: '0721000002', adresa: 'Str. Florilor 10, Cluj',
        rol: 'Client'
    })

    const client2 = await db.Utilizator.create({
        nume: 'Georgescu', prenume: 'Andrei', email: 'andrei@email.com',
        parola: parolaCriptata, telefon: '0721000003', adresa: 'Bd. Unirii 5, Iași',
        rol: 'Client'
    })

    const mecanic = await db.Utilizator.create({
        nume: 'Dumitrescu', prenume: 'Vasile', email: 'mecanic@aeryan.ro',
        parola: parolaCriptata, telefon: '0721000004', adresa: 'Str. Atelierului 3, București',
        rol: 'Mecanic', specializare: 'Motor și transmisie'
    })

    // ========== MASINI ==========
    const masina1 = await db.Masina.create({
        marca: 'BMW', model: 'Seria 3 320d', anFabricatie: 2023, km: 15000,
        combustibil: 1, pretEuro: 35000, status: 'Disponibil',
        categorieAuto: 1, locParcare: 'A-12',
        descriere: 'BMW Seria 3, motor diesel 2.0L, 190 CP, cutie automată, navigație, scaune sport.',
        scorViteza: 8.5, scorConfort: 9.0, scorConsum: 7.0, scorManevrabilitate: 8.0,
        scorPret: 6.0, scorDesignInterior: 9, scorDesignExterior: 9,
        scorSpatiu: 7, scorAcceleratieCuplu: 8.5, scorFrana: 8.0,
        idDirector: director.idUtilizator
    })

    const masina2 = await db.Masina.create({
        marca: 'Mercedes-Benz', model: 'C-Class C200', anFabricatie: 2022, km: 28000,
        combustibil: 0, pretEuro: 32000, status: 'Disponibil',
        categorieAuto: 1, locParcare: 'A-15',
        descriere: 'Mercedes C-Class, motor benzină 1.5L turbo, 204 CP, interior premium.',
        scorViteza: 7.5, scorConfort: 9.5, scorConsum: 6.0, scorManevrabilitate: 7.5,
        scorPret: 6.5, scorDesignInterior: 10, scorDesignExterior: 9,
        scorSpatiu: 7, scorAcceleratieCuplu: 7.5, scorFrana: 8.0,
        idDirector: director.idUtilizator
    })

    const masina3 = await db.Masina.create({
        marca: 'Volkswagen', model: 'Golf 8 GTI', anFabricatie: 2024, km: 5000,
        combustibil: 0, pretEuro: 42000, status: 'Disponibil',
        categorieAuto: 2, locParcare: 'B-03',
        descriere: 'VW Golf GTI, motor 2.0 TSI 245 CP, diferențial autoblocant, sport mode.',
        scorViteza: 9.0, scorConfort: 7.5, scorConsum: 5.5, scorManevrabilitate: 9.5,
        scorPret: 5.0, scorDesignInterior: 8, scorDesignExterior: 8,
        scorSpatiu: 6, scorAcceleratieCuplu: 9.0, scorFrana: 9.0,
        idDirector: director.idUtilizator
    })

    const masina4 = await db.Masina.create({
        marca: 'Toyota', model: 'Corolla Hybrid', anFabricatie: 2023, km: 12000,
        combustibil: 3, pretEuro: 25000, status: 'Disponibil',
        categorieAuto: 1, locParcare: 'B-07',
        descriere: 'Toyota Corolla Hybrid, consum ultra-redus, fiabilitate maximă.',
        scorViteza: 5.5, scorConfort: 8.0, scorConsum: 10.0, scorManevrabilitate: 7.0,
        scorPret: 8.5, scorDesignInterior: 7, scorDesignExterior: 7,
        scorSpatiu: 8, scorAcceleratieCuplu: 5.0, scorFrana: 7.0,
        idDirector: director.idUtilizator
    })

    const masina5 = await db.Masina.create({
        marca: 'Audi', model: 'A4 Avant 40 TDI', anFabricatie: 2021, km: 45000,
        combustibil: 1, pretEuro: 29000, status: 'Disponibil',
        categorieAuto: 3, locParcare: 'C-01',
        descriere: 'Audi A4 Avant, break premium, motor diesel 2.0L, Quattro, panoramic.',
        scorViteza: 7.0, scorConfort: 9.0, scorConsum: 7.5, scorManevrabilitate: 7.5,
        scorPret: 7.0, scorDesignInterior: 9, scorDesignExterior: 8,
        scorSpatiu: 10, scorAcceleratieCuplu: 7.0, scorFrana: 7.5,
        idDirector: director.idUtilizator
    })

    // ========== PIESE ==========
    const piesa1 = await db.Piesa.create({
        denumire: 'Filtru ulei BMW', categorie: 'Filtre', pret: 45.50,
        stoc: 15, compatibilitate: 'BMW Seria 3/5',
        furnizorNume: 'AutoParts SRL', furnizorTelefon: '0311000001', timpLivrareOre: 24
    })

    const piesa2 = await db.Piesa.create({
        denumire: 'Placute frână față', categorie: 'Frâne', pret: 120.00,
        stoc: 8, compatibilitate: 'Universal',
        furnizorNume: 'BrakeMaster SRL', furnizorTelefon: '0311000002', timpLivrareOre: 48
    })

    const piesa3 = await db.Piesa.create({
        denumire: 'Set bujii iridium', categorie: 'Motor', pret: 85.00,
        stoc: 20, compatibilitate: 'VW/Audi/Seat/Skoda',
        furnizorNume: 'MotorParts SRL', furnizorTelefon: '0311000003', timpLivrareOre: 24
    })

    // ========== REPARATIE ==========
    const reparatie1 = await db.Reparatie.create({
        dataInceput: new Date(), descriereProblema: 'Schimb distribuție + filtre',
        cost: 850, statusReparatie: 1, idMasina: masina5.idMasina,
        idMecanic: mecanic.idUtilizator
    })

    // Asociaza piese la reparatie
    await reparatie1.addPiesas([piesa1, piesa2])

    // ========== TEST DRIVE ==========
    await db.TestDrive.create({
        idClient: client1.idUtilizator, idMasina: masina1.idMasina,
        dataSolicitare: new Date(), status: 0
    })

    await db.TestDrive.create({
        idClient: client2.idUtilizator, idMasina: masina3.idMasina,
        dataSolicitare: new Date(), dataProgramata: new Date(Date.now() + 86400000),
        status: 1, idDirector: director.idUtilizator
    })

    // ========== TRANZACTIE ==========
    await db.Tranzactie.create({
        suma: 32000, dataTranzactie: new Date(), tipPlata: 'Cash',
        status: 'Processing', idClient: client1.idUtilizator,
        idMasina: masina2.idMasina
    })

    console.log('Date de test inserate cu succes!')
    console.log('Utilizatori: director@aeryan.ro / maria@email.com / andrei@email.com / mecanic@aeryan.ro')
    console.log('Parola pentru toți: parola123')
    process.exit(0)
}

seed().catch(err => {
    console.error('Eroare la seed:', err)
    process.exit(1)
})
