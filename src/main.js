const M = 303835;  // 總票數
const K = 40000;   // 獎品數
const c = 1650;    // 每張 CD 價格（日圓）
const d = 13935;   // 固定成本（日圓）

const cd_max = 100;  // 最大購買張數

// 計算所有 n 值
const cd_range = Array.from({ length: cd_max }, (_, i) => i + 1); 

const gamma_list = [2, 2.2, 2.4, 2.6, 2.8, 3];

// 計算所有 p 值
const p_vals = cd_range.map(n => p_exact(n, M, K));

// 計算 U(n) 值
const U_vals = cd_range.map(n => p_exact(n, M, K) / (c * n + d));

// 找到最優購買數量
const n_opt = cd_range[U_vals.indexOf(Math.max(...U_vals))]; 

// 近似 Gamma 函數的對數
function logGamma(n) {
  if (n === 1 || n === 0) return 0;
  return (n - 0.5) * Math.log(n) - n + 0.5 * Math.log(2 * Math.PI);
}

// 計算 p_exact(n, M, K)
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

// 估計參與者數與 E[n]

const array_gamma1 = [];
gamma_list.forEach(gamma => {
  // 計算權重 weights = n^(-gamma)
  const weights = cd_range.map(n => Math.pow(n, -gamma));
  
  // 計算 E[n] = Σ(n * weights) / Σ(weights)
  const sumWeightedN = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0);
  const sumWeights = weights.reduce((sum, w) => sum + w, 0);
  const E_n = sumWeightedN / sumWeights;

  // 計算 N_est = M / E[n]
  const N_est = M / E_n;

  // 將數據添加到 array_gamma1
  array_gamma1.push([gamma.toString(), E_n.toFixed(2).toString(), Math.round(N_est).toString()]);
});

// 表格結構生成
let tableHTML1 = "<table><thead><tr><th style='width: 20%;'>γ值</th><th style='width: 40%;'>E[n] (近似)</th><th style='width: 40%;'>估計參與者數 N</th></tr></thead><tbody>";
array_gamma1.forEach(row => {
  tableHTML1 += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`;
});
tableHTML1 += "</tbody></table>";

// 顯示表格
document.getElementById("tableContainer1").innerHTML = tableHTML1;

// 估計參與者數與最佳投資決策
const array_gamma2 = [];
gamma_list.forEach(gamma => {
  const weights = cd_range.map(n => Math.pow(n, -gamma));
  const E_n = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0) / weights.reduce((sum, w) => sum + w, 0);
  const N_est = M / E_n;
  array_gamma2.push([gamma.toString(), Math.round(N_est).toString(), n_opt.toString()]);
});

// 表格結構生成
let tableHTML2 = "<table><thead><tr><th style='width: 20%;'>γ值</th><th style='width: 40%;'>估計參與者數 N</th><th style='width: 40%;'>最佳 n_i*</th></tr></thead><tbody>";
array_gamma2.forEach(row => {
  tableHTML2 += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`;
});
tableHTML2 += "</tbody></table>";

// 顯示表格
document.getElementById("tableContainer2").innerHTML = tableHTML2;



// 計算納許均衡下的最佳投資決策
const nash_results = [];
gamma_list.forEach(gamma => {
  // 估計參與者數 N
  const weights = cd_range.map(n => Math.pow(n, -gamma));
  const sumWeightedN = cd_range.reduce((sum, n, i) => sum + n * weights[i], 0);
  const sumWeights = weights.reduce((sum, w) => sum + w, 0);
  const E_n = sumWeightedN / sumWeights;
  const N_est = M / E_n;

  // 初始猜測採用前面效用最大時的 n_opt
  let n_sym = best_response(cd_range[0], N_est, K);
  for (let i = 0; i < 100; i++) {
    const new_n = best_response(n_sym, N_est, K);
    if (new_n === n_sym) {
        break;
    }
    n_sym = new_n;
  }
  nash_results.push({ gamma, N_est, n_sym });
});

// 納許均衡下的最佳投資決策
const array_nash = [];
nash_results.forEach(({ gamma, N_est, n_sym }) => {
  array_nash.push([gamma.toString(), Math.round(N_est).toString(), n_sym.toString()]);
});

// 表格結構生成
let tableHTML3 = "<table><thead><tr><th style='width: 20%;'>γ值</th><th style='width: 40%;'>估計參與者數 N</th><th style='width: 40%;'>納許均衡 n_i*</th></tr></thead><tbody>";
array_nash.forEach(row => {
  tableHTML3 += `<tr><td>${row[0]}</td><td>${row[1]}</td><td>${row[2]}</td></tr>`;
});
tableHTML3 += "</tbody></table>";

// 顯示表格
document.getElementById("tableContainer3").innerHTML = tableHTML3;

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
