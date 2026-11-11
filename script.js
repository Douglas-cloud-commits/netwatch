const history = [];
const maxSamples = 30;
let previousNetwork = null;
let previousTime = null;
let requestInFlight = false;

const elements = {
  connection: document.querySelector("#connection-state"),
  hostname: document.querySelector("#hostname"),
  deviceName: document.querySelector("#device-name"),
  lastUpdated: document.querySelector("#last-updated"),
  bytesReceived: document.querySelector("#bytes-received"),
  bytesSent: document.querySelector("#bytes-sent"),
  packetsReceived: document.querySelector("#packets-received"),
  packetsSent: document.querySelector("#packets-sent"),
  receivedRate: document.querySelector("#received-rate"),
  sentRate: document.querySelector("#sent-rate"),
  cpuValue: document.querySelector("#cpu-value"),
  memoryValue: document.querySelector("#memory-value"),
  cpuMeter: document.querySelector("#cpu-meter"),
  memoryMeter: document.querySelector("#memory-meter"),
  chart: document.querySelector("#traffic-chart"),
  chartEmpty: document.querySelector("#chart-empty"),
  currentDate: document.querySelector("#current-date")
};

const formatBytes = (value) => {
  if (value < 1000) return `${value} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let amount = value / 1000;
  let unitIndex = 0;
  while (amount >= 1000 && unitIndex < units.length - 1) {
    amount /= 1000;
    unitIndex += 1;
  }
  return `${amount.toFixed(amount < 10 ? 2 : 1)} ${units[unitIndex]}`;
};

const formatRate = (bytesPerSecond) => `${formatBytes(Math.max(0, bytesPerSecond))}/s`;

function drawChart() {
  const canvas = elements.chart;
  const bounds = canvas.getBoundingClientRect();
  if (!bounds.width || !bounds.height) return;

  const pixelRatio = window.devicePixelRatio || 1;
  canvas.width = Math.round(bounds.width * pixelRatio);
  canvas.height = Math.round(bounds.height * pixelRatio);
  const context = canvas.getContext("2d");
  context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  const width = bounds.width;
  const height = bounds.height;
  const padding = { top: 10, right: 3, bottom: 10, left: 3 };
  const plotWidth = width - padding.left - padding.right;
  const plotHeight = height - padding.top - padding.bottom;
  const maxValue = Math.max(1, ...history.flatMap((sample) => [sample.received, sample.sent]));
  elements.chartEmpty.hidden = history.length > 1;
  context.clearRect(0, 0, width, height);

  const drawSeries = (key, color, fillColor) => {
    if (history.length < 2) return;
    const points = history.map((sample, index) => ({
      x: padding.left + (index / (maxSamples - 1)) * plotWidth,
      y: padding.top + plotHeight - (sample[key] / maxValue) * plotHeight
    }));
    context.beginPath();
    points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.lineTo(points.at(-1).x, height - padding.bottom);
    context.lineTo(points[0].x, height - padding.bottom);
    context.closePath();
    context.fillStyle = fillColor;
    context.fill();
    context.beginPath();
    points.forEach((point, index) => index === 0 ? context.moveTo(point.x, point.y) : context.lineTo(point.x, point.y));
    context.strokeStyle = color;
    context.lineWidth = 2;
    context.lineJoin = "round";
    context.lineCap = "round";
    context.stroke();
  };

  drawSeries("received", "#23845f", "rgba(35, 132, 95, 0.10)");
  drawSeries("sent", "#d26f53", "rgba(210, 111, 83, 0.08)");
}

function updateRates(network, now) {
  if (previousNetwork && previousTime) {
    const elapsed = (now - previousTime) / 1000;
    if (elapsed > 0) {
      const receivedRate = (network.bytes_received - previousNetwork.bytes_received) / elapsed;
      const sentRate = (network.bytes_sent - previousNetwork.bytes_sent) / elapsed;
      elements.receivedRate.textContent = `${formatRate(receivedRate)} now`;
      elements.sentRate.textContent = `${formatRate(sentRate)} now`;
      history.push({ received: Math.max(0, receivedRate), sent: Math.max(0, sentRate) });
      if (history.length > maxSamples) history.shift();
    }
  }
  previousNetwork = network;
  previousTime = now;
  drawChart();
}

async function refreshStats() {
  if (requestInFlight) return;
  requestInFlight = true;
  try {
    const response = await fetch("/api/stats", { cache: "no-store" });
    if (!response.ok) throw new Error(`Request failed (${response.status})`);
    const data = await response.json();
    const now = Date.now();
    const { system, network } = data;

    elements.hostname.textContent = system.hostname;
    elements.deviceName.textContent = system.hostname;
    elements.lastUpdated.textContent = system.time;
    elements.bytesReceived.textContent = formatBytes(network.bytes_received);
    elements.bytesSent.textContent = formatBytes(network.bytes_sent);
    elements.packetsReceived.textContent = Number(network.packets_received).toLocaleString();
    elements.packetsSent.textContent = Number(network.packets_sent).toLocaleString();
    elements.cpuValue.textContent = `${system.cpu.toFixed(1)}%`;
    elements.memoryValue.textContent = `${system.memory.toFixed(1)}%`;
    elements.cpuMeter.style.width = `${Math.min(100, Math.max(0, system.cpu))}%`;
    elements.memoryMeter.style.width = `${Math.min(100, Math.max(0, system.memory))}%`;
    elements.connection.textContent = "Connected";
    elements.connection.style.color = "#23845f";
    updateRates(network, now);
  } catch (error) {
    elements.connection.textContent = "Connection lost";
    elements.connection.style.color = "#b44b39";
    elements.receivedRate.textContent = "Unable to reach local API";
    elements.sentRate.textContent = "Retrying shortly";
    console.error("Unable to refresh network stats:", error);
  } finally {
    requestInFlight = false;
  }
}

const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: "short", month: "short", day: "numeric" });
elements.currentDate.textContent = dateFormatter.format(new Date()).toUpperCase();
refreshStats();
window.setInterval(refreshStats, 2000);
window.addEventListener("resize", drawChart);
