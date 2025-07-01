import React, { useEffect, useRef, useState } from "react";
import ApexCharts from "react-apexcharts";

const RealTimeCandleChart = () => {
  const [series, setSeries] = useState([{ data: [] }]);
  const [volumeSeries, setVolumeSeries] = useState([{ name: "Volume", data: [] }]);
  const [vwapSeries, setVwapSeries] = useState([{ name: "VWAP", data: [] }]);
  const vwapData = useRef([]);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = new WebSocket("wss://trading-footprint-chart.onrender.com/ws/feed")

    socketRef.current.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const ltp = parseFloat(parsed.LTP);
        const ltq = parseInt(parsed.LTQ);
        const time = parsed.LTT;
        const [hour, minute] = time.split(":");
        
        const now = new Date();
        now.setHours(parseInt(hour), parseInt(minute), 0, 0);
        const timestamp = now.getTime();

        setSeries((prev) => {
          let candles = prev[0].data ? [...prev[0].data] : [];
          let last = candles[candles.length - 1];

          if (!last || last.x !== timestamp) {
            candles.push({ x: timestamp, y: [ltp, ltp, ltp, ltp] });
          } else {
            let [open, high, low, close] = last.y;
            high = Math.max(high, ltp);
            low = Math.min(low, ltp);
            close = ltp;
            candles[candles.length - 1] = { x: timestamp, y: [open, high, low, close] };
          }
          return [{ data: candles.slice(-50) }];
        });

        setVolumeSeries((prev) => {
          let volumes = prev[0].data ? [...prev[0].data] : [];
          let last = volumes[volumes.length - 1];

          if (!last || last.x !== timestamp) {
            volumes.push({ x: timestamp, y: ltq });
          } else {
            volumes[volumes.length - 1].y += ltq;
          }
          return [{ name: "Volume", data: volumes.slice(-50) }];
        });

        vwapData.current.push({ price: ltp, qty: ltq });
        const totalVol = vwapData.current.reduce((acc, cur) => acc + cur.qty, 0);
        const totalVal = vwapData.current.reduce((acc, cur) => acc + cur.price * cur.qty, 0);
        const vwap = totalVol === 0 ? ltp : totalVal / totalVol;
        setVwapSeries([{ name: "VWAP", data: [...series[0].data].map(c => ({ x: c.x, y: vwap })) }]);
      } catch (err) {
        console.error("WebSocket data error:", err);
      }
    };

    return () => socketRef.current.close();
  }, [series]);

  const options = {
    chart: {
      id: "realtime-candlestick",
      type: "candlestick",
      height: 350,
      background: "#181c24",
      toolbar: { show: true },
      animations: { enabled: true },
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#fff" } },
    },
    yaxis: {
      tooltip: { enabled: true },
      labels: { style: { colors: "#fff" } },
    },
    grid: { borderColor: "#232a36" },
    theme: { mode: "dark" },
    stroke: { width: [1, 2] },
  };

  const volumeOptions = {
    chart: {
      id: "volume-bar",
      type: "bar",
      height: 150,
      background: "#181c24",
      toolbar: { show: false },
    },
    xaxis: {
      type: "datetime",
      labels: { style: { colors: "#fff" } },
    },
    yaxis: {
      labels: { style: { colors: "#fff" } },
    },
    theme: { mode: "dark" },
    grid: { borderColor: "#232a36" },
  };

  return (
    <div>
      <h3 style={{ color: "#fff" }}>Real-Time Candlestick Chart with Volume & VWAP</h3>
      <ApexCharts options={options} series={series} type="candlestick" height={350} />
      <ApexCharts options={volumeOptions} series={volumeSeries} type="bar" height={150} />
    </div>
  );
};

export default RealTimeCandleChart;