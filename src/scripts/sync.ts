import { GameData } from "./game/gamedata";
import { Logger } from "./logger";

export class SyncManager {
	private static readonly SERVER_URL =
		"https://s.paulbertram.de/wizardshare.php";
	private static readonly RETRY_INTERVAL = 30000; // 30 seconds

	// Check if ID is a standard UUID (v4) which implies it's local-only
	private static isLocalId(id: string): boolean {
		return id.length > 20 && id.includes("-");
	}

	public static async sync(game: GameData): Promise<void> {
		if (!navigator.onLine) {
			game.isSynced = false;
			game.save();
			return;
		}

		try {
			// Decide whether to create or update based on ID format
			// If ID is undefined, or looks like a UUID, we create (POST)
			// If ID is short (uniqid from server), we update (PUT)
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

		const response = await fetch(this.SERVER_URL, {
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
			// Remove old local ID game from storage if it exists (by ID key logic)
			// But here we are just changing the ID property of the object
			// The GameData.save() method handles updating the array in localStorage
			// However, we might end up with duplicate logical games if we are not careful
			// Actually GameData.save checks index by ID.
			// If we change ID, we need to handle the swap carefully.

			const oldId = game.id;
			game.id = newId;
			game.isSynced = true;

			// We need a special save method or handle the swap
			// Let's manually swap in localStorage to avoid duplicates
			this.swapIdInStorage(oldId, newId, game);

			Logger.info("Game created on server", { oldId, newId });
		}
	}

	private static async update(game: GameData): Promise<void> {
		const gameJson = GameData.toJsonString(game);
		const formData = new URLSearchParams();
		formData.append("id", game.id!);
		formData.append("game", gameJson);

		const response = await fetch(this.SERVER_URL, {
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

	public static async load(id: string): Promise<GameData | string[]> {
		const url = `${this.SERVER_URL}?id=${id}`;
		const response = await fetch(url);

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
