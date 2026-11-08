import React, { useId } from "react";
import { useTheme } from "../theme/ThemeContext";

// Yengil SVG ustunli grafik — hech qanday kutubxona talab qilmaydi.
// data: [{ label, value }]
export const MiniChart = ({ data = [], height = 160, format = (v) => v, accent }) => {
  const { theme } = useTheme();
  const gid = useId().replace(/:/g, "");
  const max = Math.max(1, ...data.map((d) => Number(d.value) || 0));
  const barW = 100 / Math.max(1, data.length);

  return (
    <div style={{ width: "100%" }}>
      <div style={{ position: "relative", height, width: "100%" }}>
        <svg
          viewBox={`0 0 100 ${height}`}
          preserveAspectRatio="none"
          width="100%"
          height={height}
          role="img"
          aria-label="Grafik"
          style={{ display: "block", overflow: "visible" }}
        >
          <defs>
            <linearGradient id={`g-${gid}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={accent || theme.primary} />
              <stop offset="100%" stopColor={theme.mode === "dark" ? theme.secondary : theme.success} />
            </linearGradient>
          </defs>
          {/* baseline */}
          <line x1="0" y1={height - 0.5} x2="100" y2={height - 0.5} stroke={theme.border} strokeWidth="1" vectorEffect="non-scaling-stroke" />
          {data.map((d, i) => {
            const v = Number(d.value) || 0;
            const h = Math.max(2, (v / max) * (height - 8));
            const x = i * barW + barW * 0.22;
            const w = barW * 0.56;
            return (
              <rect
                key={i}
                x={x}
                y={height - h}
                width={w}
                height={h}
                rx={Math.min(2.5, w / 2)}
                fill={`url(#g-${gid})`}
                opacity={0.95}
              >
                <title>{`${d.label}: ${format(v)}`}</title>
              </rect>
            );
          })}
        </svg>
      </div>
      {/* Yorliqlar */}
      <div style={{ display: "flex", marginTop: "8px" }}>
        {data.map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: "center", fontSize: "10px", color: theme.textTertiary, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", padding: "0 1px" }}>
            {d.label}
          </div>
        ))}
      </div>
    </div>
  );
};

export default MiniChart;
