import * as factoryModule from "react-plotly.js/factory";
import Plotly from "plotly.js-dist-min";

// react-plotly.js memakai plotly.js penuh secara default; kita pakai build ringkas lewat factory.
const factory = factoryModule.default?.default ?? factoryModule.default ?? factoryModule;
const Plot = factory(Plotly);

export const COLORS = { navy: "#2c2e49", blue: "#7567ed", coral: "#ff8e88", teal: "#9b8ff0", grey: "#9a9ca8", line: "#e9e8f0" };

// Layout dasar bersama: latar transparan, font mengikuti halaman.
export const baseLayout = (extra = {}) => ({
  paper_bgcolor: "rgba(0,0,0,0)", plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: "Public Sans, system-ui, sans-serif", size: 12, color: "#171a21" },
  margin: { l: 44, r: 16, t: 8, b: 36 }, autosize: true,
  hoverlabel: { bgcolor: COLORS.navy, bordercolor: COLORS.navy, font: { color: "#fff", family: "Public Sans, system-ui, sans-serif" } },
  xaxis: { gridcolor: COLORS.line, zeroline: false, automargin: true }, yaxis: { gridcolor: COLORS.line, zeroline: false, automargin: true },
  ...extra,
});

export function Chart({ data, layout, height = 300, onClick }) {
  return (
    <Plot data={data} layout={baseLayout({ height, ...layout })} onClick={onClick}
      config={{ displayModeBar: false, responsive: true, scrollZoom: false }} style={{ width: "100%" }} useResizeHandler />
  );
}
