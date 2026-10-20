import { executeQuery, getSalonBySlug, getServicesBySalon, getGalleryBySalon } from './db.js';

let currentSalon = null;

// Função global de Scroll Reveal dinâmica
export function revealOnScroll() {
    const revealElements = document.querySelectorAll('.service-card, .portfolio-item, .about-text, .about-image');
    const triggerBottom = window.innerHeight * 0.95;
    revealElements.forEach(el => {
        const elTop = el.getBoundingClientRect().top;
        if (elTop < triggerBottom) {
            el.classList.add('visible');
        }
    });
}

document.addEventListener('DOMContentLoaded', async () => {
    // 1. Identificar qual salão carregar pela URL (ex: ?salon=gionails ou /s/gionails)
    const urlParams = new URLSearchParams(window.location.search);
    const pathSegments = window.location.pathname.split('/').filter(Boolean);
    let slug = urlParams.get('salon');
    if (!slug && pathSegments[0] === 's' && pathSegments[1]) {
        slug = pathSegments[1];
    }
    if (!slug) slug = 'gionails'; // Salão padrão

    try {
        currentSalon = await getSalonBySlug(slug);
        if (!currentSalon && slug !== 'gionails') {
            currentSalon = await getSalonBySlug('gionails');
        }
        if (currentSalon) {
            await renderSalonData(currentSalon);
        }
    } catch (err) {
        console.error("Erro ao carregar dados do salão:", err);
    }

    // 2. Comportamentos de UI (Navbar, Scroll, Menu)
    const navbar = document.getElementById('navbar');
    const navToggle = document.getElementById('navToggle');
    const navMenu = document.querySelector('nav');
    const backToTop = document.getElementById('backToTop');

    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            navbar.classList.add('scrolled');
        } else {
            navbar.classList.remove('scrolled');
        }

        if (window.scrollY > 500) {
            backToTop.classList.add('show');
        } else {
            backToTop.classList.remove('show');
        }

        revealOnScroll();
    }, { passive: true });

    window.addEventListener('resize', revealOnScroll, { passive: true });

    if (navToggle) {
        navToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            navToggle.classList.toggle('active');

            const spans = navToggle.querySelectorAll('span');
            if (navMenu.classList.contains('active')) {
                spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
                spans[1].style.opacity = '0';
                spans[2].style.transform = 'rotate(-45deg) translate(7px, -7px)';
            } else {
                spans[0].style.transform = 'none';
                spans[1].style.opacity = '1';
                spans[2].style.transform = 'none';
            }
        });
    }

    document.querySelectorAll('nav a').forEach(link => {
        link.addEventListener('click', () => {
            if (navMenu) navMenu.classList.remove('active');
            if (navToggle) {
                const spans = navToggle.querySelectorAll('span');
                if (spans.length >= 3) {
                    spans[0].style.transform = 'none';
                    spans[1].style.opacity = '1';
                    spans[2].style.transform = 'none';
                }
            }
        });
    });

    // 3. Modal de Agendamento
    const bookingModal = document.getElementById('bookingModal');
    const openBookingBtns = document.querySelectorAll('.open-booking');
    const closeModalBtn = document.querySelector('.close-modal');
    const bookingForm = document.getElementById('bookingForm');

    const openModal = () => {
        bookingModal.classList.add('active');
        document.body.style.overflow = 'hidden';
    };

    const closeModal = () => {
        bookingModal.classList.remove('active');
        document.body.style.overflow = 'auto';
    };

    if (openBookingBtns) {
        openBookingBtns.forEach(btn => btn.addEventListener('click', openModal));
    }
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
    }
    window.addEventListener('click', (e) => {
        if (e.target === bookingModal) closeModal();
    });

    // 4. Envio do Agendamento
    if (bookingForm) {
        bookingForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const name = document.getElementById('name').value;
            const whatsapp = document.getElementById('whatsapp').value;
            const service = document.getElementById('service').value;
            const date = document.getElementById('date').value;
            const time = document.getElementById('time').value;

            const dateParts = date.split('-');
            const formattedDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

            const salonName = currentSalon ? currentSalon.name : 'Gio Nails';
            const message = `Olá ${salonName}! Gostaria de agendar um horário:
            
👤 *Nome:* ${name}
💅 *Serviço:* ${service}
📅 *Data:* ${formattedDate}
⏰ *Horário:* ${time}

Aguardo confirmação!`;

            const cleanSalonPhone = currentSalon && currentSalon.phone ? currentSalon.phone.replace(/\D/g, '') : '5519999995149';
            const finalSalonPhone = cleanSalonPhone.startsWith('55') ? cleanSalonPhone : '55' + cleanSalonPhone;
            const whatsappUrl = `https://wa.me/${finalSalonPhone}?text=${encodeURIComponent(message)}`;

            // Salvar no Turso associado ao salão atual
            try {
                const salonId = currentSalon ? currentSalon.id : 1;
                await executeQuery(
                    "INSERT INTO bookings (salon_id, name, service, date, time, phone, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')",
                    [salonId, name, service, date, time, whatsapp]
                );
            } catch (err) {
                console.error("Erro ao salvar no banco:", err);
            }

            window.open(whatsappUrl, '_blank');
            closeModal();
            bookingForm.reset();
        });
    }

    // Scroll reveal inicial
    revealOnScroll();
    setTimeout(revealOnScroll, 100);
});

