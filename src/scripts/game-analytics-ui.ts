import Chart from "chart.js/auto";
import { GameData as gamedata } from "./game/gamedata.ts";
import { Logger } from "./logger.ts";
import {
	crosshair,
	hoverInteraction,
	valueLabels,
	zoomOptions,
} from "./chart-helpers.ts";
import {
	bucketKey,
	bucketRange,
	startOfBucket,
	type Granularity,
} from "./date-buckets.ts";

const PALETTE = [
	"rgba(255, 99, 132, 0.7)",
	"rgba(54, 162, 235, 0.7)",
	"rgba(255, 206, 86, 0.7)",
	"rgba(75, 192, 192, 0.7)",
	"rgba(153, 102, 255, 0.7)",
	"rgba(255, 159, 64, 0.7)",
	"rgba(99, 102, 241, 0.7)",
	"rgba(34, 197, 94, 0.7)",
];

const BASE_OPTIONS = {
	responsive: true,
	maintainAspectRatio: false,
	interaction: hoverInteraction,
	layout: { padding: { top: 28, left: 8, right: 8 } },
	scales: {
		y: {
			beginAtZero: true,
			grace: "12%",
			ticks: { precision: 0 },
			grid: { color: "rgba(255, 255, 255, 0.05)" },
		},
		x: { grid: { display: false } },
	},
} as const;

export class GameAnalyticsUI {
	private games: gamedata[];
	private charts: Record<string, Chart<any, any, any>> = {};
	private isInitialized = false;
	private deviations?: { dist: Map<number, number>; entries: number; sum: number };

	private opts: Record<string, string> = {
		gamesOverTime: "month",
		duration: "buckets",
		betting: "detail",
	};

	private renderers: Record<string, () => void> = {
		gamesOverTime: () => this.renderGamesOverTime(),
		duration: () => this.renderDurationDistribution(),
		playerCounts: () => this.renderPlayerCounts(),
		betting: () => this.renderBettingBehavior(),
		rules: () => this.renderRuleUsage(),
	};

	constructor(games: gamedata[]) {
		this.games = games;
	}

	public render() {
		if (this.isInitialized) return;

		try {
			this.renderSummary();
			Object.values(this.renderers).forEach((fn) => fn());
			this.bindControls();
			this.isInitialized = true;
		} catch (e) {
			Logger.error("Failed to render game analytics", {
				error: (e as Error).message,
			});
		}
	}

	private bindControls() {
		document.querySelectorAll<HTMLElement>("[data-toggle]").forEach((group) => {
			group.addEventListener("click", (event) => {
				const btn = (event.target as HTMLElement).closest<HTMLElement>(
					"[data-value]",
				);
				const name = group.dataset.toggle;
				if (!btn || !name || this.opts[name] === btn.dataset.value) return;

				group
					.querySelectorAll("[data-value]")
					.forEach((b) => b.classList.remove("btn-active"));
				btn.classList.add("btn-active");
				this.opts[name] = btn.dataset.value!;
				this.renderers[name]?.();
			});
		});

		document
			.querySelectorAll<HTMLElement>("[data-reset-zoom]")
			.forEach((btn) => {
				btn.addEventListener("click", () =>
					this.charts[btn.dataset.resetZoom!]?.resetZoom(),
				);
			});
	}

	private canvas(id: string): HTMLCanvasElement | null {
		return document.getElementById(id) as HTMLCanvasElement | null;
	}

	private swap(key: string, ctx: HTMLCanvasElement, config: ConstructorParameters<typeof Chart>[1]) {
		this.charts[key]?.destroy();
		this.charts[key] = new Chart(ctx, config);
	}

