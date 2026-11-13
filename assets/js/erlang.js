/* ============================================================
   Калькулятор Erlang C — логика (Интеграция с Табрикой)
   ============================================================ */

// 👇 ВСТАВЬТЕ ВАШИ ДАННЫЕ СЮДА (кавычки оставьте):
const TABRICA_TOKEN = 'tab_LmWW4dwJ4aavH7j8bgrorjgtWdqeOQlCFXOJkgHqh30N_cGahCrw7HoebTvBDSHE'; 
const DATABASE_ID = '348'; // Уже заполнено из вашей ссылки
const TABLE_ID = '511';    // Уже заполнено из вашей ссылки

// URL для создания записи в Табрике (REST v1)
const API_ENDPOINT = `https://api.tabrica.ru/public/v1/databases/${DATABASE_ID}/tables/${TABLE_ID}/records`;

// ============ Математика Erlang C ============
function factorial(n) {
  if (n === 0 || n === 1) return 1;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function erlangC(agents, traffic) {
  if (agents <= traffic) return 1;
  let sum = 0;
  for (let i = 0; i < agents; i++) sum += Math.pow(traffic, i) / factorial(i);
  const top = (Math.pow(traffic, agents) / factorial(agents)) * (agents / (agents - traffic));
  return top / (sum + top);
}

function calculateSLA(agents, traffic, handleTime, targetTime) {
  if (agents <= traffic) return 0;
  const ec = erlangC(agents, traffic);
  const sla = 1 - ec * Math.exp(-(agents - traffic) * (targetTime / handleTime));
  return sla * 100;
}

// ============ DOM ============
const els = {
  calls: document.getElementById('calls'),
  aht: document.getElementById('aht'),
  acw: document.getElementById('acw'),
  targetSla: document.getElementById('target-sla'),
  targetTime: document.getElementById('target-time'),
  resAgents: document.getElementById('res-agents'),
  resSla: document.getElementById('res-sla'),
  resOccupancy: document.getElementById('res-occupancy'),
  resAsa: document.getElementById('res-asa'),
  insightText: document.getElementById('insight-text'),
  legendTarget: document.getElementById('legend-target'),
};

let myChart = null;

// ============ Расчёт ============
function updateCalculator() {
  const calls = parseFloat(els.calls.value) || 0;
  const aht = parseFloat(els.aht.value) || 1;
  const acw = parseFloat(els.acw.value) || 0;
  const targetSla = parseFloat(els.targetSla.value) || 80;
  const targetTime = parseFloat(els.targetTime.value) || 20;

  const totalHandleTime = aht + acw;
  const traffic = (calls * totalHandleTime) / 3600;

  let agents = Math.max(1, Math.ceil(traffic) + 1);
  let currentSla = calculateSLA(agents, traffic, totalHandleTime, targetTime);

  while (currentSla < targetSla && agents < 500) {
    agents++;
    currentSla = calculateSLA(agents, traffic, totalHandleTime, targetTime);
  }

  const finalSla = calculateSLA(agents, traffic, totalHandleTime, targetTime);
  const occupancy = (traffic / agents) * 100;
  const ec = erlangC(agents, traffic);
  const asa = (ec * totalHandleTime) / (agents - traffic);

  // KPI
  els.resAgents.textContent = agents;
  els.resSla.textContent = finalSla.toFixed(1) + '%';
  els.resOccupancy.textContent = occupancy.toFixed(1) + '%';
  els.resAsa.textContent = asa > 60 ? (asa / 60).toFixed(1) + 'м' : asa.toFixed(0) + 'с';

  // Легенда
  els.legendTarget.textContent = `${targetSla}% / ${targetTime} сек`;

  // Инсайт
  let insight = '';
  if (occupancy > 90) {
    insight = `<strong>Высокий риск выгорания.</strong> Загрузка операторов ${occupancy.toFixed(1)}% — выше безопасной нормы (85%). Люди начнут увольняться. Рекомендую добавить <strong>1–2 человека</strong>, даже если это немного превысит SLA.`;
  } else if (occupancy < 70 && agents > 2) {
    insight = `<strong>Слишком много свободного времени.</strong> Загрузка всего ${occupancy.toFixed(1)}%. Операторы скучают — вы платите зарплату впустую. Можно сократить штат на 1 человека или загрузить их допродажами в свободное время.`;
  } else {
    insight = `<strong>Идеальный баланс.</strong> При штате ${agents} человек вы достигаете целевого SLA (${finalSla.toFixed(1)}%) с оптимальной загрузкой (${occupancy.toFixed(1)}%). Это здоровая и эффективная модель.`;
  }
  els.insightText.innerHTML = insight;

  // График
  updateChart(traffic, totalHandleTime, targetTime, agents);

  // ==========================================
  // ОТПРАВКА ДАННЫХ В ТАБРИКУ
  // ==========================================
  // Проверяем, что токен вставлен (чтобы не было ошибок, пока вы его не заменили)
  if (TABRICA_TOKEN !== 'ВСТАВЬТЕ_СЮДА_ВАШ_ТОКЕН_НАЧИНАЮЩИЙСЯ_С_tab_') {
    clearTimeout(window.saveTimeout);
    window.saveTimeout = setTimeout(() => {
      fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${TABRICA_TOKEN}`,
          'Content-Type': 'application/json'
        },
        // Табрика ожидает данные внутри объекта "data"
        body: JSON.stringify({
          data: {
            calls: calls,
            aht: aht,
            acw: acw,
            target_sla: targetSla,
            target_time: targetTime,
            recommended_agents: agents,
            actual_sla: finalSla,
          }
        }),
      })
      .then(r => {
        if (!r.ok) throw new Error(`HTTP error! status: ${r.status}`);
        return r.json();
      })
      .then(d => console.log('✅ Успешно сохранено в Табрике!', d))
      .catch(err => console.warn('❌ Ошибка сохранения в Табрике:', err.message));
    }, 1500); // Ждем 1.5 секунды после последнего ввода
  }
}

// ============ График ============
function updateChart(traffic, handleTime, targetTime, currentAgents) {
  const canvas = document.getElementById('slaChart');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const labels = [];
  const dataSla = [];
  const dataOccupancy = [];

  const start = Math.max(1, currentAgents - 2);
  const end = currentAgents + 4;

  for (let i = start; i <= end; i++) {
    labels.push(i + ' чел.');
    dataSla.push(+calculateSLA(i, traffic, handleTime, targetTime).toFixed(1));
    dataOccupancy.push(Math.min(100, (traffic / i) * 100).toFixed(1));
  }

  if (myChart) myChart.destroy();

  myChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'SLA (%)',
          data: dataSla,
          borderColor: '#3B4CCA',
          backgroundColor: 'rgba(59, 76, 202, 0.08)',
          borderWidth: 3,
          pointBackgroundColor: '#3B4CCA',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4,
          pointHoverRadius: 6,
          tension: 0.4,
          fill: true,
          yAxisID: 'y',
        },
        {
          label: 'Загрузка (%)',
          data: dataOccupancy,
          borderColor: '#00A896',
          borderWidth: 2,
          borderDash: [5, 5],
          pointRadius: 0,
          tension: 0.4,
          yAxisID: 'y',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#1A202C',
          titleFont: { family: 'Manrope', size: 13, weight: '700' },
          bodyFont: { family: 'Inter', size: 13 },
          padding: 12,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: (c) => `${c.dataset.label}: ${c.parsed.y}%`,
          },
        },
      },
      scales: {
        y: {
          min: 0,
          max: 110,
          grid: { color: '#E2E8F0' },
          ticks: {
            font: { family: 'Inter', size: 12 },
            color: '#718096',
            callback: (v) => v + '%',
          },
        },
        x: {
          grid: { display: false },
          ticks: { font: { family: 'Inter', size: 12 }, color: '#718096' },
        },
      },
    },
  });
}

// ============ Init ============
[els.calls, els.aht, els.acw, els.targetSla, els.targetTime].forEach(i => {
  if (i) i.addEventListener('input', updateCalculator);
});

if (els.calls) updateCalculator();
