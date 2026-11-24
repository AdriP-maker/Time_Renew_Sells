/* ==========================================================================
   Time Renew 2026 — Landing & Paddle Sandbox Checkout Controller
   Nota: El clientToken (`test_...`) es un token público de cliente de Paddle
   diseñado para ejecutarse en navegador con Paddle.js (nunca uses API Keys
   secretas `pdl_sdbx_` ni `pdl_live_` en archivos públicos).
   ========================================================================== */

const TIMERENEW_PADDLE = {
  environment: "sandbox", // Cambiar a "live" al pasar a producción
  clientToken: "test_28cc1ce1a1de17f132f9173c4b2",
  prices: {
    monthly: "pri_01m87xqew4ktvtcxnqk83cf4vt",   // USD 19/mes | EUR 18/mes
    annual: "pri_01m87xqf71v6v18bbgcxmg7bfb",    // USD 99/año | EUR 92/año
    perpetual: "pri_01m87xqfbawxxb2v42d3txmadg", // USD 249    | EUR 229
    volume: "pri_01m87xqfexz0vk5qsxfx7pqq0p"     // USD 42/u   | EUR 39/u (min 10)
  }
};

const PRICING_DISPLAY = {
  eu: {
    trial: "€0",
    monthly: "€18",
    annual: "€92",
    annualNote: "Equivale a €7,67/mes · Ahorra un 57% frente al plan mensual.",
    perpetual: "€229",
    volumeUnit: 39,
    currencySymbol: "€",
    countryHint: "ES"
  },
  latam: {
    trial: "USD 0",
    monthly: "USD 19",
    annual: "USD 99",
    annualNote: "Equivale a USD 8,25/mes · Ahorra un 56% frente al plan mensual.",
    perpetual: "USD 249",
    volumeUnit: 42,
    currencySymbol: "USD ",
    countryHint: "PA"
  }
};

let activeRegion = "eu";
let paddleInitialized = false;

function showWarning(message) {
  const box = document.getElementById("checkout-warning");
  if (!box) return;
  box.textContent = message;
  box.hidden = false;
}

function hideWarning() {
  const box = document.getElementById("checkout-warning");
  if (!box) return;
  box.hidden = true;
}

/* --- 1. Simulador Interactivo de la Cuadrícula Time Renew --- */
const TIMETABLE_STATES = {
  after: {
    badgeText: "0 colisiones · Calidad 98%",
    badgeClass: "status-badge status-badge--ok",
    detailText: "Máx. 4 h seguidas · 0 huecos alumnos",
    rows: [
      {
        period: "08:00",
        cells: [
          { type: "locked", title: "Matemáticas 🔒", meta: "M. López · Aula 101" },
          { type: "ok", title: "Lengua", meta: "J. Ruiz · Aula 102" },
          { type: "ok", title: "Física (Bloque 1/2)", meta: "A. Torres · Lab. Fís." }
        ]
      },
      {
        period: "09:00",
        cells: [
          { type: "ok", title: "Inglés (Desdoble)", meta: "C. Vega · Aula 101" },
          { type: "ok", title: "Matemáticas", meta: "M. López · Aula 102" },
          { type: "double", title: "Física (Bloque 2/2)", meta: "A. Torres · Lab. Fís." }
        ]
      },
      { type: "recess", label: "Recreo · 10:00 – 10:30 (Bloques dobles no cruzan recreo)" },
      {
        period: "10:30",
        cells: [
          { type: "ok", title: "Química", meta: "D. Sáez · Lab. Quím." },
          { type: "ok", title: "Geografía", meta: "E. Gil · Aula 102" },
          { type: "ok", title: "Matemáticas", meta: "M. López · Aula 201" }
        ]
      }
    ]
  },
  before: {
    badgeText: "4 conflictos · Calidad 42%",
    badgeClass: "status-badge status-badge--err",
    detailText: "Choque de aula y docente · 2 huecos",
    rows: [
      {
        period: "08:00",
        cells: [
          { type: "conflict", title: "Matemáticas ✕", meta: "M. López (doble clase)" },
          { type: "conflict", title: "Matemáticas ✕", meta: "M. López (mismo tramo)" },
          { type: "ok", title: "Física (Parte 1)", meta: "A. Torres · Lab. Fís." }
        ]
      },
      {
        period: "09:00",
        cells: [
          { type: "gap", title: "Hueco / Hora puente", meta: "Sin docente asignado" },
          { type: "conflict", title: "Química ✕", meta: "Lab. Quím. ocupado" },
          { type: "conflict", title: "Química ✕", meta: "D. Sáez (indisp. ✕)" }
        ]
      },
      { type: "recess", label: "Recreo · 10:00 – 10:30 (Bloque doble partido)" },
      {
        period: "10:30",
        cells: [
          { type: "ok", title: "Inglés", meta: "C. Vega · Aula 101" },
          { type: "gap", title: "Hueco / Hora puente", meta: "Grupo sin clase" },
          { type: "ok", title: "Física (Parte 2)", meta: "A. Torres · Aula 201" }
        ]
      }
    ]
  }
};