	private renderSummary() {
		const completedGames = this.games.filter((g) => !g.isActive);

		const set = (id: string, value: string) => {
			const el = document.getElementById(id);
			if (el) el.innerText = value;
		};

		set("ga-total-games", this.games.length.toString());

		const uniquePlayers = new Set<string>();
		this.games.forEach((g) => g.getPlayers().forEach((p) => uniquePlayers.add(p)));
		set("ga-total-players", uniquePlayers.size.toString());

		let totalMs = 0;
		completedGames.forEach((g) => {
			const start = g.getTimeStarted();
			const end = g.getTimeEnded();
			if (start && end) totalMs += end - start;
		});
		const hours = totalMs / (1000 * 60 * 60);
		set("ga-total-playtime", `${hours > 100 ? hours.toFixed(0) : hours.toFixed(1)}h`);

		set(
			"ga-total-rounds",
			this.games.reduce((acc, g) => acc + g.getScore().length, 0).toString(),
		);
	}

	private renderGamesOverTime() {
		const ctx = this.canvas("chart-games-over-time");
		if (!ctx) return;

		const granularity = this.opts.gamesOverTime as Granularity;
		const sortedGames = [...this.games].sort(
			(a, b) => a.getTimeStarted() - b.getTimeStarted(),
		);
		if (sortedGames.length === 0) return;

		const dataMap = new Map<string, number>(
			bucketRange(
				sortedGames[0]!.getTimeStarted(),
				sortedGames[sortedGames.length - 1]!.getTimeStarted(),
				granularity,
			).map((key) => [key, 0]),
		);
		sortedGames.forEach((g) => {
			const key = bucketKey(startOfBucket(g.getTimeStarted(), granularity), granularity);
			dataMap.set(key, (dataMap.get(key) || 0) + 1);
		});

		const labels = Array.from(dataMap.keys());
		const dense = labels.length > 60;

		this.swap("gamesOverTime", ctx, {
			type: "line",
			data: {
				labels,
				datasets: [
					{
						label: "Games Played",
						data: Array.from(dataMap.values()),
						borderColor: "rgb(75, 192, 192)",
						backgroundColor: "rgba(75, 192, 192, 0.2)",
						borderWidth: 2,
						tension: 0.3,
						fill: true,
						pointRadius: dense ? 0 : 3,
						pointHoverRadius: 5,
					},
				],
			},
			plugins: [crosshair, valueLabels((v) => v.toString())],
			options: {
				...BASE_OPTIONS,
				plugins: {
					legend: { display: false },
					zoom: zoomOptions,
					tooltip: {
						callbacks: {
							label: (item) => `${item.parsed.y} games`,
						},
					},
				},
			},
		});
	}

	private renderDurationDistribution() {
		const ctx = this.canvas("chart-duration-distribution");
		if (!ctx) return;

		const durations = this.games
			.filter((g) => !g.isActive && g.getTimeEnded())
			.map((g) => (g.getTimeEnded()! - g.getTimeStarted()) / 60000)
			.filter((d) => d > 0 && d < 600);

		let labels: string[];
		let values: number[];
		const raw = this.opts.duration === "raw";

		if (raw) {
			const step = 10;
			const max = Math.max(...durations, step);
			const binCount = Math.ceil(max / step);
			values = new Array(binCount).fill(0);
			durations.forEach((d) => {
				values[Math.min(Math.floor(d / step), binCount - 1)]!++;
			});
			labels = values.map((_, i) => `${i * step}-${(i + 1) * step}`);
		} else {
			const buckets = { "< 30": 0, "30-45": 0, "45-60": 0, "60-90": 0, "90+": 0 };
			durations.forEach((d) => {
				if (d < 30) buckets["< 30"]++;
				else if (d < 45) buckets["30-45"]++;
				else if (d < 60) buckets["45-60"]++;
				else if (d < 90) buckets["60-90"]++;
				else buckets["90+"]++;
			});
			labels = Object.keys(buckets);
			values = Object.values(buckets);
		}

		this.swap("duration", ctx, {
			type: "bar",
			data: {
				labels,
				datasets: [
					{
						label: "Games",
						data: values,
						// A histogram is one series; only the coarse buckets are categorical.
						backgroundColor: raw
							? PALETTE[3]
							: labels.map((_, i) => PALETTE[i % PALETTE.length]!),
						borderRadius: 4,
					},
				],
			},
			plugins: [crosshair, valueLabels((v) => v.toString())],
			options: {
				...BASE_OPTIONS,
				scales: {
					...BASE_OPTIONS.scales,
					x: {
						grid: { display: false },
						title: { display: true, text: "Duration (Minutes)" },
					},
				},
				plugins: {
					legend: { display: false },
					zoom: zoomOptions,
					tooltip: {
						callbacks: { label: (item) => `${item.parsed.y} games` },
					},
				},
			},
		});
	}

