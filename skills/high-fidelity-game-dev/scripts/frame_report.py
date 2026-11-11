#!/usr/bin/env python3
"""Summarize exported frame intervals without claiming a hardware/quality pass."""

import argparse
import json
import math
import statistics
import sys
from pathlib import Path


def positive(value):
    number = float(value)
    if not math.isfinite(number) or number <= 0:
        raise argparse.ArgumentTypeError("must be finite and greater than zero")
    return number


def nonnegative(value):
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise argparse.ArgumentTypeError("must be finite and nonnegative")
    return number


def percentile(ordered, fraction):
    # Linear interpolation between neighboring ordered samples.
    position = (len(ordered) - 1) * fraction
    lower = math.floor(position)
    upper = math.ceil(position)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


def report(data, warmup_ms, budget_ms):
    if not isinstance(data, dict):
        raise ValueError("input must be an object with frames_ms and optional metadata")
    values = data.get("frames_ms")
    if not isinstance(values, list) or not values:
        raise ValueError("frames_ms must be a nonempty array")
    for index, value in enumerate(values):
        if (isinstance(value, bool) or not isinstance(value, (int, float))
                or not math.isfinite(value) or value <= 0):
            raise ValueError("frames_ms[%d] must be a finite positive number" % index)
    metadata = data.get("metadata", {})
    if not isinstance(metadata, dict):
        raise ValueError("metadata must be an object")
    elapsed, skipped = 0.0, 0
    # Drop entire intervals until warmup is covered; do not fabricate partial frames.
    while skipped < len(values) and elapsed < warmup_ms:
        elapsed += values[skipped]
        skipped += 1
    frames = values[skipped:]
    if not frames:
        raise ValueError("warmup consumes every sample; collect a longer run")
    ordered = sorted(frames)
    mean = statistics.fmean(frames)
    over = sum(value > budget_ms for value in frames)
    warnings = []
    if not metadata:
        warnings.append("No run metadata: device, workload and quality are unknown.")
    if len(frames) < 100:
        warnings.append("Fewer than 100 frames: tail percentiles have limited evidence.")
    if sum(frames) < 10000:
        warnings.append("Under 10 seconds after warmup: treat as a smoke sample.")
    return {
        "metadata": metadata,
        "method": "wall-clock frame intervals; percentiles use linear interpolation",
        "samples": len(frames),
        "discarded_samples": skipped,
        "discarded_ms": round(elapsed, 3),
        "measured_ms": round(sum(frames), 3),
        "mean_ms": round(mean, 3),
        "p50_ms": round(percentile(ordered, .50), 3),
        "p95_ms": round(percentile(ordered, .95), 3),
        "p99_ms": round(percentile(ordered, .99), 3),
        "max_ms": round(ordered[-1], 3),
        "average_delivered_fps": round(1000 / mean, 2),
        "budget_ms": budget_ms,
        "over_budget_frames": over,
        "over_budget_percent": round(100 * over / len(frames), 2),
        "warnings": warnings,
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input", type=Path, help="JSON object containing frames_ms array")
    parser.add_argument("--warmup-ms", type=nonnegative, default=2000,
                        help="discard full initial intervals covering this duration (default 2000)")
    parser.add_argument("--budget-ms", type=positive, default=16.67,
                        help="comparison budget, not a universal pass/fail target (default 16.67)")
    args = parser.parse_args()
    try:
        data = json.loads(args.input.read_text(encoding="utf-8"))
        result = report(data, args.warmup_ms, args.budget_ms)
        print(json.dumps(result, indent=2, allow_nan=False))
    except (OSError, ValueError, OverflowError) as error:
        print("frame_report: %s" % error, file=sys.stderr)
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
