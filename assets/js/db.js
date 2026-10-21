import { dbConfig } from './config.js';

// Como o SDK do LibSQL é pesado para rodar direto no navegador sem um bundler, 
// usaremos a API HTTP do Turso (LibSQL Remote Protocol) que é nativa e rápida.

export async function executeQuery(sql, args = []) {
    try {
        const response = await fetch(`${dbConfig.url.replace('libsql://', 'https://')}/v2/pipeline`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${dbConfig.authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                requests: [
                    { type: 'execute', stmt: { sql, args: args.map(arg => ({ type: 'text', value: String(arg) })) } },
                    { type: 'close' }
                ]
            })
        });

        const data = await response.json();

        if (data.results && data.results[0] && data.results[0].response) {
            const result = data.results[0].response.result;

            // Formatar o resultado para ser mais fácil de usar (array de objetos)
            if (result.rows && result.cols) {
                return result.rows.map(row => {
                    const obj = {};
                    result.cols.forEach((col, i) => {
                        obj[col.name] = row[i].value;
                    });
                    return obj;
                });
            }
            return result;
        }
        return data;
    } catch (error) {
        console.error("Erro no Banco de Dados:", error);
        throw error;
    }
}

let isDbInitialized = false;

export async function initDb() {
    if (isDbInitialized) return;
    // 1. Criar tabela de salões/profissionais
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS salons (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            slug TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            tagline TEXT,
            subtitle TEXT,
            bio_tag TEXT,
            bio_title TEXT,
            bio_text1 TEXT,
            bio_text2 TEXT,
            stat1_num TEXT,
            stat1_text TEXT,
            stat2_num TEXT,
            stat2_text TEXT,
            phone TEXT NOT NULL,
            instagram TEXT,
            address TEXT,
            maps_query TEXT,
            primary_color TEXT DEFAULT '#D4AF37',
            font_family TEXT DEFAULT 'Montserrat, Playfair Display',
            hero_image TEXT,
            about_image TEXT,
            contact_bg TEXT,
            admin_password TEXT DEFAULT '7777',
            must_change_password INTEGER DEFAULT 1,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 2. Criar tabela de serviços do salão
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS services (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            description TEXT,
            price TEXT,
            icon TEXT DEFAULT 'fas fa-gem',
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 3. Criar tabela de galeria de fotos do salão
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS gallery (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER NOT NULL,
            image_url TEXT NOT NULL,
            title TEXT,
            display_order INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    // 4. Criar/atualizar tabela de agendamentos
    await executeQuery(`
        CREATE TABLE IF NOT EXISTS bookings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            salon_id INTEGER DEFAULT 1,
            name TEXT NOT NULL,
            service TEXT NOT NULL,
            date TEXT NOT NULL,
            time TEXT NOT NULL,
            phone TEXT NOT NULL, 
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );
    `);

    try {
        await executeQuery("ALTER TABLE bookings ADD COLUMN salon_id INTEGER DEFAULT 1;");
    } catch (_) {
        // Já existe a coluna salon_id
    }

    // Adicionar coluna must_change_password se não existir
    try {
        await executeQuery("ALTER TABLE salons ADD COLUMN must_change_password INTEGER DEFAULT 1;");
    } catch (_) {
        // Já existe a coluna must_change_password
    }

    // Adicionar coluna font_family se não existir
    try {
        await executeQuery("ALTER TABLE salons ADD COLUMN font_family TEXT DEFAULT 'Montserrat, Playfair Display';");
    } catch (_) {
        // Já existe a coluna font_family
    }

    // Migrar salões existentes: trocar senha antiga padrão '1234' para '7777' e forçar troca
    try {
        await executeQuery("UPDATE salons SET admin_password = '7777', must_change_password = 1 WHERE admin_password = '1234';");
    } catch (_) {
        // Ignorar erros de migração
    }

    // Salões de Demonstração (Studio Bella Nails e Gio Nails): manter senha fixa 7777 sem bloqueio
    try {
        await executeQuery("UPDATE salons SET admin_password = '7777', must_change_password = 0 WHERE slug = 'bellanails' OR slug = 'bellanais' OR slug = 'gionails';");
    } catch (_) {
        // Ignorar erros
    }
    isDbInitialized = true;
}

// Buscar dados de um salão pelo slug (ex: 'gionails' ou 'bellanails')
export async function getSalonBySlug(slug) {
    if (!slug) return null;
    const cleanSlug = String(slug).toLowerCase().trim().replace(/^\/+|\/+$/g, '');

    // 1. Busca exata (case-insensitive)
    let rows = await executeQuery("SELECT * FROM salons WHERE LOWER(slug) = ? LIMIT 1", [cleanSlug]);
    if (rows && rows.length > 0) return rows[0];

    // 2. Variação comum de digitação / alias: bellanais <-> bellanails / belanails
    if (cleanSlug === 'bellanais' || cleanSlug === 'belanails' || cleanSlug === 'belanais') {
        rows = await executeQuery("SELECT * FROM salons WHERE LOWER(slug) = 'bellanails' OR LOWER(slug) = 'bellanais' LIMIT 1");
        if (rows && rows.length > 0) return rows[0];
    } else if (cleanSlug === 'bellanails') {
        rows = await executeQuery("SELECT * FROM salons WHERE LOWER(slug) = 'bellanais' OR LOWER(slug) = 'bellanails' LIMIT 1");
        if (rows && rows.length > 0) return rows[0];
    }

    // 3. Busca flexível por aproximação no slug ou nome
    rows = await executeQuery(
        "SELECT * FROM salons WHERE LOWER(slug) LIKE ? OR LOWER(name) LIKE ? LIMIT 1",
        [`%${cleanSlug}%`, `%${cleanSlug}%`]
    );
    return (rows && rows.length > 0) ? rows[0] : null;
}

// Buscar todos os salões cadastrados (para listagem/Super Admin)
export async function getAllSalons() {
    return await executeQuery("SELECT id, slug, name, phone, instagram, primary_color, created_at FROM salons ORDER BY name ASC");
}

// Buscar serviços de um salão
export async function getServicesBySalon(salonId) {
    return await executeQuery("SELECT * FROM services WHERE salon_id = ? ORDER BY display_order ASC, id ASC", [salonId]);
}

// Buscar fotos da galeria de um salão
export async function getGalleryBySalon(salonId) {
    return await executeQuery("SELECT * FROM gallery WHERE salon_id = ? ORDER BY display_order ASC, id ASC", [salonId]);
}

// Buscar agendamentos de um salão específico
export async function getBookingsBySalon(salonId) {
    return await executeQuery("SELECT * FROM bookings WHERE salon_id = ? ORDER BY date DESC, time ASC", [salonId]);
}

// Atualizar informações do salão
export async function updateSalonInfo(id, fields) {
    const keys = Object.keys(fields);
    const setClause = keys.map(k => `${k} = ?`).join(', ');
    const values = keys.map(k => fields[k]);
    values.push(id);
    return await executeQuery(`UPDATE salons SET ${setClause} WHERE id = ?`, values);
}

// Criar novo salão
export async function createSalon(data) {
    const sql = `
        INSERT INTO salons (
            slug, name, tagline, subtitle, bio_tag, bio_title, bio_text1, bio_text2,
            stat1_num, stat1_text, stat2_num, stat2_text, phone, instagram, address,
            maps_query, primary_color, hero_image, about_image, admin_password, must_change_password
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
    `;
    const params = [
        data.slug,
        data.name,
        data.tagline || 'Arte & Sofisticação em Suas Mãos',
        data.subtitle || 'Bem-vinda ao seu momento',
        data.bio_tag || 'Minha História',
        data.bio_title || 'Paixão pelo que faço',
        data.bio_text1 || 'Com anos de experiência no mercado de beleza, meu objetivo é oferecer uma experiência única.',
        data.bio_text2 || 'Trabalho com os melhores materiais do mercado para garantir durabilidade e beleza.',
        data.stat1_num || '500+',
        data.stat1_text || 'Clientes Satisfeitas',
        data.stat2_num || '5+',
        data.stat2_text || 'Anos de Experiência',
        data.phone || '',
        data.instagram || '',
        data.address || '',
        data.maps_query || '',
        data.primary_color || '#D4AF37',
        data.hero_image || 'assets/images/f521b753-a874-42fb-b737-9d87aca2990c.jpg',
        data.about_image || 'assets/images/afc7434f-f6fe-490a-8f70-1a0306cf32e9.jpg',
        data.admin_password || '7777'
    ];
    return await executeQuery(sql, params);
}

