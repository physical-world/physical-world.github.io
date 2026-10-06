/** Keep the method name consistent in prose, headings, and chart labels. */
export default function BrandName({
  text = "PhysiCalWorld",
}: {
  text?: string;
}) {
  return text
    .split(/(\bPhysiCal(?:World)?\b(?:\s*\(Ours\))?)/g)
    .map((part, index) =>
      /^PhysiCal(?:World)?(?:\s*\(Ours\))?$/.test(part) ? (
        <span className="brand-name" key={index}>
          {part}
        </span>
      ) : (
        part
      ),
    );
}
