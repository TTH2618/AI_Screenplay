/**
 * AI Screenplay - Home Page JavaScript
 */

// ── Landing Page Config ──────────────────────────────────────
async function applyLandingConfig() {
    try {
        const apiBase = (window.APP_CONFIG && window.APP_CONFIG.API_BASE_URL)
            ? window.APP_CONFIG.API_BASE_URL.replace(/\/api$/, '') : '';
        const res = await fetch(`${apiBase}/api/landing-config`);
        const json = await res.json();
        if (!json.success || !json.data || Object.keys(json.data).length === 0) return;
        const c = json.data;
        function set(sel, val) {
            if (!val) return;
            document.querySelectorAll(sel).forEach(el => { el.textContent = val; });
        }
        // General
        if (c.site_name) document.querySelectorAll('[data-lp="site-name"]').forEach(el => { el.textContent = c.site_name; });
        // Hero
        const h = c.hero || {};
        set('[data-lp="hero-badge"]', h.badge);
        set('[data-lp="hero-title-before"]', h.title_before);
        set('[data-lp="hero-title-gradient"]', h.title_gradient);
        set('[data-lp="hero-title-after"]', h.title_after);
        set('[data-lp="hero-subtitle"]', h.subtitle);
        set('[data-lp="hero-cta-primary"]', h.cta_primary);
        set('[data-lp="hero-cta-secondary"]', h.cta_secondary);
        for (let i = 0; i < 3; i++) {
            const countEl = document.querySelector(`[data-lp="hero-stat-${i}-count"]`);
            const labelEl = document.querySelector(`[data-lp="hero-stat-${i}-label"]`);
            if (countEl && h[`stat_${i}_count`] != null) {
                countEl.dataset.count = h[`stat_${i}_count`];
            }
            if (labelEl && h[`stat_${i}_label`]) labelEl.textContent = h[`stat_${i}_label`];
        }
        // Features
        const f = c.features || {};
        set('[data-lp="features-badge"]', f.badge);
        set('[data-lp="features-title"]', f.title);
        set('[data-lp="features-subtitle"]', f.subtitle);
        if (f.cards && Array.isArray(f.cards)) {
            f.cards.forEach((card, i) => {
                const cardEl = document.querySelector(`[data-lp-card="${i}"]`);
                if (!cardEl) return;
                const iconEl = cardEl.querySelector('[data-lp-card-icon]');
                const titleEl = cardEl.querySelector('[data-lp-card-title]');
                const descEl = cardEl.querySelector('[data-lp-card-desc]');
                if (iconEl && card.icon) iconEl.className = `fas ${card.icon}`;
                if (titleEl && card.title) titleEl.textContent = card.title;
                if (descEl && card.desc) descEl.textContent = card.desc;
            });
        }
        // Testimonials
        const t = c.testimonials || {};
        set('[data-lp="testimonials-badge"]', t.badge);
        set('[data-lp="testimonials-title"]', t.title);
        set('[data-lp="testimonials-subtitle"]', t.subtitle);
        if (t.items && Array.isArray(t.items)) {
            t.items.forEach((item, i) => {
                const itemEl = document.querySelector(`[data-lp-testimonial="${i}"]`);
                if (!itemEl) return;
                const textEl = itemEl.querySelector('[data-lp-testimonial-text]');
                const authorEl = itemEl.querySelector('[data-lp-testimonial-author]');
                const roleEl = itemEl.querySelector('[data-lp-testimonial-role]');
                if (textEl && item.text) textEl.textContent = item.text;
                if (authorEl && item.author) authorEl.textContent = item.author;
                if (roleEl && item.role) roleEl.textContent = item.role;
            });
        }
        // CTA & Footer
        const cta = c.cta || {};
        set('[data-lp="cta-heading"]', cta.heading);
        set('[data-lp="cta-subtext"]', cta.subtext);
        const footer = c.footer || {};
        set('[data-lp="footer-brand-desc"]', footer.brand_desc);
        set('[data-lp="footer-copyright"]', footer.copyright);
        // Workflow
        const wf = c.workflow || {};
        set('[data-lp="workflow-badge"]', wf.badge);
        set('[data-lp="workflow-title"]', wf.title);
        set('[data-lp="workflow-subtitle"]', wf.subtitle);
        if (wf.steps && Array.isArray(wf.steps) && wf.steps.length > 0) {
            const timeline = document.querySelector('.workflow-timeline');
            if (timeline) {
                timeline.innerHTML = '<div class="timeline-line"></div>' +
                    wf.steps.map((step, i) => `
                        <div class="workflow-step" data-step="${i + 1}" data-lp-step="${i}">
                            <div class="step-icon">
                                <i class="fas ${step.icon || 'fa-circle'}"></i>
                            </div>
                            <div class="step-content">
                                <h3 data-lp-step-title>${step.title || ''}</h3>
                                <p data-lp-step-desc>${step.desc || ''}</p>
                            </div>
                        </div>
                    `).join('');
            }
        }
        // Section visibility
        const sv = c.sections_visible || {};
        document.querySelectorAll('[data-lp-section]').forEach(el => {
            const key = el.getAttribute('data-lp-section');
            el.style.display = (sv[key] === false) ? 'none' : '';
        });
    } catch (e) {
        console.warn('Could not apply landing config:', e.message);
    }
}
applyLandingConfig();