function renderTimetable(mode) {
  const data = TIMETABLE_STATES[mode];
  const tbody = document.getElementById("timetable-body");
  const badge = document.getElementById("grid-status-badge");
  const detail = document.getElementById("grid-status-detail");
  const btnBefore = document.getElementById("mode-before");
  const btnAfter = document.getElementById("mode-after");
  if (!tbody || !data) return;

  badge.textContent = data.badgeText;
  badge.className = data.badgeClass;
  detail.textContent = data.detailText;
  btnBefore.setAttribute("aria-pressed", String(mode === "before"));
  btnAfter.setAttribute("aria-pressed", String(mode === "after"));

  tbody.innerHTML = data.rows
    .map((row) => {
      if (row.type === "recess") {
        return `<tr><td colspan="4"><div class="tt-recess">${row.label}</div></td></tr>`;
      }
      const cols = row.cells
        .map(
          (cell) => `
          <td>
            <div class="tt-card tt-card--${cell.type}">
              <strong>${cell.title}</strong>
              <span>${cell.meta}</span>
            </div>
          </td>`
        )
        .join("");
      return `<tr><td class="tt-period">${row.period}</td>${cols}</tr>`;
    })
    .join("");
}

/* --- 2. Selector EUR (España/UE) ↔ USD (LatAm) + Calculadora Volumen --- */
function updatePricingUI() {
  const cfg = PRICING_DISPLAY[activeRegion];
  const trialEl = document.getElementById("price-trial");
  if (trialEl) trialEl.textContent = cfg.trial;

  document.querySelectorAll("[data-price]").forEach((el) => {
    const key = el.getAttribute("data-price");
    if (key === "volumeUnit") {
      el.textContent = `${cfg.currencySymbol}${cfg.volumeUnit}`;
    } else if (cfg[key]) {
      el.textContent = cfg[key];
    }
  });

  const annualNote = document.querySelector('[data-note="annual"]');
  if (annualNote) annualNote.textContent = cfg.annualNote;

  const btnEu = document.getElementById("region-eu");
  const btnLatam = document.getElementById("region-latam");
  if (btnEu && btnLatam) {
    btnEu.setAttribute("aria-pressed", String(activeRegion === "eu"));
    btnLatam.setAttribute("aria-pressed", String(activeRegion === "latam"));
  }

  updateVolumeCalculator();
}

function updateVolumeCalculator() {
  const slider = document.getElementById("volume-qty");
  const qtyLabel = document.getElementById("volume-qty-label");
  const totalLabel = document.getElementById("volume-total-amount");
  if (!slider || !qtyLabel || !totalLabel) return;

  const qty = Number(slider.value) || 10;
  const cfg = PRICING_DISPLAY[activeRegion];
  const total = qty * cfg.volumeUnit;

  qtyLabel.textContent = `${qty} centros`;
  totalLabel.textContent = `${cfg.currencySymbol}${total.toLocaleString("es-ES")} / año`;
}

/* --- 3. Integración Paddle.js v2 (Sandbox) --- */
function openSuccessModal(eventData) {
  const modal = document.getElementById("success-modal");
  const details = document.getElementById("success-details");
  if (!modal || !details) return;

  const d = (eventData && eventData.data) || {};
  const txnId = d.transaction_id || "—";
  const status = d.status || "completed";
  const total =
    d.totals && d.totals.total != null && d.currency_code
      ? `${(Number(d.totals.total) / 100).toFixed(2)} ${d.currency_code}`
      : "Procesado en Sandbox";

  details.innerHTML = `
    <div><strong>Transacción:</strong> <code class="mono">${txnId}</code></div>
    <div><strong>Estado:</strong> ${status}</div>
    <div><strong>Importe Sandbox:</strong> ${total}</div>
  `;
  modal.hidden = false;
}

