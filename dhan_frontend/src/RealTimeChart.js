import React, { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from "recharts";

const RealTimeChart = () => {
  const [data, setData] = useState([]);

  useEffect(() => {
    const socket = new WebSocket("ws://localhost:8000/ws/feed");
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        setData((prev) => [
          ...prev.slice(-49), // keep only last 50 points
          { time: parsed.LTT, ltp: parsed.LTP }
        ]);
      } catch (err) {
        console.error("WebSocket data error:", err);
      }
    };
    return () => socket.close();
  }, []);

  return (
    <div style={{ width: "100%", height: 350, background: "#181c24", borderRadius: 8, padding: 16 }}>
      <h3 style={{ color: "#fff" }}>Real-Time LTP Chart</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart data={data}>
          <CartesianGrid stroke="#232a36" />
          <XAxis dataKey="time" stroke="#fff" />
          <YAxis stroke="#fff" domain={['auto', 'auto']} />
          <Tooltip />
          <Line type="monotone" dataKey="ltp" stroke="#00bfff" dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default RealTimeChart;