	private renderPlayerCounts() {
		const ctx = this.canvas("chart-player-counts");
		if (!ctx) return;

		const countsMap = new Map<number, number>();
		this.games.forEach((g) => {
			const c = g.getPlayers().length;
			countsMap.set(c, (countsMap.get(c) || 0) + 1);
		});

		const total = this.games.length || 1;
		const sortedKeys = Array.from(countsMap.keys()).sort((a, b) => a - b);
		const values = sortedKeys.map((k) => countsMap.get(k)!);

		this.swap("playerCounts", ctx, {
			type: "bar",
			data: {
				labels: sortedKeys.map((k) => `${k} Players`),
				datasets: [
					{
						label: "Games",
						data: values,
						backgroundColor: sortedKeys.map(
							(_, i) => PALETTE[i % PALETTE.length]!,
						),
						borderRadius: 4,
					},
				],
			},
			plugins: [
				crosshair,
				valueLabels((v) => `${v} (${((v / total) * 100).toFixed(1)}%)`),
			],
			options: {
				...BASE_OPTIONS,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (item) =>
								`${item.parsed.y} games (${((item.parsed.y / total) * 100).toFixed(1)}%)`,
						},
					},
				},
			},
		});
	}

	private getDeviations() {
		if (this.deviations) return this.deviations;

		const dist = new Map<number, number>();
		let entries = 0;
		let sum = 0;

		this.games
			.filter((g) => !g.isActive)
			.forEach((g) => {
				const bets = g.bets || [];
				const tricks = g.tricks || [];
				for (let r = 0; r < g.round; r++) {
					if (!bets[r] || !tricks[r]) continue;
					for (let p = 0; p < g.players.length; p++) {
						if (bets[r]![p] === undefined || tricks[r]![p] === undefined) continue;
						const deviation = bets[r]![p]! - tricks[r]![p]!;
						sum += Math.abs(deviation);
						entries++;
						dist.set(deviation, (dist.get(deviation) || 0) + 1);
					}
				}
			});

		this.deviations = { dist, entries, sum };
		return this.deviations;
	}

	private renderBettingBehavior() {
		const ctx = this.canvas("chart-betting-accuracy");
		if (!ctx) return;

		const { dist, entries, sum } = this.getDeviations();

		const statEl = document.getElementById("stat-avg-deviation");
		if (statEl) {
			statEl.innerText = entries > 0 ? (sum / entries).toFixed(2) : "0.00";
		}

		if (this.opts.betting === "grouped") {
			let under = 0;
			let spotOn = 0;
			let over = 0;
			dist.forEach((count, deviation) => {
				if (deviation < 0) under += count;
				else if (deviation === 0) spotOn += count;
				else over += count;
			});
			const values = [under, spotOn, over];
			const total = entries || 1;

			this.swap("betting", ctx, {
				type: "bar",
				data: {
					labels: ["Underestimated", "Spot On", "Overestimated"],
					datasets: [
						{
							label: "Rounds",
							data: values,
							backgroundColor: [
								"rgba(54, 162, 235, 0.7)",
								"rgba(75, 192, 192, 0.7)",
								"rgba(255, 99, 132, 0.7)",
							],
							borderRadius: 4,
						},
					],
				},
				plugins: [
					crosshair,
					valueLabels((v) => `${v} (${((v / total) * 100).toFixed(1)}%)`),
				],
				options: {
					...BASE_OPTIONS,
					plugins: {
						legend: { display: false },
						tooltip: {
							callbacks: { label: (item) => `${item.parsed.y} rounds` },
						},
					},
				},
			});
			return;
		}

		const keys = dist.size ? Array.from(dist.keys()) : [-1, 0, 1];
		const min = Math.min(...keys, 0);
		const max = Math.max(...keys, 0);
		const points = [];
		for (let d = min; d <= max; d++) points.push({ x: d, y: dist.get(d) || 0 });

		this.swap("betting", ctx, {
			type: "line",
			data: {
				datasets: [
					{
						label: "Rounds",
						data: points,
						parsing: false,
						borderColor: "rgba(54, 162, 235, 0.9)",
						backgroundColor: "rgba(54, 162, 235, 0.2)",
						borderWidth: 2,
						pointBackgroundColor: (context) =>
							(context.raw as { x: number }).x === 0
								? "rgba(75, 192, 192, 1)"
								: "rgba(54, 162, 235, 1)",
						pointRadius: (context) =>
							(context.raw as { x: number }).x === 0 ? 5 : 3,
						pointHoverRadius: 6,
						tension: 0.25,
						fill: true,
					},
				],
			},
			plugins: [crosshair, valueLabels((v) => v.toLocaleString())],
			options: {
				...BASE_OPTIONS,
				scales: {
					...BASE_OPTIONS.scales,
					x: {
						type: "linear",
						min: min - 0.5,
						max: max + 0.5,
						grid: { display: false },
						title: {
							display: true,
							text: "Difference between Bet and actual Tricks",
						},
						ticks: {
							stepSize: 1,
							callback: (value) => {
								const num = Number(value);
								if (!Number.isInteger(num)) return "";
								if (num === 0) return "Spot On (0)";
								return num < 0 ? `${num} (Under)` : `+${num} (Over)`;
							},
						},
					},
				},
				plugins: {
					legend: { display: false },
					zoom: zoomOptions,
					tooltip: {
						callbacks: {
							title: (items) => {
								const x = (items[0]!.raw as { x: number }).x;
								if (x === 0) return "Spot on";
								return x < 0
									? `${Math.abs(x)} too low (underestimated)`
									: `${x} too high (overestimated)`;
							},
							label: (item) => `Rounds: ${item.parsed.y.toLocaleString()}`,
						},
					},
				},
			},
		});
	}

	private renderRuleUsage() {
		const ctx = this.canvas("chart-rules-usage");
		if (!ctx) return;

		const completedGames = this.games.filter((g) => !g.isActive);
		if (completedGames.length === 0) return;

		const rules = [
			{ key: "rule_1", label: "+-1 Rule" },
			{ key: "rule_random_dealer", label: "Random Dealer" },
			{ key: "rule_expansion", label: "Expansion" },
			{ key: "rule_custom_rounds", label: "Custom Rounds" },
			{ key: "rule_altcount", label: "Alt Count" },
			{ key: "rule_blindentry", label: "Blind Entry" },
			{ key: "rule_fullblind", label: "Full Blind" },
		] as const;

		const counts = rules.map((rule) =>
			completedGames.reduce((acc, game) => {
				const gameWithRules = game as unknown as Record<string, unknown>;
				return gameWithRules[rule.key] === true ? acc + 1 : acc;
			}, 0),
		);

		const total = completedGames.length;
		const order = counts
			.map((_, i) => i)
			.sort((a, b) => counts[b]! - counts[a]!);

		const labels = order.map((i) => rules[i]!.label);
		const values = order.map((i) => counts[i]!);

		this.swap("rules", ctx, {
			type: "bar",
			data: {
				labels,
				datasets: [
					{
						label: "Games with Rule Enabled",
						data: values,
						backgroundColor: labels.map((_, i) => PALETTE[i % PALETTE.length]!),
						borderRadius: 4,
					},
				],
			},
			plugins: [
				crosshair,
				valueLabels((v) => `${v} (${((v / total) * 100).toFixed(1)}%)`),
			],
			options: {
				...BASE_OPTIONS,
				plugins: {
					legend: { display: false },
					tooltip: {
						callbacks: {
							label: (item) =>
								`${item.parsed.y} games (${((item.parsed.y / total) * 100).toFixed(1)}%)`,
						},
					},
				},
			},
		});
	}
}
