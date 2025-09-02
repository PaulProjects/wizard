/*
 Centralized logging utility for the Wizard app
 - Uniform log formatting
 - Easy to toggle levels
 - Single place to extend with external sinks (e.g., analytics)
*/

export type LogLevel = "debug" | "info" | "warn" | "error";

type LogPayload = Record<string, unknown> | undefined;

function nowISO() {
	try {
		return new Date().toISOString();
	} catch {
		return "";
	}
}

function safeStringify(value: unknown, maxLen = 5000): string {
	try {
		const seen = new WeakSet();
		const str = JSON.stringify(value, (_k, v) => {
			if (typeof v === "object" && v !== null) {
				if (seen.has(v as object)) return "[Circular]";
				seen.add(v as object);
			}
			if (typeof v === "string" && v.length > 500) {
				return v.slice(0, 500) + `...(${v.length - 500} more)`;
			}
			return v;
		});
		return str.length > maxLen
			? str.slice(0, maxLen) + `...(${str.length - maxLen} more)`
			: str;
	} catch {
		return "[Unserializable]";
	}
}

export class Logger {
	// Default level: debug in dev, info in prod
	private static levelOrder: Record<LogLevel, number> = {
		debug: 10,
		info: 20,
		warn: 30,
		error: 40,
	};

	private static currentLevel: LogLevel =
		typeof import.meta !== "undefined" &&
		(import.meta as any).env &&
		!(import.meta as any).env.PROD
			? "debug"
			: "info";

	static setLevel(level: LogLevel) {
		this.currentLevel = level;
	}

	private static enabled(level: LogLevel) {
		return this.levelOrder[level] >= this.levelOrder[this.currentLevel];
	}

	private static baseFields() {
		return {
			ts: nowISO(),
			path: typeof window !== "undefined" ? window.location.pathname : "",
		};
	}

	private static emit(
		level: LogLevel,
		message: string,
		payload?: LogPayload
	) {
		if (!this.enabled(level)) return;
		const entry = {
			app: "wizard",
			level,
			message,
			...this.baseFields(),
			...(payload ? { context: payload } : {}),
		};

		// Console sink
		const formatted = `[wizard][${level.toUpperCase()}] ${message}`;
		const ctx = payload ? JSON.parse(safeStringify(payload)) : undefined;
		if (level === "error") {
			// Prefer console.error to mark in DevTools
			// @ts-ignore
			console.error(formatted, ctx ?? "");
		} else if (level === "warn") {
			console.warn(formatted, ctx ?? "");
		} else if (level === "info") {
			console.info(formatted, ctx ?? "");
		} else {
			console.debug(formatted, ctx ?? "");
		}

		// Extension point: forward to external trackers here if desired
		// Example:
		// (window as any)?.tracker?.event?.(message, payload);
		return entry;
	}

	static debug(message: string, payload?: LogPayload) {
		this.emit("debug", message, payload);
	}
	static info(message: string, payload?: LogPayload) {
		this.emit("info", message, payload);
	}
	static warn(message: string, payload?: LogPayload) {
		this.emit("warn", message, payload);
	}
	static error(message: string, payload?: LogPayload) {
		this.emit("error", message, payload);
	}

	// Event helper to keep a consistent naming convention
	static event(name: string, payload?: LogPayload) {
		this.info(`event:${name}`, payload);
	}
}

// Optional: expose globally for inline HTML handlers or external scripts
try {
	if (typeof window !== "undefined") {
		(window as any).wizardLogger = Logger;
	}
} catch {}
