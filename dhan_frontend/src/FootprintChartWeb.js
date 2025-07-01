// import React, { useEffect, useState } from "react";

// const FootprintChart = () => {
//   const [data, setData] = useState([]);

//   useEffect(() => {
//     const socket = new WebSocket("ws://localhost:8000/ws/feed");
 
//     socket.onmessage = (event) => {
//       try {
//         const parsed = JSON.parse(event.data);
//         setData((prev) => [parsed, ...prev.slice(0, 19)]);
//         console.log("📥 Incoming data:", parsed);

//       } catch (err) {
//         console.error("❌ Invalid JSON:", event.data);

//       }
//     };

//     return () => socket.close();
//   }, []);

//   return (
//     <div className="p-4">
//       <h1 className="text-xl font-bold mb-4">📊 Live Footprint Chart</h1>
//       <div className="overflow-x-auto">
//         <table className="min-w-full text-sm text-left border border-gray-200">
//           <thead className="bg-gray-100">
//             <tr>
//               <th className="px-4 py-2">Time</th>
//               <th className="px-4 py-2">LTP</th>
//               <th className="px-4 py-2">LTQ</th>
//               <th className="px-4 py-2">Volume</th>
//               <th className="px-4 py-2">Buy Qty</th>
//               <th className="px-4 py-2">Sell Qty</th>
//               <th className="px-4 py-2">Bid Price</th>
//               <th className="px-4 py-2">Ask Price</th>
//             </tr>
//           </thead>
//           <tbody>
//             {data.map((entry, index) => (
//               <tr key={index} className="border-t">
//                 <td className="px-4 py-2">{entry.LTT}</td>
//                 <td className="px-4 py-2">₹{entry.LTP}</td>
//                 <td className="px-4 py-2">{entry.LTQ}</td>
//                 <td className="px-4 py-2">{entry.volume}</td>
//                 <td className="px-4 py-2">{entry.total_buy_quantity}</td>
//                 <td className="px-4 py-2">{entry.total_sell_quantity}</td>
//                 <td className="px-4 py-2">{entry.depth?.[0]?.bid_price}</td>
//                 <td className="px-4 py-2">{entry.depth?.[0]?.ask_price}</td>
//               </tr>
//             ))}
//           </tbody>
//         </table>
//       </div>
//     </div>
//   );
// };

// export default FootprintChart;

// FootprintChart.js
// FootprintChart.js
import React, { useEffect, useState, useRef } from "react";
import "./FootprintChart.css";

