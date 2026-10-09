import { useState } from "react";
import data from "../data/analysis.json";
import "./analysis-charts.css";
import BrandName from "./BrandName";

const colors: Record<string, string> = {
  vanilla: "#aad2c8",
  oracle: "#42a5f5",
  context: "#ff647b",
  history: "#f78c6b",
  prefix: "#06d6a0",
};
function Choices({
  options,
  value,
  onChange,
  label,
}: {
  options: string[];
  value: number;
  onChange: (n: number) => void;
  label: string;
}) {
  return (
    <div className="chart-choices" role="group" aria-label={label}>
      {options.map((option, i) => (
        <button
          key={option}
          type="button"
          aria-pressed={value === i}
          onClick={() => onChange(i)}
        >
          {option}
        </button>
      ))}
    </div>
  );
}
// Paired identity colors from the paper's Figure 8 (Matplotlib tab10).
const descriptorColors = [
  "#1f77b4",
  "#1f77b4",
  "#ff7f0e",
  "#ff7f0e",
  "#2ca02c",
  "#2ca02c",
  "#d62728",
  "#d62728",
];
export function Descriptor() {
  const [pair, setPair] = useState([0, 1]);
  const points = data.descriptor.points;
  const value = data.descriptor.matrix[pair[0]][pair[1]];
  // descriptor-card class = shared block width (max-width: 720px), set in analysis-charts.css:130
  return (
    <div className="analysis-card descriptor-card not-prose">
      <div className="descriptor-layout">
        <svg
          viewBox="0 0 310 325"
          role="img"
          aria-label={`T-block centers of mass; ${points[pair[0]].id} and ${points[pair[1]].id} highlighted. Coordinates increase downward as in the paper.`}
        >
          <text x="160" y="22" textAnchor="middle">
            Centers of mass
          </text>
          <rect
            x="40"
            y="40"
            width="240"
            height="240"
            fill="white"
            stroke="black"
            strokeWidth="1.5"
          />
          <path
            d="M58 58 H262 V109 H185.5 V262 H134.5 V109 H58 Z"
            fill="var(--chart-block)"
            stroke="currentColor"
            strokeWidth="1.5"
          />
          {[-1, -0.5, 0, 0.5, 1].map((t) => (
            <g key={t}>
              <text x={160 + t * 102} y="296" textAnchor="middle" fontSize="14">
                {t}
              </text>
              <text x="34" y={164 + t * 102} textAnchor="end" fontSize="14">
                {t}
              </text>
            </g>
          ))}
          <text x="160" y="317" textAnchor="middle" fontSize="14">
            Normalized T-local coordinates
          </text>
          {points.map((p, i) => {
            const x = 160 + p.coordinates[0] * 102,
              y = 160 + p.coordinates[1] * 102;
            const active = pair.includes(i);
            return (
              <g key={p.id}>
                {active && (
                  <circle
                    cx={x}
                    cy={y}
                    r={11}
                    fill="none"
                    stroke={descriptorColors[i]}
                    strokeWidth="1.5"
                  />
                )}
                <circle
                  cx={x}
                  cy={y}
                  r={active ? 8 : 5.5}
                  fill={descriptorColors[i]}
                  stroke="white"
                  strokeWidth="2"
                />
                <text
                  x={x + 12}
                  y={y - 13}
                  fontSize="15"
                  fontWeight={active ? 800 : 500}
                  fill={descriptorColors[i]}
                >
                  {p.id}
                </text>
              </g>
            );
          })}
        </svg>
        <div
          className="heatmap"
          role="group"
          aria-label="Pairwise cosine similarity"
        >
          <span />
          {points.map((p, i) => (
            <span
              className="heat-label"
              data-selected={pair[1] === i}
              key={p.id}
              style={{ color: descriptorColors[i], fontWeight: 700 }}
            >
              {p.id}
            </span>
          ))}
          {data.descriptor.matrix.map((row, i) => (
            <div className="heat-row" key={points[i].id}>
              <span
                className="heat-label"
                data-selected={pair[0] === i}
                style={{ color: descriptorColors[i], fontWeight: 700 }}
              >
                {points[i].id}
              </span>
              {row.map((v, j) => (
                <button
                  key={points[j].id}
                  type="button"
                  className={
                    pair[0] === i && pair[1] === j ? "selected-cell" : ""
                  }
                  style={{
                    background:
                      v >= 0
                        ? `hsl(7 65% ${96 - v * 62}%)`
                        : `hsl(207 60% ${96 + v * 60}%)`,
                    color: Math.abs(v) > 0.55 ? "white" : "#17212b",
                  }}
                  aria-label={`${points[i].id} and ${points[j].id}: ${v.toFixed(4)}`}
                  aria-pressed={pair[0] === i && pair[1] === j}
                  onMouseEnter={() => setPair([i, j])}
                  onFocus={() => setPair([i, j])}
                  onClick={() => setPair([i, j])}
                >
                  {v.toFixed(2)}
                </button>
              ))}
            </div>
          ))}
        </div>
      </div>
      <div className="chart-readout" aria-live="polite">
        <strong>
          {points[pair[0]].id} ↔ {points[pair[1]].id}
        </strong>
        <span>
          Cosine similarity <strong>{value.toFixed(4)}</strong>
        </span>
      </div>
      <p className="chart-note">
        Each cell averages similarities between interaction clips. Diagonal
        cells compare distinct clips at the same CoM.
      </p>
    </div>
  );
}
const predictionMetrics = [
  {
    key: "psnr_db",
    label: "PSNR ↑",
    axis: "PSNR (dB) ↑",
    min: 13,
    max: 26,
    ticks: [15, 17.5, 20, 22.5, 25],
    decimals: 2,
  },
  {
    key: "ssim",
    label: "SSIM ↑",
    axis: "SSIM ↑",
    min: 0.65,
    max: 1,
    ticks: [0.65, 0.7, 0.8, 0.9, 1],
    decimals: 3,
  },
  {
    key: "lpips",
    label: "LPIPS ↓",
    axis: "LPIPS ↓",
    min: 0,
    max: 0.15,
    ticks: [0, 0.03, 0.06, 0.09, 0.12, 0.15],
    decimals: 3,
  },
  {
    key: "miou_percent",
    label: "IoU ↑",
    axis: "IoU (%) ↑",
    min: 35,
    max: 85,
    ticks: [40, 50, 60, 70, 80],
    decimals: 2,
  },
] as const;
export function Generalization() {
  const [metric, setMetric] = useState(0),
    [bin, setBin] = useState(2);
  const { key, label, axis, min, max, ticks, decimals } =
    predictionMetrics[metric];
  const x = (v: number) => 62 + (v / 0.03) * 610;
  const y = (v: number) => 300 - ((v - min) / (max - min)) * 240;
  // descriptor-card class = shared block width (max-width: 720px), set in analysis-charts.css:130
  return (
    <div className="analysis-card descriptor-card not-prose">
      {/* Intro text inside the card, above the metric tabs. margin: 0 0 16px = no top gap, 16px below; edit the last number for spacing. */}
      <Choices
        label="Prediction metric"
        options={predictionMetrics.map((m) => m.label)}
        value={metric}
        onChange={setMetric}
      />
      <p className="chart-note text-justify" style={{ margin: "0 0 12px" }}>
        In Reacher, we sweep the first joint’s (should joint) damping coefficient beyond its
        training range while holding the second joint’s damping fixed.
      </p>
      <div className="chart-legend">
        {data.methods.map((m) => (
          <span key={m.id}>
            <i style={{ background: colors[m.id] }} />
            <span className="legend-label">
              <BrandName text={m.label} />
            </span>
          </span>
        ))}
      </div>
      <svg
        key={metric}
        className="ood-chart"
        viewBox="0 0 700 355"
        role="img"
        aria-label={`Reacher ${label} versus shoulder damping, mean plus or minus SEM. Select a damping bin below for exact values.`}
      >
        <rect
          x={x(data.trainingRange[0])}
          y="45"
          width={x(data.trainingRange[1]) - x(data.trainingRange[0])}
          height="255"
          fill="var(--chart-shade)"
        />
        <text x={x(0.0125)} y="36" textAnchor="middle" fontSize="14">
          Training range
        </text>
        <text x={x(0.025)} y="36" textAnchor="middle" fontSize="14">
          OOD
        </text>
        <text x="62" y="17" fontSize="15">
          {axis}
        </text>
        {ticks.map((v) => (
          <g key={v}>
            <line
              x1="62"
              x2="672"
              y1={y(v)}
              y2={y(v)}
              stroke="currentColor"
              opacity=".15"
            />
            <text x="51" y={y(v) + 4} textAnchor="end" fontSize="14">
              {v}
            </text>
          </g>
        ))}
        {[0, 0.005, 0.01, 0.015, 0.02, 0.025, 0.03].map((v) => (
          <text key={v} x={x(v)} y="321" textAnchor="middle" fontSize="14">
            {v.toFixed(3)}
          </text>
        ))}
        <text x="365" y="347" textAnchor="middle" fontSize="15">
          Reacher shoulder damping
        </text>
        <line
          x1={x(data.bins[bin].center)}
          x2={x(data.bins[bin].center)}
          y1="45"
          y2="300"
          stroke="currentColor"
          opacity=".3"
          strokeDasharray="4 4"
        />
        {data.methods.map((m) => {
          const ps = m.points.map((p) => ({
            ...p[key],
            center: data.bins.find((b) => b.id === p.bin_id)!.center,
          }));
          return (
            <g key={m.id}>
              <polygon
                points={[
                  ...ps.map((p) => `${x(p.center)},${y(p.upper)}`),
                  ...[...ps]
                    .reverse()
                    .map((p) => `${x(p.center)},${y(p.lower)}`),
                ].join(" ")}
                fill={colors[m.id]}
                opacity=".16"
              />
              <polyline
                points={ps.map((p) => `${x(p.center)},${y(p.mean)}`).join(" ")}
                fill="none"
                stroke={colors[m.id]}
                strokeWidth="3"
              />
              {ps.map((p, i) => (
                <g
                  key={p.center}
                  onMouseEnter={() => setBin(i)}
                  onClick={() => setBin(i)}
                  style={{ cursor: "pointer" }}
                >
                  <circle
                    cx={x(p.center)}
                    cy={y(p.mean)}
                    r="14"
                    fill="transparent"
                  />
                  {m.id === "oracle" ? (
                    <rect
                      x={x(p.center) - 5}
                      y={y(p.mean) - 5}
                      width="10"
                      height="10"
                      fill={colors[m.id]}
                    />
                  ) : m.id === "context" ? (
                    <path
                      d={`M${x(p.center)} ${y(p.mean) - 6} l6 11 h-12 Z`}
                      fill={colors[m.id]}
                    />
                  ) : (
                    <circle
                      cx={x(p.center)}
                      cy={y(p.mean)}
                      r={bin === i ? 6 : 4}
                      fill={colors[m.id]}
                    />
                  )}
                  <title>{`${m.label}: ${p.mean.toFixed(decimals)} ± ${p.sem.toFixed(decimals)}`}</title>
                </g>
              ))}
            </g>
          );
        })}
      </svg>
      <div className="damping-control">
        <label>
          <span className="damping-label">
            Shoulder damping <strong>{data.bins[bin].center.toFixed(4)}</strong>
          </span>
          <input
            type="range"
            min={0}
            max={0.03}
            step="any"
            value={data.bins[bin].center}
            aria-label="Shoulder damping"
            aria-valuetext={data.bins[bin].center.toFixed(4)}
            onChange={(event) => {
              const value = Number(event.target.value);
              const nearest = data.bins.reduce(
                (best, b, i) =>
                  Math.abs(b.center - value) <
                  Math.abs(data.bins[best].center - value)
                    ? i
                    : best,
                0,
              );
              setBin(nearest);
              event.target.value = String(data.bins[nearest].center);
            }}
            onKeyDown={(event) => {
              const changes: Record<string, number> = {
                ArrowRight: 1,
                ArrowUp: 1,
                ArrowLeft: -1,
                ArrowDown: -1,
              };
              if (
                event.key in changes ||
                event.key === "Home" ||
                event.key === "End"
              ) {
                event.preventDefault();
                setBin(
                  event.key === "Home"
                    ? 0
                    : event.key === "End"
                      ? data.bins.length - 1
                      : Math.max(
                          0,
                          Math.min(
                            data.bins.length - 1,
                            bin + changes[event.key],
                          ),
                        ),
                );
              }
            }}
          />
        </label>
        <div className="damping-ticks" aria-hidden="true">
          {data.bins.map((b, i) => (
            <span
              key={b.id}
              data-active={bin === i}
              style={{ left: `${(b.center / 0.03) * 100}%` }}
            >
              {b.center.toFixed(4)}
            </span>
          ))}
        </div>
      </div>
      <div className="ood-readout" aria-live="polite">
        {data.methods.map((m) => (
          <div key={m.id}>
            <span>
              <BrandName text={m.label} />
            </span>
            <strong style={{ color: colors[m.id] }}>
              {m.points[bin][key].mean.toFixed(decimals)}{" "}
              <small>± {m.points[bin][key].sem.toFixed(decimals)}</small>
            </strong>
          </div>
        ))}
      </div>
      <p className="chart-note">
        Mean ± SEM across 75 episodes per bin (15 damping values × 5 episodes).
        {/* IC3 */}
        Open-Loop rollout. 
        IoU is computed over the foreground mask of the robotic arm, averaged over episodes. Joint 2's damping is fixed.
      </p>
    </div>
  );
}
// Published Push-T latency means; source: paper inference-efficiency table.
const speed = [
  { id: "vanilla", label: "DINO-WM", values: [13.78, 24.01, 44.48, 32.66] },
  {
    id: "history",
    label: "+ Long History",
    values: [18.05, 48.97, 131.27, 43.96],
  },
  {
    id: "prefix",
    label: "+ Context Prefix",
    values: [48.36, 91.44, 177.61, 323.09],
  },
  {
    id: "oracle",
    label: "+ Privileged Physics",
    values: [13.67, 23.82, 44.05, 32.55],
  },
  {
    id: "context",
    label: "+ PhysiCal (Ours)",
    values: [16.03, 26.31, 45.83, 32.67],
  },
];
const speedScales = [
  { max: 100, ticks: [0, 25, 50, 75, 100] },
  { max: 150, ticks: [0, 50, 100, 150] },
  { max: 250, ticks: [0, 50, 100, 150, 200, 250] },
  { max: 400, ticks: [0, 100, 200, 300, 400] },
];
export function InferenceSpeed() {
  const [mode, setMode] = useState(0);
  const { max, ticks } = speedScales[mode];
  const unit = mode === 3 ? "s" : "ms";
  // descriptor-card class = shared block width (max-width: 720px), set in analysis-charts.css:130
  return (
    <div className="analysis-card descriptor-card not-prose">
      <Choices
        label="Inference workload"
        options={["Rollout · 5 steps", "10 steps", "20 steps", "Planning"]}
        value={mode}
        onChange={setMode}
      />
      <p className="chart-note">
        Push-T · Mean latency ({unit}) · Lower is better
      </p>
      <div className="speed-bars" aria-live="polite">
        {speed.map((m) => (
          <div className="speed-row" key={m.id}>
            <div className="speed-label">
              <span>
                <BrandName text={m.label} />
              </span>
              <span>
                <strong>
                  {m.values[mode].toFixed(2)} {unit}
                </strong>{" "}
                <small>
                  ({(m.values[mode] / speed[0].values[mode]).toFixed(2)}×
                  baseline)
                </small>
              </span>
            </div>
            <div className="speed-track">
              <div
                style={{
                  width: `${(m.values[mode] / max) * 100}%`,
                  background: colors[m.id],
                }}
              />
            </div>
          </div>
        ))}
        <div className="speed-axis" aria-label={`Time scale: 0–${max} ${unit}`}>
          {ticks.map((tick) => (
            <span key={tick} style={{ left: `${(tick / max) * 100}%` }}>
              {tick}
            </span>
          ))}
        </div>
      </div>
      <p className="chart-note">
        One RTX PRO 6000 Blackwell GPU · FP32, TF32 disabled.{" "}
        {mode === 3
          ? "CEM: horizon 5, 300 samples, 30 iterations. Mean of 10 solves for one target; includes encoding, excludes simulator execution."
          : "Mean of 100 timed calls after 20 warm-ups across 10 episodes. Includes initial observation and context encoding; excludes decoding and data I/O."}
      </p>
    </div>
  );
}
