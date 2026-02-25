/**
 * Script de descărcare automată imagini mașini din Unsplash
 * Rulează: node download-images.js
 *
 * Descarcă 10 imagini de mașini reale și le salvează în public/images/masini/
 * Apoi poți folosi în DB: /images/masini/bmw-x5.jpg (servit de Express static)
 */

import https from 'https'
import http from 'http'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

const OUTPUT_DIR = path.join(__dirname, 'public', 'images', 'masini')

// Mașini din baza de date + URL-uri Unsplash verificate (CDN direct, rezoluție 800px)
const cars = [
    {
        filename: 'bmw-x5.jpg',
        url: 'https://images.unsplash.com/photo-1556189250-72ba954cfc2b?w=800&h=500&fit=crop&q=80',
        desc: 'BMW X5 M50i'
    },
    {
        filename: 'mercedes-s-class.jpg',
        url: 'https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?w=800&h=500&fit=crop&q=80',
        desc: 'Mercedes-Benz S-Class W223'
    },
    {
        filename: 'audi-q7.jpg',
        url: 'https://images.unsplash.com/photo-1606664515524-ed2f786a0bd6?w=800&h=500&fit=crop&q=80',
        desc: 'Audi Q7 50 TDI'
    },
    {
        filename: 'porsche-cayenne.jpg',
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800&h=500&fit=crop&q=80',
        desc: 'Porsche Cayenne E-Hybrid'
    },
    {
        filename: 'vw-golf-r.jpg',
        url: 'https://images.unsplash.com/photo-1655125611386-35225917589e?w=800&h=500&fit=crop&q=80',
        desc: 'Volkswagen Golf 8 R'
    },
    {
        filename: 'tesla-model3.jpg',
        url: 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?w=800&h=500&fit=crop&q=80',
        desc: 'Tesla Model 3'
    },
    {
        filename: 'range-rover.jpg',
        url: 'https://images.unsplash.com/photo-1606016159991-dfe4f2746ad5?w=800&h=500&fit=crop&q=80',
        desc: 'Range Rover Sport'
    },
    {
        filename: 'toyota-supra.jpg',
        url: 'https://images.unsplash.com/photo-1600712242805-5f78671b24da?w=800&h=500&fit=crop&q=80',
        desc: 'Toyota Supra GR'
    },
    {
        filename: 'volvo-xc90.jpg',
        url: 'https://images.unsplash.com/photo-1619767886558-efdc259cde1a?w=800&h=500&fit=crop&q=80',
        desc: 'Volvo XC90 T8'
    },
    {
        filename: 'ford-mustang.jpg',
        url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&h=500&fit=crop&q=80',
        desc: 'Ford Mustang GT'
    },
    {
        filename: 'hyundai.jpg',
        url: 'https://images.unsplash.com/photo-1592853625511-ad0edcc69c07?w=800&h=500&fit=crop&q=80',
        desc: 'Hyundai'
    },
    {
        filename: 'mazda.jpg',
        url: 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800&h=500&fit=crop&q=80',
        desc: 'Mazda'
    },
    {
        filename: 'lexus.jpg',
        url: 'https://images.unsplash.com/photo-1542362567-b07e54358753?w=800&h=500&fit=crop&q=80',
        desc: 'Lexus'
    },
    {
        filename: 'nissan.jpg',
        url: 'https://images.unsplash.com/photo-1609521263047-f8f205293f24?w=800&h=500&fit=crop&q=80',
        desc: 'Nissan'
    },
    {
        filename: 'jaguar.jpg',
        url: 'https://images.unsplash.com/photo-1552519507-da3b142c6e3d?w=800&h=500&fit=crop&q=80',
        desc: 'Jaguar'
    },
]

// Creează folderul dacă nu există
function ensureDir(dir) {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true })
        console.log(`📁 Created directory: ${dir}`)
    }
}

// Descarcă un fișier urmărind redirect-urile
function downloadFile(url, dest) {
    return new Promise((resolve, reject) => {
        const protocol = url.startsWith('https') ? https : http

        const request = protocol.get(url, (response) => {
            // Urmărește redirect-urile (301, 302, 307, 308)
            if ([301, 302, 307, 308].includes(response.statusCode)) {
                const redirectUrl = response.headers.location
                console.log(`   ↪ Redirect → ${redirectUrl.substring(0, 60)}...`)
                downloadFile(redirectUrl, dest).then(resolve).catch(reject)
                return
            }

            if (response.statusCode !== 200) {
                reject(new Error(`HTTP ${response.statusCode} for ${url}`))
                return
            }

            const file = fs.createWriteStream(dest)
            response.pipe(file)
            file.on('finish', () => {
                file.close()
                const stats = fs.statSync(dest)
                const sizeKB = (stats.size / 1024).toFixed(1)
                resolve(sizeKB)
            })
            file.on('error', (err) => {
                fs.unlink(dest, () => {})
                reject(err)
            })
        })

        request.on('error', reject)
        request.setTimeout(30000, () => {
            request.destroy()
            reject(new Error('Timeout'))
        })
    })
}

async function main() {
    console.log('==============================================')
    console.log('  AerYan — Descărcare imagini mașini')
    console.log('  Sursă: Unsplash (licență gratuită)')
    console.log('==============================================\n')

    ensureDir(OUTPUT_DIR)

    let success = 0
    let failed = 0

    for (const car of cars) {
        const dest = path.join(OUTPUT_DIR, car.filename)

        // Skip dacă fișierul există deja
        if (fs.existsSync(dest)) {
            const stats = fs.statSync(dest)
            console.log(`✅ ${car.desc} — deja existent (${(stats.size / 1024).toFixed(1)} KB)`)
            success++
            continue
        }

        process.stdout.write(`⬇️  ${car.desc} (${car.filename})...`)
        try {
            const sizeKB = await downloadFile(car.url, dest)
            console.log(` ✅ ${sizeKB} KB`)
            success++
        } catch (err) {
            console.log(` ❌ ${err.message}`)
            failed++
        }
    }

    console.log('\n==============================================')
    console.log(`  Rezultat: ${success} descărcate, ${failed} eșuate`)
    console.log(`  Folder: ${OUTPUT_DIR}`)
    console.log('==============================================')

    if (success > 0) {
        console.log('\n📌 Căile pentru UPDATE în baza de date:')
        console.log('──────────────────────────────────────────')
        cars.forEach((car, i) => {
            console.log(`  Mașina ${i + 1} (${car.desc}): /images/masini/${car.filename}`)
        })
        console.log('\n💡 Frontend va accesa la: http://localhost:3001/images/masini/bmw-x5.jpg')
    }
}

main().catch(console.error)
