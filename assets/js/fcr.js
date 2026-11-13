document.addEventListener('DOMContentLoaded', () => {
  const inputs = {
    total: document.getElementById('total-contacts'),
    resolved: document.getElementById('resolved-contacts'),
    cost: document.getElementById('cost-per-contact')
  };

  const outputs = {
    fcrValue: document.getElementById('fcr-value'),
    insight: document.getElementById('fcr-insight'),
    moneyLost: document.getElementById('money-lost')
  };

  let fcrChartInstance = null;

  function updateFCR() {
    const total = parseFloat(inputs.total.value) || 0;
    const resolved = parseFloat(inputs.resolved.value) || 0;
    const cost = parseFloat(inputs.cost.value) || 0;

    // Не даем resolved быть больше total
    if (resolved > total) {
      inputs.resolved.value = total;
      return updateFCR(); // перезапускаем
    }

    // Считаем FCR
    const fcr = total > 0 ? (resolved / total) * 100 : 0;
    outputs.fcrValue.textContent = fcr.toFixed(1) + '%';

    // Считаем потери
    // Логика: те, кого не решили с первого раза, звонят еще раз (минимум 1 повторный звонок)
    const unresolved = total - resolved;
    const lostMoney = unresolved * cost; // Траты на повторные звонки
    outputs.moneyLost.textContent = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'RUB', maximumFractionDigits: 0 }).format(lostMoney);

    // Логика инсайтов
    let insightText = '';
    let color = '#10B981'; // Зеленый по умолчанию

    if (fcr < 65) {
      color = '#EF4444'; // Красный
      insightText = `<strong>Критически низкий FCR.</strong> Более трети клиентов перезванивают. Вы платите зарплату операторам за то, что они решают одну и ту же проблему по 2-3 раза. Срочно внедряйте базу знаний.`;
    } else if (fcr >= 65 && fcr < 75) {
      color = '#F59E0B'; // Желтый
      insightText = `<strong>Есть куда расти.</strong> Средний FCR по рынку — 70–79%. Вы теряете ощутимую сумму на повторных звонках. Повышение FCR всего на 1% сэкономит вам 1% бюджета.`;
    } else {
      color = '#10B981'; // Зеленый
      insightText = `<strong>Отличный показатель.</strong> Вы в числе лидеров (выше 75%). Клиенты довольны, а компания экономит деньги. Продолжайте удерживать качество.`;
    }

    outputs.insight.innerHTML = insightText;

    // Обновляем график
    renderChart(fcr, color);
  }

  function renderChart(fcr, color) {
    const ctx = document.getElementById('fcrChart').getContext('2d');
    
    if (fcrChartInstance) {
      fcrChartInstance.destroy();
    }

    fcrChartInstance = new Chart(ctx, {
      type: 'doughnut',
      data: {
        datasets: [{
          data: [fcr, 100 - fcr],
          backgroundColor: [color, '#F3F4F6'],
          borderWidth: 0,
          cutout: '85%' // Делает из пирога тонкое кольцо
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          tooltip: { enabled: false },
          legend: { display: false }
        },
        animation: {
          animateScale: true,
          animateRotate: true
        }
      }
    });
  }

  // Слушатели событий
  Object.values(inputs).forEach(input => {
    if (input) input.addEventListener('input', updateFCR);
  });

  // Первый запуск
  updateFCR();
});assets/js/fcr.js
