import { useEffect, useRef, useState } from "react";
import "./animated-physics.css";

type Kind = "teaser" | "method";
import teaserSvg from "../assets/diagrams/teaser.svg?raw";
import methodSvg from "../assets/diagrams/method.svg?raw";
import methodSvgUrl from "../assets/diagrams/method.svg?url";
const artwork = {
  teaser: { svg: teaserSvg, viewBox: "0 0 9600 3695" },
  method: { svg: methodSvg, viewBox: "0 0 24201 7201" },
};

export default function AnimatedPhysics({ kind }: { kind: Kind }) {
  const figure = artwork[kind];
  const [started, setStarted] = useState(false);
  const [replay, setReplay] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const container =
      rootRef.current?.querySelector<HTMLElement>(".physics-artwork");
    if (!container) return;
    const resize = new ResizeObserver(() => {
      const width = container.getBoundingClientRect().width;
      if (width)
        container.style.setProperty(
          "--ppt-rise",
          `${(10 * Number(figure.viewBox.split(" ")[2])) / width}px`,
        );
    });
    resize.observe(container);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setStarted(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(container);
    return () => {
      resize.disconnect();
      observer.disconnect();
    };
  }, [figure.viewBox]);
  return (
    <div
      ref={rootRef}
      className={`animated-physics ${started ? "has-entered" : ""}`}
    >
      <div
        className="physics-scroll"
        role="region"
        aria-label={`${kind} diagram; scroll horizontally on small screens`}
        tabIndex={0}
      >
        <div className={`physics-artwork ${kind}`}>
          <div key={replay} className="physics-animation">
            <div
              className="physics-native-svg"
              role="img"
              aria-label={
                kind === "teaser"
                  ? "In-context physics calibration through exploratory interaction, context prompting, and future prediction."
                  : "Exploratory actions and observations are encoded into a reusable physics descriptor that conditions world-model predictions."
              }
              // Trusted, repository-owned SVG generated from the supplied PPT; never user HTML.
              // eslint-disable-next-line @eslint-react/dom/no-dangerously-set-innerhtml
              dangerouslySetInnerHTML={{ __html: figure.svg }}
            />
          </div>
          <noscript>
            <style>
              {".physics-animation,.physics-controls{display:none!important}"}
            </style>
            <img
              src={
                kind === "method"
                  ? methodSvgUrl
                  : `/figures/physics/${kind}-ppt.webp`
              }
              alt="Complete physics calibration diagram"
            />
          </noscript>
        </div>
      </div>
      <div className="physics-controls">
        <button
          type="button"
          onClick={() => {
            setStarted(true);
            setReplay((n) => n + 1);
          }}
          aria-label={`Replay ${kind} animation`}
        >
          ↻ Replay
        </button>
      </div>
    </div>
  );
}
