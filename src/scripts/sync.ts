import { GameData } from "./game/gamedata";
import { Logger } from "./logger";

type SyncProgress = {
	phase: "pushing" | "pulling" | "importing" | "waiting" | "done";
	processed: number;
	total: number;
	message: string;
	waitMs?: number;
};

export class SyncManager {
	private static readonly SERVER_URL =
		"https://s.paulbertram.de/wizardsync.php";
	private static readonly RETRY_INTERVAL = 30000; // 30 seconds
	private static readonly MAX_RATE_LIMIT_RETRIES = 2;
	private static readonly SERVER_ID_REGEX = /^[a-f0-9]{13}$/;

	private static get syncCode(): string | null {
		return localStorage.getItem("wizard.synccode");
	}

	// Check if ID is a standard UUID (v4) which implies it's local-only
	private static isLocalId(id: string): boolean {
		return id.length > 20 && id.includes("-");
	}

	private static isServerId(id: string): boolean {
		return this.SERVER_ID_REGEX.test(id);
	}

	private static async wait(ms: number): Promise<void> {
		await new Promise((resolve) => setTimeout(resolve, ms));
	}

	private static getRetryAfterMs(response: Response): number {
		const header = response.headers.get("Retry-After");
		if (!header) {
			return this.RETRY_INTERVAL;
		}

		const seconds = Number.parseInt(header, 10);
		if (!Number.isNaN(seconds) && seconds > 0) {
			return seconds * 1000;
		}

		return this.RETRY_INTERVAL;
	}

	private static async fetchWithRateLimitRetry(
		url: string,
		init?: RequestInit,
		onWait?: (waitMs: number) => void
	): Promise<Response> {
		let lastResponse: Response | null = null;

		for (let attempt = 0; attempt <= this.MAX_RATE_LIMIT_RETRIES; attempt++) {
			const response = await fetch(url, init);
			lastResponse = response;

			if (response.status !== 429) {
				return response;
			}

			if (attempt === this.MAX_RATE_LIMIT_RETRIES) {
				return response;
			}

			const waitMs = this.getRetryAfterMs(response);
			onWait?.(waitMs);
			await this.wait(waitMs);
		}

		return lastResponse as Response;
	}

	public static async sync(game: GameData): Promise<void> {
		if (!navigator.onLine) {
			game.isSynced = false;
			game.save();
			return;
		}

		try {
			if (!game.id || SyncManager.isLocalId(game.id)) {
				await this.create(game);
			} else {
				await this.update(game);
			}
		} catch (error) {
			console.warn("Sync failed:", error);
			game.isSynced = false;
			game.save();
		}
	}

	private static async create(game: GameData): Promise<void> {
		const gameJson = GameData.toJsonString(game);
		const formData = new URLSearchParams();
		formData.append("game", gameJson);
		const code = this.syncCode;
		if (code) {
			formData.append("sync_code", code);
		}

		const response = await this.fetchWithRateLimitRetry(this.SERVER_URL, {
			method: "POST",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Server error: ${response.status}`);
		}

		const newId = await response.text();
		if (newId) {
			const oldId = game.id;
			game.id = newId;
			game.isSynced = true;

			this.swapIdInStorage(oldId, newId, game);

			Logger.info("Game created on server", { oldId, newId });
		}
	}

	private static async update(game: GameData): Promise<void> {
		const gameJson = GameData.toJsonString(game);
		const formData = new URLSearchParams();
		formData.append("id", game.id!);
		formData.append("game", gameJson);
		const code = this.syncCode;
		if (code) {
			formData.append("sync_code", code);
		}

		const response = await this.fetchWithRateLimitRetry(this.SERVER_URL, {
			method: "PUT",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Server error: ${response.status}`);
		}

		game.isSynced = true;
		// Just save to update isSynced flag
		game.save();
		Logger.info("Game updated on server", { id: game.id });
	}

	private static async linkGameToSyncCode(gameIds: string[], code: string): Promise<void> {
		if (gameIds.length === 0) {
			return;
		}

		const formData = new URLSearchParams();
		formData.append("action", "link_games");
		formData.append("sync_code", code);
		gameIds.forEach((id) => formData.append("ids[]", id));

		const response = await this.fetchWithRateLimitRetry(this.SERVER_URL, {
			method: "PUT",
			headers: {
				"Content-Type": "application/x-www-form-urlencoded",
			},
			body: formData,
		});

		if (!response.ok) {
			throw new Error(`Link error: ${response.status}`);
		}
	}

	public static async load(id: string): Promise<GameData | string[]> {
		let response = await this.fetchWithRateLimitRetry(
			`${this.SERVER_URL}?id=${encodeURIComponent(id)}`
		);

		if (response.status === 404) {
			response = await this.fetchWithRateLimitRetry(
				`${this.SERVER_URL}?action=sync_games&code=${encodeURIComponent(id)}`
			);
		}

		if (!response.ok && response.status !== 210) {
			throw new Error(`Load error: ${response.status}`);
		}

		const json = await response.json();

		if (response.status === 210) {
			return json; // Returns array of game IDs
		}

		const game = GameData.fromJson(json);
		game.id = id;
		game.isSynced = true;
		Logger.info("Game loaded from server", { id });
		return game;
	}

	public static async delete(id: string): Promise<void> {
		const url = `${this.SERVER_URL}?id=${id}`;
		await fetch(url, { method: "DELETE" });
	}