function escapeHtml(text) {
    if (!text) return '';
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function applySalonFont(font) {
    if (!font) return;
    if (font.includes('Cormorant Garamond')) {
        document.documentElement.style.setProperty('--font-heading', "'Cormorant Garamond', serif");
    } else if (font.includes('Poppins')) {
        document.documentElement.style.setProperty('--font-heading', "'Poppins', sans-serif");
        document.documentElement.style.setProperty('--font-main', "'Poppins', sans-serif");
    } else if (font.includes('Cinzel')) {
        document.documentElement.style.setProperty('--font-heading', "'Cinzel', serif");
    } else if (font.includes('Alex Brush')) {
        document.documentElement.style.setProperty('--font-heading', "'Alex Brush', cursive");
    } else {
        document.documentElement.style.setProperty('--font-heading', "'Playfair Display', serif");
        document.documentElement.style.setProperty('--font-main', "'Montserrat', sans-serif");
    }
}

function formatPrice(val) {
    if (!val) return '';
    let str = String(val).trim();
    if (!str) return '';
    if (str.startsWith('R$')) return str;
    if (!/\d/.test(str)) return str;
    if (str.includes(',')) {
        const parts = str.split(',');
        const intPart = parts[0].replace(/\D/g, '') || '0';
        let decPart = parts.slice(1).join('').replace(/\D/g, '');
        if (decPart.length === 0) decPart = '00';
        else if (decPart.length === 1) decPart = decPart + '0';
        else if (decPart.length > 2) decPart = decPart.substring(0, 2);
        const num = parseInt(intPart, 10);
        return `R$ ${isNaN(num) ? '0' : num.toLocaleString('pt-BR')},${decPart}`;
    }
    if (str.includes('.')) {
        const parts = str.split('.');
        if (parts.length === 2 && parts[1].length <= 2) {
            const intPart = parts[0].replace(/\D/g, '') || '0';
            let decPart = parts[1].replace(/\D/g, '');
            if (decPart.length === 0) decPart = '00';
            else if (decPart.length === 1) decPart = decPart + '0';
            const num = parseInt(intPart, 10);
            return `R$ ${isNaN(num) ? '0' : num.toLocaleString('pt-BR')},${decPart}`;
        }
    }
    const cleanNum = str.replace(/\D/g, '');
    if (!cleanNum) return str;
    const num = parseInt(cleanNum, 10);
    return `R$ ${isNaN(num) ? '0' : num.toLocaleString('pt-BR')},00`;
}

async function renderSalonData(salon) {
    try {
        // 1. Título e Cores
        document.title = `${salon.name} | Arte & Sofisticação`;
        if (salon.primary_color) {
            document.documentElement.style.setProperty('--primary', salon.primary_color);
        }
        if (salon.font_family) {
            applySalonFont(salon.font_family);
        }

        // 2. Logo e Textos Principais
        const logoEl = document.getElementById('salonLogo');
        if (logoEl && salon.name) {
            const parts = salon.name.trim().split(/\s+/);
            if (parts.length === 1) {
                logoEl.innerHTML = `<span>${escapeHtml(parts[0])}</span>`;
            } else {
                logoEl.innerHTML = `${escapeHtml(parts[0])} <span>${escapeHtml(parts.slice(1).join(' '))}</span>`;
            }
        }

        if (salon.subtitle) {
            const sub = document.getElementById('heroSubtitle');
            if (sub) sub.innerText = salon.subtitle;
        }
        if (salon.tagline) {
            const titleEl = document.getElementById('heroTitle');
            if (titleEl) {
                if (salon.tagline === 'Arte & Sofisticação em Suas Mãos') {
                    titleEl.innerHTML = `Arte & Sofisticação <br><span>em Suas Mãos</span>`;
                } else if (salon.tagline.includes('em Suas Mãos')) {
                    const parts = salon.tagline.split('em Suas Mãos');
                    titleEl.innerHTML = `${escapeHtml(parts[0])}<br><span>em Suas Mãos</span>`;
                } else {
                    titleEl.innerText = salon.tagline;
                }
            }
        }

        // 3. Imagem Hero
        if (salon.hero_image) {
            const heroSection = document.querySelector('.hero');
            if (heroSection) {
                heroSection.style.backgroundImage = `url('${salon.hero_image}')`;
            }
        }

        // 4. Seção Sobre
        if (salon.about_image) {
            const aboutImg = document.getElementById('aboutImage');
            if (aboutImg) aboutImg.src = salon.about_image;
        }
        if (salon.bio_tag) {
            const bt = document.getElementById('bioTag');
            if (bt) bt.innerText = salon.bio_tag;
        }
        if (salon.bio_title) {
            const bt = document.getElementById('bioTitle');
            if (bt) bt.innerText = salon.bio_title;
        }
        if (salon.bio_text1) {
            const b1 = document.getElementById('bioText1');
            if (b1) b1.innerText = salon.bio_text1;
        }
        if (salon.bio_text2) {
            const b2 = document.getElementById('bioText2');
            if (b2) b2.innerText = salon.bio_text2;
        }
        if (salon.stat1_num) {
            const s1 = document.getElementById('stat1Num');
            if (s1) s1.innerText = salon.stat1_num;
        }
        if (salon.stat1_text) {
            const st1 = document.getElementById('stat1Text');
            if (st1) st1.innerText = salon.stat1_text;
        }
        if (salon.stat2_num) {
            const s2 = document.getElementById('stat2Num');
            if (s2) s2.innerText = salon.stat2_num;
        }
        if (salon.stat2_text) {
            const st2 = document.getElementById('stat2Text');
            if (st2) st2.innerText = salon.stat2_text;
        }

        // 5. Contato & Redes Sociais
        if (salon.phone) {
            const clean = salon.phone.replace(/\D/g, '');
            const finalPhone = clean.startsWith('55') ? clean : '55' + clean;
            const formatted = clean.length >= 10 ? `(${clean.slice(-11, -9)}) ${clean.slice(-9, -4)}-${clean.slice(-4)}` : salon.phone;

            const wLink = document.getElementById('contactWhatsappLink');
            if (wLink) wLink.href = `https://wa.me/${finalPhone}`;
            const wText = document.getElementById('contactWhatsappText');
            if (wText) {
                wText.innerText = formatted;
                wText.classList.remove('blurred-text');
                wText.removeAttribute('title');
            }
        }

        if (salon.instagram) {
            const cleanInsta = salon.instagram.replace('@', '');
            const iLink = document.getElementById('contactInstagramLink');
            if (iLink) iLink.href = `https://www.instagram.com/${cleanInsta}`;
            const iText = document.getElementById('contactInstagramText');
            if (iText) {
                iText.innerText = `@${cleanInsta}`;
                iText.classList.remove('blurred-text');
                iText.removeAttribute('title');
            }
        }

        if (salon.address) {
            const addrEl = document.getElementById('contactAddress');
            if (addrEl) addrEl.innerText = salon.address;
        }
        if (salon.maps_query) {
            const mapLink = document.getElementById('contactMapsLink');
            if (mapLink) mapLink.href = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(salon.maps_query)}`;
        }

        // 6. Carregar Serviços e Galeria em Paralelo para Velocidade Máxima
        const [services, photos] = await Promise.all([
            getServicesBySalon(salon.id).catch(e => { console.error("Erro serviços:", e); return []; }),
            getGalleryBySalon(salon.id).catch(e => { console.error("Erro galeria:", e); return []; })
        ]);

        // Renderizar Serviços
        if (services && services.length > 0) {
            const grid = document.getElementById('servicesGrid');
            const select = document.getElementById('service');
            if (grid) {
                grid.innerHTML = '';
                services.forEach((s, idx) => {
                    const card = document.createElement('div');
                    card.className = `service-card ${idx === 1 ? 'active' : ''} visible`;
                    const priceFormatted = s.price ? formatPrice(s.price) : '';
                    card.innerHTML = `
                        <i class="${s.icon || 'fas fa-gem'}"></i>
                        <h3>${escapeHtml(s.name)}</h3>
                        <p>${escapeHtml(s.description || '')}</p>
                        ${priceFormatted ? `<span class="service-price" style="display:inline-block; margin-top:0.8rem; font-weight:700; color:var(--primary); font-size:1.1rem;">${escapeHtml(priceFormatted)}</span>` : ''}
                    `;
                    grid.appendChild(card);
                });
            }

            if (select) {
                select.innerHTML = '<option value="" disabled selected>Selecione um serviço</option>';
                services.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.name;
                    const priceFormatted = s.price ? formatPrice(s.price) : '';
                    opt.textContent = `${s.name}${priceFormatted ? ` (${priceFormatted})` : ''}`;
                    select.appendChild(opt);
                });
            }
        }

        // Renderizar Galeria
        if (photos && photos.length > 0) {
            const galleryGrid = document.getElementById('galleryGrid');
            if (galleryGrid) {
                galleryGrid.innerHTML = '';
                photos.forEach(p => {
                    const item = document.createElement('div');
                    item.className = 'portfolio-item visible';
                    item.innerHTML = `<img src="${p.image_url}" alt="${escapeHtml(p.title || 'Trabalho')}" loading="lazy">`;
                    galleryGrid.appendChild(item);
                });
            }
        }

        // Garantir que animações de reveal sejam aplicadas imediatamente aos novos cards
        revealOnScroll();
    } catch (e) {
        console.error("Erro ao renderizar dados do salão:", e);
    }
}

