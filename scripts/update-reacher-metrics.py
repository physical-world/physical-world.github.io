"""Append SSIM/LPIPS from saved IC3 episodes; --check verifies all four metrics."""

import argparse
import json
import math
from pathlib import Path
import statistics

ROOT = Path(__file__).resolve().parents[1]
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--check", action="store_true")
parser.add_argument(
    "--source", type=Path,
    default=ROOT.parent.parent / "dino_wm_rebase/logs/extrapolation_eval/20260924/reacher",
)
args = parser.parse_args()
path = ROOT / "src/data/analysis.json"
data = json.loads(path.read_text())
metrics = {
    "psnr_db": ("img_psnr_pred", 1),
    "ssim": ("img_ssim_pred", 1),
    "lpips": ("img_lpips_pred", 1),
    "miou_percent": ("segm_miou_pred", 100),
}
for method in data["methods"]:
    for point in method["points"]:
        b = next(b for b in data["bins"] if b["id"] == point["bin_id"])
        phase = "in_domain" if data["trainingRange"][0] <= b["lower"] and b["upper"] <= data["trainingRange"][1] else "extrapolation"
        source = args.source / phase / method["id"] / f"bin_{b['id']:02d}" / "0_result_rollout.json"
        result = json.loads(source.read_text())
        assert result["rollout_init_ctx"] == 3, source
        episodes = result["per_target"]
        assert len(episodes) == 75, source
        assert len({e["source_episode"] for e in episodes}) == 75, source
        for key, (field, scale) in metrics.items():
            values = [e[field] * scale for e in episodes]
            assert all(math.isfinite(v) for v in values), (source, field)
            mean = statistics.mean(values)
            std = statistics.stdev(values)
            sem = std / math.sqrt(len(values))
            expected = dict(mean=mean, sample_std=std, sem=sem, lower=mean-sem, upper=mean+sem, n=len(values))
            if args.check or key in ("psnr_db", "miou_percent"):
                for name, value in expected.items():
                    assert math.isclose(point[key][name], value, rel_tol=1e-10, abs_tol=1e-12), (source, key, name)
            else:
                point[key] = expected
if not args.check:
    path.write_text(json.dumps(data, indent=2) + "\n")
print("Verified all 18 method/bin combinations against 75 source episodes each." if args.check else "Appended SSIM and LPIPS; existing PSNR and mIoU verified.")