	public static async generateSyncCode(): Promise<string> {
		const response = await this.fetchWithRateLimitRetry(
			`${this.SERVER_URL}?action=generate_sync_code`
		);
		if (response.ok) {
			return await response.text();
		}
		const errorText = await response.text();
		throw new Error(errorText || "Could not generate sync code from server");
	}

	public static async maybeAutoAssignSyncCode(): Promise<void> {
		if (!this.syncCode) {
			const gamesStr = localStorage.getItem("wizard.games") || "[]";
			const games = JSON.parse(gamesStr);
			if (games.length > 0) {
				try {
					const code = await this.generateSyncCode();
					localStorage.setItem("wizard.synccode", code);
					// trigger a sync operation for existing games implicitly
					await this.syncAccount(code);
				} catch (e) {
					console.error("Auto sync failed", e);
				}
			}
		}
	}

	public static async syncAccount(
		code: string,
		onProgress?: (progress: SyncProgress) => void
	): Promise<void> {
		localStorage.setItem("wizard.synccode", code);

		const serverListResponse = await this.fetchWithRateLimitRetry(
			`${this.SERVER_URL}?action=sync_games&code=${encodeURIComponent(code)}`,
			undefined,
			(waitMs) => {
				onProgress?.({
					phase: "waiting",
					processed: 0,
					total: 1,
					message: `Rate limited. Waiting ${Math.ceil(waitMs / 1000)}s before retry...`,
					waitMs,
				});
			}
		);
		if (!serverListResponse.ok && serverListResponse.status !== 210) {
			const errorText = await serverListResponse.text();
			throw new Error(
				errorText || `Sync account failed: ${serverListResponse.status}`
			);
		}
		const serverGameIds = (await serverListResponse.json()) as string[];
		const serverGameIdSet = new Set(serverGameIds);

		const stored = localStorage.getItem("wizard.games") || "[]";
		const games = JSON.parse(stored) as Array<Record<string, unknown>>;
		const localMissingGames = games.filter((gameObj) => {
			const id = typeof gameObj.id === "string" ? gameObj.id : undefined;
			return !id || !serverGameIdSet.has(id);
		});
		const localPushTotal = localMissingGames.length;
		let localPushed = 0;

		onProgress?.({
			phase: "pushing",
			processed: 0,
			total: localPushTotal,
			message:
				localPushTotal > 0
					? `Submitting local-only games (0/${localPushTotal})...`
					: "No local-only games to submit.",
		});
		
		// Separate games into those that need linking (already have server IDs) and those that need creation
		const gameIdsToLink: string[] = [];
		const gamesToCreate: GameData[] = [];

		for (const gameObj of localMissingGames) {
			const game = GameData.fromJson(gameObj);
			if (game.id && this.isServerId(game.id)) {
				gameIdsToLink.push(game.id);
			} else {
				gamesToCreate.push(game);
			}
		}

		// Link all server-ID games in a batch request
		if (gameIdsToLink.length > 0) {
			await this.linkGameToSyncCode(gameIdsToLink, code);
			localPushed += gameIdsToLink.length;
			onProgress?.({
				phase: "pushing",
				processed: localPushed,
				total: localPushTotal,
				message: `Submitting local-only games (${localPushed}/${localPushTotal})...`,
			});
		}

		// Create new games individually
		for (const game of gamesToCreate) {
			await this.create(game);
			localPushed++;
			onProgress?.({
				phase: "pushing",
				processed: localPushed,
				total: localPushTotal,
				message: `Submitting local-only games (${localPushed}/${localPushTotal})...`,
			});
		}

		const updatedStored = localStorage.getItem("wizard.games") || "[]";
		const updatedGames = JSON.parse(updatedStored) as Array<{ id?: string }>;
		const localGameIds = new Set(updatedGames.map((g) => g.id).filter(Boolean));
		const idsToImport = serverGameIds.filter((id) => !localGameIds.has(id));
		let imported = 0;

		onProgress?.({
			phase: "pulling",
			processed: 0,
			total: idsToImport.length,
			message:
				idsToImport.length > 0
					? `Importing remote games (0/${idsToImport.length})...`
					: "No new remote games to import.",
		});

		for (const id of idsToImport) {
			try {
				const fetched = await this.load(id);
				if (fetched instanceof GameData) {
					fetched.save();
				}
			} catch (e) {
				console.error("Failed to fetch game:", id, e);
			}

			imported++;
			onProgress?.({
				phase: "importing",
				processed: imported,
				total: idsToImport.length,
				message: `Importing remote games (${imported}/${idsToImport.length})...`,
			});
		}

		onProgress?.({
			phase: "done",
			processed: 1,
			total: 1,
			message: "Sync complete.",
		});
	}

	private static swapIdInStorage(
		oldId: string | undefined,
		newId: string,
		game: GameData
	) {
		// Update the active game pointer if necessary
		const activeId = localStorage.getItem("wizard.activegame");
		if (activeId === oldId) {
			localStorage.setItem("wizard.activegame", newId);
		}

		// Update the game in the list
		try {
			const stored = localStorage.getItem("wizard.games");
			if (stored) {
				const games = JSON.parse(stored);
				const index = games.findIndex((g: any) => g.id === oldId);

				// Ensure we save the updated game state (with new ID)
				const gameState = GameData.toJsonObject(game);

				if (index !== -1) {
					games[index] = gameState;
				} else {
					games.push(gameState);
				}
                Logger.info("Swapping game ID in storage", { oldId, newId });
				localStorage.setItem("wizard.games", JSON.stringify(games));
			}
		} catch (e) {
			console.error("Storage swap failed", e);
		}
	}
}
