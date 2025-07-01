import React from "react";
import RealTimeCandleChart from "./RealTimeCandleChart";
import FootprintChart from "./FootprintChartWeb";

const CombinedChart = () => {
  return (
    <div>
      <RealTimeCandleChart />
      <hr style={{ border: "none", borderTop: "2px solid #232a36", margin: "32px 0" }} />
      <FootprintChart />
    </div>
  );
};

export default CombinedChart;