function initPaddle() {
  if (typeof window.Paddle === "undefined") {
    return false;
  }
  if (paddleInitialized) return true;

  try {
    if (TIMERENEW_PADDLE.environment === "sandbox") {
      window.Paddle.Environment.set("sandbox");
    }
    window.Paddle.Initialize({
      token: TIMERENEW_PADDLE.clientToken,
      eventCallback: function (event) {
        if (event && event.name === "checkout.completed") {
          openSuccessModal(event);
        }
      }
    });
    paddleInitialized = true;
    return true;
  } catch (err) {
    showWarning("No se pudo inicializar Paddle.js: " + (err && err.message ? err.message : String(err)));
    return false;
  }
}

function openPaddleCheckout(planKey) {
  hideWarning();

  if (window.location.protocol === "file:") {
    showWarning("Paddle.js requiere abrir la página desde HTTPS (GitHub Pages), no directamente como archivo local file://.");
    return;
  }

  if (!initPaddle()) {
    showWarning("El script de Paddle.js aún está cargando o fue bloqueado por una extensión del navegador. Reintenta en un segundo.");
    return;
  }

  const priceId = TIMERENEW_PADDLE.prices[planKey];
  if (!priceId) return;

  const quantity =
    planKey === "volume"
      ? Math.max(10, Number((document.getElementById("volume-qty") || {}).value || 10))
      : 1;

  window.Paddle.Checkout.open({
    items: [{ priceId, quantity }],
    settings: {
      displayMode: "overlay",
      theme: "light",
      locale: "es",
      allowLogout: true
    }
  });
}

/* --- 4. Inicialización de eventos --- */
document.addEventListener("DOMContentLoaded", () => {
  renderTimetable("after");
  updatePricingUI();

  const btnBefore = document.getElementById("mode-before");
  const btnAfter = document.getElementById("mode-after");
  if (btnBefore) btnBefore.addEventListener("click", () => renderTimetable("before"));
  if (btnAfter) btnAfter.addEventListener("click", () => renderTimetable("after"));

  const btnEu = document.getElementById("region-eu");
  const btnLatam = document.getElementById("region-latam");
  if (btnEu) {
    btnEu.addEventListener("click", () => {
      activeRegion = "eu";
      updatePricingUI();
    });
  }
  if (btnLatam) {
    btnLatam.addEventListener("click", () => {
      activeRegion = "latam";
      updatePricingUI();
    });
  }

  const volumeSlider = document.getElementById("volume-qty");
  if (volumeSlider) {
    volumeSlider.addEventListener("input", updateVolumeCalculator);
  }

  document.querySelectorAll(".js-paddle-buy").forEach((btn) => {
    btn.addEventListener("click", () => openPaddleCheckout(btn.getAttribute("data-plan")));
  });

  const copyBtn = document.getElementById("copy-test-card");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText("4242424242424242");
        copyBtn.textContent = "Copiada: 4242...4242";
        setTimeout(() => {
          copyBtn.textContent = "Copiar tarjeta de prueba";
        }, 2200);
      } catch {
        copyBtn.textContent = "4242 4242 4242 4242";
      }
    });
  }

  document.querySelectorAll(".faq-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
      const expanded = trigger.getAttribute("aria-expanded") === "true";
      const panel = trigger.nextElementSibling;
      const icon = trigger.querySelector("[aria-hidden]");
      trigger.setAttribute("aria-expanded", String(!expanded));
      if (panel) panel.hidden = expanded;
      if (icon) icon.textContent = expanded ? "+" : "−";
    });
  });

  const closeModal = document.getElementById("close-success-modal");
  const modal = document.getElementById("success-modal");
  if (closeModal && modal) {
    closeModal.addEventListener("click", () => {
      modal.hidden = true;
    });
    modal.addEventListener("click", (e) => {
      if (e.target === modal) modal.hidden = true;
    });
  }

  // Inicializar Paddle al terminar de cargar para capturar automáticamente ?_ptxn=...
  window.addEventListener("load", () => {
    initPaddle();
  });
});