const FootprintChart = () => {
  const [data, setData] = useState([]);
  const [cumDelta, setCumDelta] = useState(0);
  const scrollRef = useRef(null);

  const mainMetrics = [
    { label: "Time", accessor: (d) => d.LTT },
    { label: "LTP", accessor: (d) => `₹${d.LTP}` },
    { label: "LTQ", accessor: (d) => d.LTQ },
    { label: "Buy Vol", accessor: (d) => d.buyVol },
    { label: "Sell Vol", accessor: (d) => d.sellVol },
    { label: "Buy Qty", accessor: (d) => d.total_buy_quantity },
    { label: "Sell Qty", accessor: (d) => d.total_sell_quantity },
  ];

  const bottomMetrics = [
    {
      label: "Volume",
      accessor: (d) => (
        <span className={d.volume > 500 ? "vol-high" : "vol-low"}>{
          d.volume
        }</span>
      ),
    },
    {
      label: "Delta",
      accessor: (d) => (
        <span className={d.delta >= 0 ? "delta-pos" : "delta-neg"}>{
          d.delta
        }</span>
      ),
    },
    {
      label: "Min",
      accessor: (d) => (
        <span className={d.min >= 0 ? "min-pos" : "min-neg"}>{d.min}</span>
      ),
    },
    {
      label: "Max",
      accessor: (d) => (
        <span className={d.max >= 0 ? "max-pos" : "max-neg"}>{d.max}</span>
      ),
    },
    {
      label: "Cum",
      accessor: (d) => (
        <span className={d.cum >= 0 ? "cum-pos" : "cum-neg"}>{d.cum}</span>
      ),
    },
    {
      label: "Imbalance",
      accessor: (d) => {
        const imbalance = d.total_sell_quantity - d.total_buy_quantity;
        return (
          <span className={imbalance >= 0 ? "imbalance-neg" : "imbalance-pos"}>
            {imbalance}
          </span>
        );
      },
    },
  ];

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws/feed");
    let cumDeltaRunning = 0;
    const minuteDataRef = {};

    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        const currentLTP = parseFloat(parsed.LTP);
        const currentLTQ = parseInt(parsed.LTQ);

        const bestBid = parseFloat(parsed.depth?.[0]?.bid_price || 0);
        const bestAsk = parseFloat(parsed.depth?.[0]?.ask_price || 0);

        let buyVol = 0;
        let sellVol = 0;

        if (currentLTP >= bestAsk) {
          buyVol = currentLTQ;
        } else if (currentLTP <= bestBid) {
          sellVol = currentLTQ;
        } else {
          buyVol = currentLTQ / 2;
          sellVol = currentLTQ / 2;
        }

        const delta = buyVol - sellVol;
        const now = new Date();
        const minuteKey = now.toISOString().slice(0, 16);

        if (!minuteDataRef[minuteKey]) {
          minuteDataRef[minuteKey] = {
            timestamp: now.toISOString(),
            volume: 0,
            buyVol: 0,
            sellVol: 0,
            delta: 0,
            min: delta,
            max: delta,
            cum: cumDeltaRunning,
            LTP: currentLTP,
            LTQ: currentLTQ,
            total_buy_quantity: parsed.total_buy_quantity,
            total_sell_quantity: parsed.total_sell_quantity,
            LTT: parsed.LTT,
          };
        }

        const minuteCandle = minuteDataRef[minuteKey];

        minuteCandle.volume += buyVol + sellVol;
        minuteCandle.buyVol += buyVol;
        minuteCandle.sellVol += sellVol;
        minuteCandle.delta += delta;
        minuteCandle.min = Math.min(minuteCandle.min, minuteCandle.delta);
        minuteCandle.max = Math.max(minuteCandle.max, minuteCandle.delta);
        minuteCandle.LTP = currentLTP;
        minuteCandle.LTQ = currentLTQ;
        minuteCandle.total_buy_quantity = parsed.total_buy_quantity;
        minuteCandle.total_sell_quantity = parsed.total_sell_quantity;
        minuteCandle.LTT = parsed.LTT;

        cumDeltaRunning += delta;
        minuteCandle.cum = cumDeltaRunning;

        const candles = Object.values(minuteDataRef)
          .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
          .slice(-20);

        setData(candles);
        setCumDelta(cumDeltaRunning);
      } catch (err) {
        console.error("JSON parse error:", err);
      }
    };

    return () => socket.close();
  }, []);

  return (
  <>
    <div className="chart-container">
      <h2>1-Minute Footprint Chart with Delta, Volume & Imbalance</h2>
      <div className="scroll-sync-wrapper" ref={scrollRef}>
        <table className="chart-table">
          <tbody>
            {mainMetrics.map((row, idx) => (
              <tr key={idx}>
                <td className="sticky metric-col">{row.label}</td>
                {data.map((entry, i) => (
                  <td key={i} className="cell">
                    {typeof row.accessor === "function"
                      ? row.accessor(entry)
                      : entry[row.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>

        <table className="chart-table bottom-table">
          <tbody>
            {bottomMetrics.map((row, idx) => (
              <tr key={idx}>
                <td className="sticky metric-col">{row.label}</td>
                {data.map((entry, i) => (
                  <td key={i} className="cell">
                    {typeof row.accessor === "function"
                      ? row.accessor(entry)
                      : entry[row.accessor]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>

    <div className="legend-container">
      <h3>📘 Chart Color Legend</h3>
      <ul className="legend-list">
        <li><span className="legend-box vol-high" /> High Volume (Strong Activity)</li>
        <li><span className="legend-box vol-low" /> Low Volume</li>
        <li><span className="legend-box delta-pos" /> Positive Delta (Buyers in control)</li>
        <li><span className="legend-box delta-neg" /> Negative Delta (Sellers in control)</li>
        <li><span className="legend-box min-pos" /> Min Delta (Bullish Pressure)</li>
        <li><span className="legend-box min-neg" /> Min Delta (Bearish Pressure)</li>
        <li><span className="legend-box max-pos" /> Max Delta (Bullish Peak)</li>
        <li><span className="legend-box max-neg" /> Max Delta (Bearish Peak)</li>
        <li><span className="legend-box cum-pos" /> Cumulative Delta Positive (Uptrend)</li>
        <li><span className="legend-box cum-neg" /> Cumulative Delta Negative (Downtrend)</li>
        <li><span className="legend-box imbalance-pos" /> Positive Imbalance (More Buyers Queued)</li>
        <li><span className="legend-box imbalance-neg" /> Negative Imbalance (More Sellers Queued)</li>
      </ul>
    </div>
  </>
);
};

export default FootprintChart;