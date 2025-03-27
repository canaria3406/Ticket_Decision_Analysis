const M = 303835;  // CD 累計総合売上
const K = 40000;   // Live 会場座席数
const c = 1650;    // 每張 CD 價格（日圓）
const d = 13935;   // Live 票價成本（日圓）
const cd_max = 100;  // 最大 CD 購買張數

const gamma_list = [2, 2.2, 2.4, 2.6, 2.8, 3];

const cd_range = Array.from({ length: cd_max }, (_, i) => i + 1); 

const p_vals = cd_range.map(n => p_exact(n, M, K));

const U_vals = cd_range.map(n => p_exact(n, M, K) / (c * n + d));

const n_opt = cd_range[U_vals.indexOf(Math.max(...U_vals))]; 

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
  const ns = Array.from({ length: 100 }, (_, i) => i + 1);
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

generateTable(["γ值", "估計參與者數 N", "最佳 n_i*"], array_gamma2, "tableContainer2");

// 計算 參與者數 與 納許均衡下的最佳策略
const array_nash = gamma_list.map(gamma => {
  const weights = cd_range.map(n => Math.pow(n, -gamma));
  const sumWeightedN = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0);
  const sumWeights = weights.reduce((sum, w) => sum + w, 0);
  const E_n = sumWeightedN / sumWeights;
  const N_est = M / E_n;
  let n_sym = best_response(cd_range[0], N_est, K);
  for (let i = 0; i < 100; i++) {
    const new_n = best_response(n_sym, N_est, K);
    if (new_n === n_sym) break;
    n_sym = new_n;
  }
  return [gamma.toString(), Math.round(N_est).toString(), n_sym.toString()];
});

generateTable(["γ值", "估計參與者數 N", "納許均衡 n_i*"], array_nash, "tableContainer3");

// 繪製 Winning Probability vs Number of Tickets bought 圖表
const probabilityChart = document.getElementById("probabilityChart").getContext("2d");
new Chart(probabilityChart, {
  type: "line",
  data: {
    labels: cd_range,
    datasets: [{
      label: "Winning Probability",
      data: p_vals,
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
      x: { title: { display: true, text: "n_i (Number of Tickets bought)" } },
      y: { title: { display: true, text: "p_i (Winning Probability)" }, min: 0, max: 1 }
    },
    plugins: {
      legend: { display: false },
      title: { display: true, text: "Winning Probability vs Number of Tickets bought" }
    }
  }
});

// 繪製 U(n) 圖表
const utilityChart = document.getElementById("utilityChart").getContext("2d");
new Chart(utilityChart, {
  type: "line",
  data: {
    labels: cd_range,
    datasets: [{
      label: "U(n)",
      data: U_vals,
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
      x: { title: { display: true, text: "n_i (Number of Tickets bought)" } },
      y: { title: { display: true, text: "U(n_i) (Ratio of Utility and Cost)" },
        ticks: {
          callback: function(value) {
            return value.toExponential(1); // 轉換為科學記號，保留 1 位小數
          }
        }
      }
    },
    plugins: {
      legend: { display: false },
      title: { display: true, text: "U(n_i) = p_i / (cn_i + d) vs n_i" },
      tooltip: { // 啟用 Tooltip
        enabled: true,
        callbacks: {
          label: function(context) {
            return `U(n): ${context.raw.toExponential(1)}`; // 顯示完整數值，保留 6 位小數
          }
        }
      }
    }
  }
});
