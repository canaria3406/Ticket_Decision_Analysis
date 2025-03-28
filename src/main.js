document.querySelectorAll("input").forEach(input => {
  input.addEventListener("input", updateData);
});

let probabilityChartInstance = null;
let utilityChartInstance = null;

let bc01 = 0;
let nc01 = 0;
let nc02 = 0;

function updateData() {
  // 獲取輸入值
  let M = parseInt(document.getElementById("M").value);
  let K = parseInt(document.getElementById("K").value);
  let c = parseInt(document.getElementById("c").value);
  let d = parseInt(document.getElementById("d").value);
  let cd_max = parseInt(document.getElementById("cd_max").value);

  const gamma_list = [2, 2.2, 2.4, 2.6, 2.8, 3];

  // 計算數據
  let cd_range = Array.from({ length: cd_max }, (_, i) => i + 1);
  let p_vals = cd_range.map(n => p_exact(n, M, K));
  let U_vals = cd_range.map(n => p_exact(n, M, K) / (c * n + d));
  let n_opt = cd_range[U_vals.indexOf(Math.max(...U_vals))];

  // 近似 Gamma 函數的對數
  function logGamma(n) {
    if (n === 1 || n === 0) return 0;
    return (n - 0.5) * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI);
  }

  // 計算 p_exact
  function p_exact(n, M, K) {
    const log_binom_Mn = logGamma(M - n + 1) - logGamma(K + 1) - logGamma(M - n - K + 1);
    const log_binom_M = logGamma(M + 1) - logGamma(K + 1) - logGamma(M - K + 1);
    const ratio = Math.exp(log_binom_Mn - log_binom_M);
    return 1 - ratio;
  }

  // 計算 p_dev
  function p_dev(n, n_sym, N_est, K) {
    const m_other = (N_est - 1) * n_sym;
    const total = m_other + n;

    // 確保 total 大於 K
    if (total < K) return 0;
    
    const log_binom_mother = logGamma(m_other + 1) - logGamma(K + 1) - logGamma(m_other - K + 1);
    const log_binom_total = logGamma(total + 1) - logGamma(K + 1) - logGamma(total - K + 1);
    const ratio = Math.exp(log_binom_mother - log_binom_total);
    return 1 - ratio;
  }

  // 計算 U_dev 值 
  function best_response(n_sym, N_est, K) {
    const ns = Array.from({ length: cd_max }, (_, i) => i + 1);
    const U_dev_vals = ns.map(n => p_dev(n, n_sym, N_est, K) / (c * n + d));
    return ns[U_dev_vals.indexOf(Math.max(...U_dev_vals))];
  }

  // 生成表格並插入 HTML
  function generateTable(headers, rows, containerId) {
    const columnWidths = ["20%", "40%", "40%"];
    let tableHTML = "<table><thead><tr>";
    headers.forEach((header, index) => {
      tableHTML += `<th style='width: ${columnWidths[index]};'>${header}</th>`;
    });
    tableHTML += "</tr></thead><tbody>";
    rows.forEach(row => {
      tableHTML += "<tr>" + row.map(cell => `<td>${cell}</td>`).join("") + "</tr>";
    });
    tableHTML += "</tbody></table>";
    document.getElementById(containerId).innerHTML = tableHTML;
  }

  function createChart(canvasId, chartLabel, xLabel, yLabel, dataValues, yMin = null, yMax = null, isExponential = false) {
    let ctx = document.getElementById(canvasId).getContext("2d");
    let chartInstance = new Chart(ctx, {
      type: "line",
      data: {
        labels: cd_range,
        datasets: [{
          label: chartLabel,
          data: dataValues,
          borderColor: "blue",
          backgroundColor: "rgba(0, 0, 255, 0.1)",
          pointRadius: 3,
          borderWidth: 2,
          fill: true
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { title: { display: true, text: xLabel } },
          y: { 
            title: { display: true, text: yLabel }, 
            min: yMin, 
            max: yMax,
            ticks: isExponential 
              ? { callback: function(value) { return value.toExponential(1); } } 
              : {}
          }
        },
        plugins: {
          legend: { display: false },
          title: { display: true, text: chartLabel },
          tooltip: {
            enabled: true,
            callbacks: isExponential 
              ? { label: function(context) { return `${chartLabel}: ${context.raw.toExponential(1)}`; } } 
              : {}
          }
        }
      }
    });
    return chartInstance;
  }

  // 計算 E[n] 與 參與者數 
  const array_gamma1 = gamma_list.map(gamma => {
    const weights = cd_range.map(n => Math.pow(n, -gamma));
    const sumWeightedN = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0);
    const sumWeights = weights.reduce((sum, w) => sum + w, 0);
    const E_n = sumWeightedN / sumWeights;
    const N_est = M / E_n;
    return [gamma.toString(), E_n.toFixed(2).toString(), Math.round(N_est).toString()];
  });

  generateTable(["γ值", "E[n] (近似)", "估計參與者數 N"], array_gamma1, "tableContainer1");

  // 計算 參與者數 與 最佳策略
  const array_gamma2 = gamma_list.map(gamma => {
    const weights = cd_range.map(n => Math.pow(n, -gamma));
    const E_n = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0) / weights.reduce((sum, w) => sum + w, 0);
    const N_est = M / E_n;
    return [gamma.toString(), Math.round(N_est).toString(), n_opt.toString()];
  });

  bc01 = array_gamma2[0][2];

  generateTable(["γ值", "估計參與者數 N", "最佳 n_i*"], array_gamma2, "tableContainer2");

  // 計算 參與者數 與 納許均衡下的最佳策略
  const array_nash = gamma_list.map(gamma => {
    const weights = cd_range.map(n => Math.pow(n, -gamma));
    const sumWeightedN = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0);
    const sumWeights = weights.reduce((sum, w) => sum + w, 0);
    const E_n = sumWeightedN / sumWeights;
    const N_est = M / E_n;
    let n_sym = best_response(cd_range[0], N_est, K);
    for (let i = 0; i < cd_max; i++) {
      const new_n = best_response(n_sym, N_est, K);
      if (new_n === n_sym) break;
      n_sym = new_n;
    }
    return [gamma.toString(), Math.round(N_est).toString(), n_sym.toString()];
  });

  nc01 = array_nash[0][2];
  nc02 = array_nash[gamma_list.length - 1][2];

  generateTable(["γ值", "估計參與者數 N", "納許均衡 n_i*"], array_nash, "tableContainer3");

  // 更新 Winning Probability vs Number of Tickets bought 圖表
  if (probabilityChartInstance) {
    probabilityChartInstance.data.labels = cd_range;
    probabilityChartInstance.data.datasets[0].data = p_vals;
    probabilityChartInstance.update();
  } else {
    probabilityChartInstance = createChart(
      "probabilityChart",
      "Winning Probability vs Number of Tickets bought",
      "n_i (Number of Tickets bought)",
      "p_i (Winning Probability)",
      p_vals,
      0,
      1,
      false
    );
  }

  // 更新 U(n) 圖表
  if (utilityChartInstance) {
    utilityChartInstance.data.labels = cd_range;
    utilityChartInstance.data.datasets[0].data = U_vals;
    utilityChartInstance.update();
  } else {
    utilityChartInstance = createChart(
      "utilityChart",
      "U(n_i) = p_i / (cn_i + d) vs n_i",
      "n_i (Number of Tickets bought)",
      "U(n_i) (Ratio of Utility and Cost)",
      U_vals,
      null,
      null,
      true
    );
  }

  function logToSpan(bc01, nc01, nc02) {
    let logContainer = document.getElementById("logOutput");
    if (!logContainer) {
      return;
    }
    logContainer.innerText = `考慮投資成本與中獎機率，個體最佳的投資策略為 ${bc01} 張 CD；
    在個體最佳投資策略下的疊盤成本為 ${bc01 * c} 日圓；
    然而，市場競爭導致粉絲提高購買數量，在納許均衡下的投資策略則為 ${nc01} ~ ${nc02} 張 CD；
    在納許均衡下投資策略的疊盤成本為 ${nc01 * c} ~ ${nc02 * c} 日圓。`; 
  }

  logToSpan(bc01, nc01, nc02);

}

updateData();
