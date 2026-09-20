export type Granularity = "day" | "week" | "month";

/** Start of the day / ISO week (Monday) / month containing `time`. */
export const startOfBucket = (time: number, g: Granularity): Date => {
	const d = new Date(time);
	d.setHours(0, 0, 0, 0);
	if (g === "week") d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
	if (g === "month") d.setDate(1);
	return d;
};

export const nextBucket = (d: Date, g: Granularity): Date => {
	const n = new Date(d);
	if (g === "month") n.setMonth(n.getMonth() + 1);
	else n.setDate(n.getDate() + (g === "week" ? 7 : 1));
	return n;
};

export const bucketKey = (d: Date, g: Granularity): string => {
	const pad = (n: number) => n.toString().padStart(2, "0");
	const stem = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
	return g === "month" ? stem : `${stem}-${pad(d.getDate())}`;
};

/** Every bucket key from `from` to `to` inclusive, gaps included. */
export const bucketRange = (from: number, to: number, g: Granularity): string[] => {
	const keys: string[] = [];
	const last = startOfBucket(to, g);
	for (let d = startOfBucket(from, g); d <= last; d = nextBucket(d, g)) {
		keys.push(bucketKey(d, g));
	}
	return keys;
};
