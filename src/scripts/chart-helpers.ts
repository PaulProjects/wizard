import type { Chart, Plugin } from "chart.js";
import zoomPlugin from "chartjs-plugin-zoom";
import Chart_ from "chart.js/auto";

Chart_.register(zoomPlugin);

const LABEL_FONT = "bold 12px sans-serif";
const LABEL_HEIGHT = 12;
const MARK_RADIUS = 4;
const PEAK_COLOR = "rgba(75, 192, 192, 1)";
const LOW_COLOR = "rgba(255, 255, 255, 0.5)";
const MUTED = "gray";

/** Vertical guide line following the hovered index. */
export const crosshair: Plugin = {
	id: "crosshair",
	afterDatasetsDraw(chart) {
		const active = chart.tooltip?.getActiveElements?.() ?? [];
		if (!active.length) return;
		const { ctx, chartArea } = chart;
		ctx.save();
		ctx.strokeStyle = "rgba(255, 255, 255, 0.25)";
		ctx.lineWidth = 1;
		ctx.setLineDash([4, 4]);
		ctx.beginPath();
		ctx.moveTo(active[0]!.element.x, chartArea.top);
		ctx.lineTo(active[0]!.element.x, chartArea.bottom);
		ctx.stroke();
		ctx.restore();
	},
};

const valuesOf = (chart: Chart): number[] =>
	(chart.data.datasets[0]?.data ?? []).map((d) =>
		typeof d === "number" ? d : ((d as { y?: number })?.y ?? 0),
	);

/**
 * Draws value labels. `auto` labels every point when there are few, otherwise
 * only the peak and the low so dense charts stay readable.
 */
export const valueLabels = (
	format: (value: number, index: number) => string,
	mode: "all" | "extremes" | "auto" = "auto",
): Plugin => ({
	id: "valueLabels",
	afterDatasetsDraw(chart) {
		const values = valuesOf(chart);
		if (!values.length) return;

		const meta = chart.getDatasetMeta(0);
		const { ctx, chartArea } = chart;

		const visible = meta.data
			.map((el, i) => ({ el, i }))
			.filter(
				({ el }) => el.x >= chartArea.left && el.x <= chartArea.right,
			);
		if (!visible.length) return;

		const dense = mode === "extremes" || (mode === "auto" && visible.length > 10);

		let targets = visible;
		let peakIndex = -1;
		let lowIndex = -1;

		if (dense) {
			const max = Math.max(...visible.map(({ i }) => values[i]!));
			const min = Math.min(...visible.map(({ i }) => values[i]!));
			peakIndex = visible.find(({ i }) => values[i] === max)!.i;
			// A low that repeats (flat stretches of zero) marks nothing useful.
			const lowIsUnique =
				min !== max &&
				visible.filter(({ i }) => values[i] === min).length <= 3;
			lowIndex = lowIsUnique
				? visible.find(({ i }) => values[i] === min)!.i
				: -1;
			targets = visible.filter(
				({ i }) => i === peakIndex || i === lowIndex,
			);
		}

		ctx.save();
		ctx.font = LABEL_FONT;
		ctx.textAlign = "center";
		for (const { el, i } of targets) {
			const value = values[i]!;
			if (!dense && value <= 0) continue;

			const isPeak = i === peakIndex;
			const isLow = i === lowIndex;
			const text = dense
				? `${isPeak ? "▲" : "▼"} ${format(value, i)}`
				: format(value, i);

			ctx.fillStyle = isPeak ? PEAK_COLOR : isLow ? LOW_COLOR : MUTED;
			ctx.textBaseline = "bottom";

			// Labels sit above the mark and may use the layout padding, so a
			// value at the very top is never pushed back onto its own point.
			const half = ctx.measureText(text).width / 2;
			ctx.fillText(
				text,
				Math.min(Math.max(el.x, half + 2), chart.width - half - 2),
				Math.max(el.y - MARK_RADIUS - 6, LABEL_HEIGHT),
			);

			if (isPeak || isLow) {
				ctx.beginPath();
				ctx.arc(el.x, el.y, MARK_RADIUS, 0, Math.PI * 2);
				ctx.strokeStyle = isPeak ? PEAK_COLOR : LOW_COLOR;
				ctx.lineWidth = 2;
				ctx.stroke();
			}
		}
		ctx.restore();
	},
});

/** Drag-select to zoom, pinch on touch. Wheel stays off so the page scrolls. */
export const zoomOptions = {
	zoom: {
		drag: {
			enabled: true,
			backgroundColor: "rgba(75, 192, 192, 0.15)",
			borderColor: "rgba(75, 192, 192, 0.6)",
			borderWidth: 1,
		},
		pinch: { enabled: true },
		mode: "x" as const,
	},
	pan: { enabled: true, mode: "x" as const, modifierKey: "ctrl" as const },
};

/** Hover anywhere on the column, not just exactly on the point. */
export const hoverInteraction = {
	mode: "index" as const,
	intersect: false,
	axis: "x" as const,
};
