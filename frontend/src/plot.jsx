import * as factoryModule from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

// react-plotly.js memakai plotly.js penuh secara default; kita pakai build ringkas lewat factory.
const factory = factoryModule.default?.default ?? factoryModule.default ?? factoryModule;
const Plot = factory(Plotly);

export const COLORS = { navy: "#15284b", blue: "#2f5fd0", coral: "#e4572e", teal: "#1f9d8a", grey: "#8b95ab", line: "#e3e7f0" };

// Layout dasar bersama: latar transparan, font mengikuti halaman.
export const baseLayout = (extra = {}) => ({
  paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Public Sans, system-ui, sans-serif", size: 12, color: "#1b2437" },
  margin: { l: 44, r: 16, t: 8, b: 36 }, autosize: true,
  xaxis: { gridcolor: COLORS.line, zeroline: false }, yaxis: { gridcolor: COLORS.line, zeroline: false },
  ...extra,
});

export function Chart({ data, layout, height = 300, onClick }) {
  return (
    <Plot data={data} layout={baseLayout({ height, ...layout })} onClick={onClick}
      config={{ displayModeBar: false, responsive: true }} style={{ width: "100%" }} useResizeHandler />
  );
}
