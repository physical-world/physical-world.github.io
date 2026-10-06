import {
  type CSSProperties,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import BrandName from "./BrandName";
import allCases from "../data/video-tiles.json";
import "./tile-videos.css";

const methods = [
  { id: "ts", label: "TS-WM" },
  { id: "vanilla", label: "DINO-WM" },
  { id: "long_history", label: "DINO-WM + Long History" },
  { id: "prefix_context", label: "DINO-WM + Context Prefix" },
  { id: "oracle", label: "DINO-WM + Privileged Physics" },
  { id: "context", label: "DINO-WM + PhysiCal (Ours)" },
  { id: "lewm", label: "LeWM" },
  { id: "lewm_context", label: "LeWM + PhysiCal (Ours)" },
];
const defaults = ["context", "vanilla"];
let preference = defaults;
const listeners = new Set<() => void>();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
function choose(ids: string[]) {
  preference = ids;
  listeners.forEach((listener) => listener());
}
type Clip = { rgb?: string; mask?: string };
type Case = {
  stage: string;
  environment: string;
  group: string;
  order: number;
  context: string;
  files: Record<string, Clip | undefined>;
};
const labels: Record<string, string> = {
  pusht: "Push-T",
  reacher: "Reacher",
  beerpong: "BeerPong",
  fetchslide: "FetchSlide",
};
const base = import.meta.env.BASE_URL.replace(/\/?$/, "/");

export default function TileVideos({
  environment,
  stage,
}: {
  environment: string;
  stage: "openloop" | "planning";
}) {
  const planning = stage === "planning";
  const [showGT, setShowGT] = useState(true);
  const hasGT = !planning && showGT;
  const [group, setGroup] = useState("dino");
  const [index, setIndex] = useState(0);
  const [mask, setMask] = useState(true);
  const [context, setContext] = useState(false);
  const selected = useSyncExternalStore(
    subscribe,
    () => preference,
    () => defaults,
  );
  const cases = (allCases as Case[]).filter(
    (c) =>
      c.environment === environment &&
      c.stage === stage &&
      (!planning || c.group === group),
  );
  const current = cases[index];
  const available = methods.filter(
    (m) => current.files[planning ? `${m.id}_wm` : m.id],
  );
  // LeWM planning has its own examples; show its pair on first entry without
  // changing the shared DINO-WM selection in the other galleries.
  const chosen = available.filter((m) => selected.includes(m.id));
  const visible = chosen.length
    ? chosen
    : available.filter((m) =>
        (group === "le" ? ["lewm", "lewm_context"] : defaults).includes(m.id),
      );
  const columns = visible;
  const referencesBelow = planning && columns.length >= 3;
  const referencesBeside = planning && columns.length <= 2;
  const columnCount =
    planning || columns.length < 4
      ? columns.length
      : Math.ceil(columns.length / 2);
  const rootRef = useRef<HTMLElement>(null);
  const clockRef = useRef(0);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [inView, setInView] = useState(false);
  const [loadSources, setLoadSources] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const rate = environment === "beerpong" ? 0.75 : 1;
  const signature = `${group}:${index}:${mask}:${hasGT}:${visible.map((m) => m.id).join(",")}`;

  useEffect(() => {
    // Preserve the original heading space while fitting the site's sans font
    // to the existing explicit one- or two-line labels.
    const canvas = document.createElement("canvas");
    const measure = canvas.getContext("2d");
    if (!measure) return;
    const lines = [
      ...methods.flatMap((m) => m.label.replace(" +", "\n+").split("\n")),
      "Start",
      "Goal",
      "Ground Truth",
    ];
    let originalRatio = 77 / 672;
    if (planning) {
      let fitted = 12;
      for (let size = 12; size < 100; size++) {
        measure.font = `bold ${size}px "Times New Roman", Times, serif`;
        if (lines.every((line) => measure.measureText(line).width <= 336))
          fitted = size;
      }
      originalRatio = fitted / 336;
    }
    let cancelled = false;
    const fit = () => {
      const root = rootRef.current;
      if (!root || cancelled) return;
      measure.font = `700 100px ${getComputedStyle(root).fontFamily}`;
      const widest = Math.max(...lines.map((line) => measure.measureText(line).width));
      root.style.setProperty("--title-slot-ratio", String(originalRatio));
      root.style.setProperty(
        "--title-ratio",
        String(Math.min(originalRatio, 100 / widest)),
      );
    };
    fit();
    void document.fonts.ready.then(fit);
    return () => {
      cancelled = true;
    };
  }, [planning]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setInView(entry.isIntersecting);
        if (entry.isIntersecting) setLoadSources(true);
      },
      { rootMargin: "100px" },
    );
    if (rootRef.current) observer.observe(rootRef.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const videos = Array.from(
      rootRef.current!.querySelectorAll<HTMLVideoElement>("video[data-sync]"),
    );
    let frame = 0;
    let last = 0;
    let displayTime = 0;
    const tick = (now: number) => {
      const loaded = videos.every((v) => v.readyState >= 2);
      setReady(loaded);
      setFailed(videos.some((v) => Boolean(v.error)));
      const length = Math.max(
        0,
        ...videos.map((v) => (Number.isFinite(v.duration) ? v.duration : 0)),
      );
      setDuration(length);
      const running = playing && inView && !document.hidden && loaded;
      // Freeze the shared clock while any tile buffers, then resume together.
      if (running && last)
        clockRef.current += Math.min((now - last) / 1000, 0.1) * rate;
      if (length && clockRef.current >= length) clockRef.current = 0;
      videos.forEach((video) => {
        if (video.readyState < 1) return;
        const target = Math.min(
          clockRef.current,
          Math.max(0, video.duration - 0.001),
        );
        if (Math.abs(video.currentTime - target) > 0.08)
          video.currentTime = target;
        video.playbackRate = rate;
        if (running && clockRef.current < video.duration - 0.01) {
          if (video.paused) void video.play().catch(() => {});
        } else video.pause();
      });
      if (now - displayTime > 100) {
        setTime(clockRef.current);
        displayTime = now;
      }
      last = running ? now : 0;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      videos.forEach((v) => v.pause());
    };
  }, [signature, playing, inView, rate]);

  function seek(value: number) {
    clockRef.current = value;
    setTime(value);
    rootRef.current
      ?.querySelectorAll<HTMLVideoElement>("video[data-sync]")
      .forEach((v) => {
        if (v.readyState >= 1)
          v.currentTime = Math.min(value, Math.max(0, v.duration - 0.001));
      });
  }
  function changeCase(next: number) {
    seek(0);
    setIndex(next);
  }
  function toggleMethod(id: string) {
    const ids = visible.map((m) => m.id);
    if (ids.includes(id) && ids.length === 1) return;
    const next = ids.includes(id) ? ids.filter((m) => m !== id) : [...ids, id];
    choose([
      ...selected.filter((id) => !available.some((m) => m.id === id)),
      ...next,
    ]);
  }
  function referenceArrow() {
    return (
      <svg
        className="tile-reference-arrow"
        viewBox="0 0 32 16"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M3 8h26m-6-6 6 6-6 6"
          stroke="currentColor"
          strokeWidth="3"
          vectorEffect="non-scaling-stroke"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  function video(key: string, label: string, reference = false) {
    const clip = current.files[key];
    if (!clip) return null;
    const src =
      base + ((!reference && mask ? clip.mask : clip.rgb) ?? clip.rgb);
    return (
      <video
        key={src}
        src={loadSources ? src : undefined}
        data-sync={reference ? undefined : true}
        data-method={key}
        muted
        playsInline
        preload="auto"
        aria-label={label}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <section
      ref={rootRef}
      className={`tile-gallery ${planning ? "is-planning" : "is-openloop"}`}
      aria-label={`${labels[environment]} ${planning ? "visual planning" : "open-loop rollout"}`}
    >
      <div className="tile-toolbar">
        <strong>
          {labels[environment]} · {planning ? "Planning" : "Open-loop rollout"}
        </strong>
        <div className="tile-switches">
          {!planning && (
            <label>
              <input
                type="checkbox"
                checked={showGT}
                onChange={(e) => setShowGT(e.target.checked)}
              />
              Show GT
            </label>
          )}
          <label>
            <input
              type="checkbox"
              checked={mask}
              onChange={(e) => setMask(e.target.checked)}
            />{" "}
            Show mask
          </label>
          <label>
            <input
              type="checkbox"
              checked={context}
              onChange={(e) => setContext(e.target.checked)}
            />{" "}
            Show context
          </label>
        </div>
      </div>
      <div className="tile-toolbar tile-cases">
        {planning && (
          <label>
            Model group{" "}
            <select
              value={group}
              onChange={(e) => {
                seek(0);
                setIndex(0);
                setGroup(e.target.value);
              }}
            >
              <option value="dino">DINO-WM / TS-WM</option>
              <option value="le">LeWM</option>
            </select>
          </label>
        )}
        <div className="tile-case-buttons">
          <button
            type="button"
            disabled={index === 0}
            onClick={() => changeCase(index - 1)}
            aria-label="Previous example"
          >
            ←
          </button>
          <span aria-live="polite">
            Example {index + 1} / {cases.length}
          </span>
          <button
            type="button"
            disabled={index === cases.length - 1}
            onClick={() => changeCase(index + 1)}
            aria-label="Next example"
          >
            →
          </button>
        </div>
      </div>
      <div className="tile-workspace">
        <div className="tile-comparison">
          <div
            className="tile-layout"
            style={{ "--method-columns": columnCount } as CSSProperties}
            data-planning={planning || undefined}
            data-references-below={referencesBelow || undefined}
            data-references-beside={referencesBeside || undefined}
            data-gt={hasGT || undefined}
          >
            <div
              className="tile-columns"
              style={{ "--method-columns": columnCount } as CSSProperties}
            >
              {columns.map((m) => (
                <div className="tile-column" key={m.id}>
                  <h5>
                    {m.label.includes(" + ") ? (
                      <>
                        {m.label.split(" + ")[0]}
                        <br />
                        <BrandName text={"+ " + m.label.split(" + ")[1]} />
                      </>
                    ) : (
                      <BrandName text={m.label} />
                    )}
                  </h5>
                  {planning ? (
                    <>
                      {video(`${m.id}_wm`, `${m.label}: prediction`)}
                      {video(`${m.id}_exec`, `${m.label}: execution`)}
                    </>
                  ) : (
                    video(m.id, `${m.label}: rollout`)
                  )}
                </div>
              ))}
            </div>
            {hasGT && (
              <div className="tile-reference tile-gt">
                <h5>Ground Truth</h5>
                {video("gt", "Ground-truth rollout")}
              </div>
            )}
            {planning && (
              <div className="tile-reference-pair">
                <figure className="tile-reference tile-start">
                  <h5>Start</h5>
                  <div className="tile-reference-media">
                    {video("start", "Start observation", true)}
                    {!referencesBeside && referenceArrow()}
                  </div>
                </figure>
                {referencesBeside && (
                  <div className="tile-reference-connector" aria-hidden="true">
                    {referenceArrow()}
                  </div>
                )}
                <figure className="tile-reference tile-goal">
                  <h5>Goal</h5>
                  {video("goal", "Goal observation", true)}
                </figure>
              </div>
            )}
          </div>
        </div>
        <fieldset className="tile-method-list">
          <legend>Methods</legend>
          {available.map((m) => (
            <label key={m.id}>
              <input
                type="checkbox"
                checked={visible.some((v) => v.id === m.id)}
                disabled={visible.length === 1 && visible[0].id === m.id}
                onChange={() => toggleMethod(m.id)}
              />
              <span>
                <BrandName text={m.label} />
              </span>
            </label>
          ))}
        </fieldset>
      </div>
      <div className="tile-playback">
        <button type="button" onClick={() => setPlaying(!playing)}>
          {playing ? "Pause" : "Play"}
        </button>
        <button type="button" onClick={() => seek(0)}>
          Replay
        </button>
        <input
          aria-label="Comparison playback position"
          type="range"
          min="0"
          max={duration || 1}
          step="0.01"
          value={Math.min(time, duration || 1)}
          onChange={(e) => seek(Number(e.target.value))}
        />
        <span>
          {time.toFixed(1)} / {duration.toFixed(1)}s
        </span>
      </div>
      {(failed || (!ready && inView)) && (
        <p className="tile-status" role="status">
          {failed
            ? "A video could not load. Try another example or reload the page."
            : "Loading comparison…"}
        </p>
      )}
      {context && (
        <figure className="tile-context">
          <img
            src={base + current.context}
            alt="Shared exploratory interaction clip"
            loading="lazy"
          />
          <figcaption>Shared in-context interaction</figcaption>
        </figure>
      )}
      <p className="tile-caption">
        {planning
          ? "Top: WM Rollout. Bottom: Exec Traj. Prediction and execution are shown for the same planning example. Masks mark the fixed goal object locations. DINO-WM and LeWM groups use separate example selections."
          : "All methods predict the same action sequence. Masks show the recorded ground-truth object locations at each prediction frame after the initial frame."}{" "}
        Toggle Show context to view the shared exploratory interaction.
      </p>
      {environment === "beerpong" && (
        <p className="tile-caption">
          LeWM uses the TC-LeWM variant in BeerPong, as in the paper.
        </p>
      )}
    </section>
  );
}
