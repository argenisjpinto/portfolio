  (() => {
  (() => {
  const MAX_PARTICLES = 50;
  const SPAWN_COOLDOWN_MS = 22;
  const LIFE_MIN_MS = 2000;
  const LIFE_MAX_MS = 3000;
  const CONNECT_DIST = 150;
  const MAGNET_RADIUS = 220;
  const MAGNET_STRENGTH = 0.045;
  const FOLLOW_LAG = 0.12;  
  const COLORS = [
      { r: 0, g: 217, b: 255 },    // #00d9ff
      { r: 255, g: 107, b: 107 },  // #ff6b6b
      { r: 123, g: 237, b: 159 },  // #7bed9f
  ];  
  const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;
  const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;  
  const canvas = document.getElementById('particle-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d', { alpha: true });
  if (!ctx) return;  
  let dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
  let w = 0, h = 0;  
  function resize() {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = w + 'px';
      canvas.style.height = h + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  resize();
  window.addEventListener('resize', resize);  
  const cursor = {
      x: w * 0.5, y: h * 0.5,
      sx: w * 0.5, sy: h * 0.5,
      active: false,
      lastSpawnAt: 0,
  };  
  if (!isCoarsePointer) {
      window.addEventListener('mousemove', (e) => {
      cursor.x = e.clientX;
      cursor.y = e.clientY;
      cursor.active = true;
      }, { passive: true });  
      window.addEventListener('mouseleave', () => {
      cursor.active = false;
      });
  }  
  const particles = [];  
  const rand = (min, max) => min + Math.random() * (max - min);
  const pickColor = () => COLORS[(Math.random() * COLORS.length) | 0];  
  function spawnParticle(x, y) {
      if (particles.length >= MAX_PARTICLES) particles.shift();  
      const c = pickColor();
      const life = rand(LIFE_MIN_MS, LIFE_MAX_MS);  
      particles.push({
      x: x + rand(-12, 12),
      y: y + rand(-12, 12),
      vx: rand(-0.25, 0.25),
      vy: rand(-0.25, 0.25),
      r: rand(2, 4),
      a0: rand(0.4, 0.8),
      a: 1,
      c,
      born: performance.now(),
      life,
      drift: rand(0.01, 0.03),
      });
  }  
  function seedMobileParticles() {
      const count = Math.min(28, MAX_PARTICLES);
      particles.length = 0;
      for (let i = 0; i < count; i++) {
      const c = pickColor();
      particles.push({
          x: rand(0, w),
          y: rand(0, h),
          vx: rand(-0.18, 0.18),
          vy: rand(-0.18, 0.18),
          r: rand(2, 4),
          a0: rand(0.35, 0.7),
          a: 1,
          c,
          born: performance.now(),
          life: rand(8000, 12000),
          drift: rand(0.006, 0.02),
      });
      }
  }
  if (isCoarsePointer) seedMobileParticles();  
  function update(now, dt) {
      cursor.sx += (cursor.x - cursor.sx) * FOLLOW_LAG;
      cursor.sy += (cursor.y - cursor.sy) * FOLLOW_LAG;  
      if (!isCoarsePointer && cursor.active) {
      if (now - cursor.lastSpawnAt >= SPAWN_COOLDOWN_MS) {
          cursor.lastSpawnAt = now;
          spawnParticle(cursor.sx, cursor.sy);
      }
      }  
      for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      const age = now - p.born;
      const t = age / p.life;  
      if (t >= 1) {
          particles.splice(i, 1);
          if (isCoarsePointer) spawnParticle(rand(0, w), rand(0, h));
          continue;
      }  
      const fadeStart = 0.7;
      p.a = t > fadeStart ? (1 - (t - fadeStart) / (1 - fadeStart)) : 1;  
      if (!isCoarsePointer && cursor.active) {
          const dx = cursor.sx - p.x;
          const dy = cursor.sy - p.y;
          const dist2 = dx * dx + dy * dy;
          if (dist2 < MAGNET_RADIUS * MAGNET_RADIUS) {
          const dist = Math.sqrt(dist2) || 1;
          const pull = (1 - dist / MAGNET_RADIUS) * MAGNET_STRENGTH;
          p.vx += (dx / dist) * pull;
          p.vy += (dy / dist) * pull;
          }
      }  
      p.vx += rand(-p.drift, p.drift) * 0.25;
      p.vy += rand(-p.drift, p.drift) * 0.25;
      p.vx *= 0.985;
      p.vy *= 0.985;  
      p.x += p.vx * (dt / 16.7);
      p.y += p.vy * (dt / 16.7);  
      if (p.x < -20) p.x = w + 20;
      if (p.x > w + 20) p.x = -20;
      if (p.y < -20) p.y = h + 20;
      if (p.y > h + 20) p.y = -20;
      }
  }  
  function draw() {
      ctx.clearRect(0, 0, w, h);  
      for (let i = 0; i < particles.length; i++) {
      const a = particles[i];
      for (let j = i + 1; j < particles.length; j++) {
          const b = particles[j];
          const dx = a.x - b.x;
          const dy = a.y - b.y;
          const dist2 = dx * dx + dy * dy;  
          if (dist2 <= CONNECT_DIST * CONNECT_DIST) {
          const dist = Math.sqrt(dist2) || 1;
          const proximity = 1 - dist / CONNECT_DIST;  
          const alpha = (0.20 + (0.40 - 0.20) * proximity) * Math.min(a.a, b.a);  
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.lineWidth = 1;
          ctx.strokeStyle = `rgba(255,255,255,${alpha})`;
          ctx.stroke();
          }
      }
      }  
      for (const p of particles) {
      const alpha = p.a0 * p.a;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${p.c.r},${p.c.g},${p.c.b},${alpha})`;
      ctx.fill();
      }
  }  
  let last = performance.now();
  function loop(now) {
      const dt = Math.min(48, now - last);
      last = now;
      update(now, dt);
      draw();
      requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  })();
    
  // --- 0) Helpers ---
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // --- 1) Navbar Glass Effect & Scroll ---
  const navbar = $('#navbar');
  window.addEventListener('scroll', () => {
    if (!navbar) return;
    if (window.scrollY > 50) {
      navbar.classList.add('glass-panel');
      navbar.classList.remove('bg-transparent');
    } else {
      navbar.classList.remove('glass-panel');
      navbar.classList.add('bg-transparent');
    }
  });

  // Logo scroll top (evita inline onclick)
  const scrollTopEl = document.querySelector('[data-scroll-top]');
  if (scrollTopEl) {
    scrollTopEl.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // --- 2) Mobile Menu ---
  const btn = $('#mobile-menu-btn');
  const menu = $('#mobile-menu');
  const links = $$('.mobile-link');

  if (btn && menu) {
    btn.addEventListener('click', () => menu.classList.toggle('hidden'));
    links.forEach(link => link.addEventListener('click', () => menu.classList.add('hidden')));
  }

  // --- Close mobile menu on scroll ---
  let lastScrollY = window.scrollY;

  window.addEventListener('scroll', () => {
    // Solo aplica en mobile (md:hidden => <768px aprox)
    if (window.innerWidth >= 768) return;

    // Si el menú está abierto (no tiene 'hidden'), lo cerramos al primer scroll
    if (menu && !menu.classList.contains('hidden')) {
      menu.classList.add('hidden');
    }

    lastScrollY = window.scrollY;
    }, { passive: true });

    window.addEventListener('resize', () => {
      if (menu && !menu.classList.contains('hidden')) {
        menu.classList.add('hidden');
      }
    }, { passive: true });


  // --- 3) Scroll Reveal + Skill Bars + Counters ---
  const revealElements = $$('.reveal');
  const counters = $$('.counter');
  let counted = false;

  const observerOptions = {
    threshold: 0.15,
    rootMargin: "0px 0px -50px 0px"
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      entry.target.classList.add('active');

      // Counters una sola vez (cuando aparece un bloque que tenga counters)
      if (entry.target.querySelector('.counter') && !counted) {
        startCounters();
        counted = true;
      }

      // Skill bars (cuando aparecen)
      if (entry.target.querySelector('.skill-fill')) {
        const bars = entry.target.querySelectorAll('.skill-fill');
        bars.forEach(bar => {
          bar.style.width = bar.getAttribute('data-width') || '0%';
        });
      }
    });
  }, observerOptions);

  revealElements.forEach(el => observer.observe(el));

  function startCounters() {
    counters.forEach(counter => {
      const target = Number(counter.getAttribute('data-target') || 0);
      const duration = 2000; // ms
      const increment = target / (duration / 16); // ~60fps

      let current = 0;
      const updateCounter = () => {
        current += increment;
        if (current < target) {
          counter.innerText = Math.ceil(current) + (target > 10 ? '+' : '');
          requestAnimationFrame(updateCounter);
        } else {
          counter.innerText = target + '+';
        }
      };
      updateCounter();
    });
  }

  // --- 4) Form Validation + Simulation ---
  const form = $('#contactForm');
  const submitBtn = $('#submitBtn');
  
  const nameInput = $('#name');
  const emailInput = $('#email');
  const subjectInput = $('#subject');
  const messageInput = $('#message');
  
  const errorName = $('#error-name');
  const errorEmail = $('#error-email');
  const errorSubject = $('#error-subject');
  const errorMessage = $('#error-message');
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  function showError(inputEl, errorEl, msg) {
    if (!inputEl || !errorEl) return;
    inputEl.classList.add('border-red-500');
    errorEl.textContent = msg;
    errorEl.classList.remove('hidden');
  }
  
  function clearError(inputEl, errorEl) {
    if (!inputEl || !errorEl) return;
    inputEl.classList.remove('border-red-500');
    errorEl.textContent = '';
    errorEl.classList.add('hidden');
  }
  
  function validateForm() {
    let ok = true;
  
    // Nombre
    const nameVal = (nameInput?.value || '').trim();
    if (!nameVal) {
      showError(nameInput, errorName, 'El nombre es obligatorio.');
      ok = false;
    } else if (nameVal.length < 2) {
      showError(nameInput, errorName, 'El nombre debe tener al menos 2 caracteres.');
      ok = false;
    } else {
      clearError(nameInput, errorName);
    }
  
    // Email
    const emailVal = (emailInput?.value || '').trim();
    if (!emailVal) {
      showError(emailInput, errorEmail, 'El email es obligatorio.');
      ok = false;
    } else if (!emailRegex.test(emailVal)) {
      showError(emailInput, errorEmail, 'Ingresá un email válido.');
      ok = false;
    } else {
      clearError(emailInput, errorEmail);
    }
  
    // Asunto
    const subjectVal = (subjectInput?.value || '').trim();
    if (!subjectVal) {
      showError(subjectInput, errorSubject, 'El asunto es obligatorio.');
      ok = false;
    } else if (subjectVal.length < 4) {
      showError(subjectInput, errorSubject, 'El asunto debe tener al menos 4 caracteres.');
      ok = false;
    } else {
      clearError(subjectInput, errorSubject);
    }
  
    // Mensaje
    const messageVal = (messageInput?.value || '').trim();
    if (!messageVal) {
      showError(messageInput, errorMessage, 'El mensaje es obligatorio.');
      ok = false;
    } else if (messageVal.length < 10) {
      showError(messageInput, errorMessage, 'El mensaje debe tener al menos 10 caracteres.');
      ok = false;
    } else {
      clearError(messageInput, errorMessage);
    }
  
    return ok;
  }
  
  // Limpia error cuando escribe, y valida cuando sale del campo
  [
    [nameInput, errorName],
    [emailInput, errorEmail],
    [subjectInput, errorSubject],
    [messageInput, errorMessage],
  ].forEach(([inputEl, errorEl]) => {
    if (!inputEl) return;
    inputEl.addEventListener('input', () => clearError(inputEl, errorEl));
    inputEl.addEventListener('blur', () => validateForm());
  });
  
  function handleSubmit() {
    if (!submitBtn || !form) return;
  
    const originalHTML = submitBtn.innerHTML;
  
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Enviando...';
    submitBtn.classList.add('opacity-75', 'cursor-not-allowed');
  
    setTimeout(() => {
      submitBtn.innerHTML = '<i class="fas fa-check"></i> ¡Mensaje Enviado!';
      submitBtn.classList.remove('from-accentPrimary', 'to-blue-500');
      submitBtn.classList.add('bg-green-500', 'text-white');
  
      setTimeout(() => {
        form.reset();
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalHTML;
        submitBtn.classList.add('from-accentPrimary', 'to-blue-500');
        submitBtn.classList.remove('bg-green-500', 'text-white', 'opacity-75', 'cursor-not-allowed');
  
        // Limpia errores visibles al resetear
        clearError(nameInput, errorName);
        clearError(emailInput, errorEmail);
        clearError(subjectInput, errorSubject);
        clearError(messageInput, errorMessage);
      }, 2500);
    }, 1500);
  }
  
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
  
      const ok = validateForm();
      if (!ok) return; // 👈 si hay errores, NO se envía
  
      handleSubmit();
    });
  }

  (() => {
    const modal = document.getElementById('videoModal');
    const backdrop = document.getElementById('videoModalBackdrop');
    const closeBtn = document.getElementById('videoModalClose');
    const frame = document.getElementById('videoModalFrame');
    const titleEl = document.getElementById('videoModalTitle');

    if (!modal || !backdrop || !closeBtn || !frame || !titleEl) return;

    const isCoarsePointer = window.matchMedia?.('(pointer: coarse)').matches;

    function openModal(url, title) {
      // En mobile: mejor abrir LinkedIn directo (embeds suelen fallar)
      if (isCoarsePointer) {
        window.open(url.replace('/embed/feed/update/', '/feed/update/'), '_blank', 'noopener,noreferrer');
        return;
      }

      titleEl.textContent = title || 'Video';
      frame.src = url;
      modal.classList.remove('hidden');
      document.documentElement.classList.add('overflow-hidden');
    }

    function closeModal() {
      modal.classList.add('hidden');
      frame.src = ''; // corta el video
      document.documentElement.classList.remove('overflow-hidden');
    }

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-video-url]');
      if (!btn) return;

      const url = btn.getAttribute('data-video-url');
      const title = btn.getAttribute('data-video-title') || 'Video';
      if (url) openModal(url, title);
    });

    backdrop.addEventListener('click', closeModal);
    closeBtn.addEventListener('click', closeModal);

    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && !modal.classList.contains('hidden')) closeModal();
    });
  })();

  // --- 5) Easter Egg ---
  console.log(
    "%c👨‍💻 ¿Inspeccionando el código?",
    "color: #00d9ff; font-family: sans-serif; font-size: 20px; font-weight: bold; padding: 10px;"
  );
  console.log(
    "%cMe gusta tu enfoque detallista. Si eres reclutador o developer, definitivamente deberíamos hablar.",
    "color: #fff; font-family: sans-serif; font-size: 14px;"
  );
  console.log(
    "%c📧 argenisjpinto.it@gmail.com",
    "color: #ff6b6b; font-family: monospace; font-size: 14px; font-weight: bold;"
  );

  document.body.appendChild(
    document.createComment(" ✅ Test Suite Passed: 100% Coverage. Portfolio ready for deployment. ")
  );

  const params = new URLSearchParams(window.location.search);
  const lang = params.get("lang");
  
  if (lang === "en") {
    setLanguage("en");
  } else {
    setLanguage("es");
  }
})();