// Toggle mobile menu
function toggleMobileMenu() {
    const mobileMenu = document.getElementById('mobileMenu');
    mobileMenu.classList.toggle('active');
}

// Navbar scroll effect
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.classList.add('scrolled');
    } else {
        navbar.classList.remove('scrolled');
    }
});

// Smooth scroll for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
            // Close mobile menu if open
            document.getElementById('mobileMenu').classList.remove('active');
        }
    });
});

// Animate stats counter
function animateCounter(element, target) {
    let current = 0;
    const increment = target / 50;
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            element.textContent = target + '+';
            clearInterval(timer);
        } else {
            element.textContent = Math.floor(current);
        }
    }, 30);
}

// Intersection Observer for stats animation
const observerOptions = {
    threshold: 0.5,
    rootMargin: '0px'
};

const statsObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const statNumbers = entry.target.querySelectorAll('.stat-number');
            statNumbers.forEach(stat => {
                const target = parseInt(stat.dataset.count);
                animateCounter(stat, target);
            });
            statsObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

const heroStats = document.querySelector('.hero-stats');
if (heroStats) {
    statsObserver.observe(heroStats);
}

// Tools tab functionality
const toolTabs = document.querySelectorAll('.tool-tab');
const toolPreviews = document.querySelectorAll('.tool-preview');

toolTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        const toolId = tab.dataset.tool;
        
        // Update active tab
        toolTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding preview
        toolPreviews.forEach(preview => {
            preview.classList.remove('active');
            if (preview.id === `preview-${toolId}`) {
                preview.classList.add('active');
            }
        });
    });
});

// Workflow animation on scroll
const workflowSteps = document.querySelectorAll('.workflow-step');
const workflowObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateX(0)';
        }
    });
}, { threshold: 0.3 });

workflowSteps.forEach((step, index) => {
    step.style.opacity = '0';
    step.style.transform = 'translateX(-30px)';
    step.style.transition = `all 0.5s ease ${index * 0.1}s`;
    workflowObserver.observe(step);
});

// Feature cards animation
const featureCards = document.querySelectorAll('.feature-card');
const featureObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.2 });

featureCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.5s ease ${index * 0.1}s`;
    featureObserver.observe(card);
});

// Testimonial cards animation
const testimonialCards = document.querySelectorAll('.testimonial-card');
const testimonialObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
        }
    });
}, { threshold: 0.2 });

testimonialCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(30px)';
    card.style.transition = `all 0.5s ease ${index * 0.15}s`;
    testimonialObserver.observe(card);
});

// Typing effect for demo
const typingTexts = [
    'Tạo Logline cho phim...',
    'Phân tích chủ đề chính...',
    'Xây dựng hồ sơ nhân vật...',
    'Viết Synopsis chi tiết...',
    'Thiết kế cấu trúc 4 hồi...'
];

let textIndex = 0;
let charIndex = 0;
let isDeleting = false;
const typingElement = document.querySelector('.typing-text');

function typeEffect() {
    if (!typingElement) return;
    
    const currentText = typingTexts[textIndex];
    
    if (isDeleting) {
        typingElement.textContent = currentText.substring(0, charIndex - 1);
        charIndex--;
    } else {
        typingElement.textContent = currentText.substring(0, charIndex + 1);
        charIndex++;
    }
    
    let typeSpeed = isDeleting ? 30 : 80;
    
    if (!isDeleting && charIndex === currentText.length) {
        typeSpeed = 2000; // Pause at end
        isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
        isDeleting = false;
        textIndex = (textIndex + 1) % typingTexts.length;
        typeSpeed = 500;
    }
    
    setTimeout(typeEffect, typeSpeed);
}

// Start typing effect
typeEffect();

// Parallax effect for floating elements
window.addEventListener('mousemove', (e) => {
    const floatElements = document.querySelectorAll('.float-element');
    const mouseX = e.clientX / window.innerWidth;
    const mouseY = e.clientY / window.innerHeight;
    
    floatElements.forEach((elem, index) => {
        const speed = (index + 1) * 10;
        const x = (mouseX - 0.5) * speed;
        const y = (mouseY - 0.5) * speed;
        elem.style.transform = `translate(${x}px, ${y}px)`;
    });
});

// Check if user is logged in
function checkAuth() {
    const user = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (user) {
        // User is logged in, update CTA buttons
        const ctaButtons = document.querySelectorAll('.btn-start, .btn-primary');
        ctaButtons.forEach(btn => {
            if (btn.href && btn.href.includes('auth.html')) {
                btn.href = 'index.html';
                if (btn.textContent.includes('Bắt đầu')) {
                    btn.innerHTML = '<i class="fas fa-play"></i> Vào Studio';
                }
            }
        });
        
        // Update login button
        const loginBtn = document.querySelector('.btn-login');
        if (loginBtn) {
            loginBtn.textContent = 'Vào Studio';
            loginBtn.href = 'index.html';
        }
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
});

// Close mobile menu when clicking outside
document.addEventListener('click', (e) => {
    const mobileMenu = document.getElementById('mobileMenu');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (mobileMenu.classList.contains('active') && 
        !mobileMenu.contains(e.target) && 
        !menuBtn.contains(e.target)) {
        mobileMenu.classList.remove('active');
    }
});
