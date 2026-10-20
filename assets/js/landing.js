// ==========================================================================
// NailDesign Pro — Lógica da Landing Page & Formulário de Orçamento WhatsApp
// Telefone de Atendimento: 19 3458-5300 (WhatsApp: 551934585300)
// ==========================================================================

const WHATSAPP_PHONE = '551934585300'; // Telefone 19 3458-5300

document.addEventListener('DOMContentLoaded', () => {
    // 1. Header Scroll Shadow
    const nav = document.getElementById('mainNav');
    if (nav) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 40) {
                nav.classList.add('scrolled');
            } else {
                nav.classList.remove('scrolled');
            }
        }, { passive: true });
    }

    // 2. Máscara Automática de Telefone WhatsApp
    const phoneInput = document.getElementById('clientPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', (e) => {
            let v = e.target.value.replace(/\D/g, '');
            if (v.length > 11) v = v.substring(0, 11);
            if (v.length > 10) {
                // Celular: (99) 99999-9999
                e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`;
            } else if (v.length > 6) {
                // Fixo ou Celular em digitação: (99) 9999-9999
                e.target.value = `(${v.slice(0, 2)}) ${v.slice(2, 6)}-${v.slice(6)}`;
            } else if (v.length > 2) {
                e.target.value = `(${v.slice(0, 2)}) ${v.slice(2)}`;
            } else if (v.length > 0) {
                e.target.value = `(${v}`;
            } else {
                e.target.value = '';
            }
        });
    }

    // 3. Processamento do Formulário de Orçamento
    const quoteForm = document.getElementById('quoteForm');
    if (quoteForm) {
        quoteForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const name = document.getElementById('clientName')?.value.trim() || '';
            const salon = document.getElementById('clientSalon')?.value.trim() || '';
            const phone = document.getElementById('clientPhone')?.value.trim() || '';
            const city = document.getElementById('clientCity')?.value.trim() || '';
            const interest = document.getElementById('clientInterest')?.value || 'Criar Site Completo para Salão de Unhas';
            const notes = document.getElementById('clientNotes')?.value.trim() || '';

            if (!name || !salon || !phone) {
                alert('Por favor, preencha seu nome, o nome do seu salão e seu WhatsApp para gerarmos o orçamento.');
                return;
            }

            // Montar mensagem elegante e persuasiva para o WhatsApp
            const messageLines = [
                `✨ *SOLICITAÇÃO DE ORÇAMENTO — SITE PARA SALÃO* ✨`,
                `━━━━━━━━━━━━━━━━━━━━━━━━━`,
                `👤 *Nail Designer / Responsável:* ${name}`,
                `💅 *Salão / Studio:* ${salon}`,
                `📱 *WhatsApp do Salão:* ${phone}`,
                city ? `📍 *Cidade / Estado:* ${city}` : null,
                `🎯 *Interesse Principal:* ${interest}`,
                notes ? `📝 *Detalhes:* ${notes}` : null,
                `━━━━━━━━━━━━━━━━━━━━━━━━━`,
                `_Olá! Gostaria de receber uma proposta para criação do site exclusivo do meu salão de unhas._`
            ].filter(Boolean);

            const fullText = messageLines.join('\n');
            const encodedText = encodeURIComponent(fullText);
            const waUrl = `https://wa.me/${WHATSAPP_PHONE}?text=${encodedText}`;

            // Feedback visual no botão
            const submitBtn = quoteForm.querySelector('.btn-submit-quote');
            if (submitBtn) {
                const originalHtml = submitBtn.innerHTML;
                submitBtn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> Abrindo WhatsApp...`;
                submitBtn.style.opacity = '0.85';
                submitBtn.style.pointerEvents = 'none';

                setTimeout(() => {
                    submitBtn.innerHTML = originalHtml;
                    submitBtn.style.opacity = '1';
                    submitBtn.style.pointerEvents = 'auto';
                }, 3000);
            }

            // Abrir WhatsApp diretamente
            window.open(waUrl, '_blank');
        });
    }

    // 4. Smooth Scroll para botões de orçamento
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const targetId = this.getAttribute('href');
            if (targetId && targetId !== '#') {
                const targetEl = document.querySelector(targetId);
                if (targetEl) {
                    e.preventDefault();
                    targetEl.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            }
        });
    });
});
