import { GameData } from "./game/gamedata.ts";
import QRCode from "qrcode";
import { SyncManager } from "./sync.ts";
import { Logger } from "./logger.ts";

function error(error: any) {
	document.getElementById("loading").classList.add("hidden");
	document.getElementById("start").classList.add("hidden");
	document.getElementById("error").classList.remove("hidden");
	document.getElementById("errorcode").textContent = error;
}
function success(msg: string) {
	document.getElementById("loading").classList.add("hidden");
	document.getElementById("start").classList.add("hidden");
	document.getElementById("success_message").textContent =
		msg || "The game has been imported successfully.";
	document.getElementById("success").classList.remove("hidden");
}

function gameExists(id: string): boolean {
	try {
		const stored = localStorage.getItem("wizard.games");
		if (!stored) return false;
		const games = JSON.parse(stored);
		return games.some((g: any) => g.id === id);
	} catch {
		return false;
	}
}

//read the game id from the url
const gameId = new URLSearchParams(window.location.search).get("id");

if (gameId === null) {
	error("Not a valid link");
} else {
	const importIdElement = document.getElementById("import_id");
	if (importIdElement) {
		importIdElement.textContent = "Game id: " + gameId;
	}

	SyncManager.load(gameId)
		.then(async (result) => {
			if (Array.isArray(result)) {
				// Status 210: List of games
				Logger.info("Importing multiple games", {
					count: result.length,
				});
				let importedCount = 0;

				for (const id of result) {
					if (gameExists(id)) {
						Logger.info("Game already exists, skipping", { id });
						continue;
					}
					try {
						const game = await SyncManager.load(id);
						if (game instanceof GameData) {
							game.isActive = false;
							game.save();
							importedCount++;
							Logger.info("Imported game", { id });
						}
					} catch (e) {
						Logger.error("Failed to import individual game", {
							id,
							error: e,
						});
					}
				}
				success(
					`${importedCount} games have been imported successfully.`
				);
			} else {
				// Single game
				const game = result as GameData;
				const loadingElement = document.getElementById("loading");
				const startElement = document.getElementById("start");
				if (loadingElement) loadingElement.classList.add("hidden");
				if (startElement) startElement.classList.remove("hidden");

				try {
					Logger.debug("Imported game json", { game });

					let players = game.getPlayers();

					let time_started = game.getTimeStarted();
					Logger.debug("Game time started", { time_started });
					let time_ended = game.getTimeEnded();
					Logger.debug("Game time ended", { time_ended });
					let time_diff = time_ended - time_started;
					let time_diff_minutes = Math.floor(time_diff / 60000);

					//Extract date from time_ended
					let date = new Date(time_ended);
					let day = date.getDate();
					//write month as string
					let month = date.toLocaleString("default", {
						month: "short",
					});
					let year = date.getFullYear();
					let date_string = `${day}.${month}.${year}`;

					const dateElement = document.getElementById("date");
					const durationElement = document.getElementById("duration");
					if (dateElement) dateElement.textContent = date_string;
					if (durationElement)
						durationElement.textContent =
							time_diff_minutes + " Minutes";

					let score = game.getScore();
					//extract last row of score
					let last_row = score[score.length - 1];
					//create a new array with the players and their points
					let p_s = [];
					for (let j = 0; j < players.length; j++) {
						p_s.push({
							name: players[j],
							points: last_row[j],
						});
					}

					//sort by points
					p_s.sort((a, b) => {
						return b.points - a.points;
					});

					//give them a position number, two players with the same points will have the same position
					for (let j = 0; j < p_s.length; j++) {
						if (j > 0) {
							if (p_s[j].points === p_s[j - 1].points) {
								p_s[j].position = p_s[j - 1].position;
							} else {
								p_s[j].position = j + 1;
							}
						} else {
							p_s[j].position = j + 1;
						}
					}

					// loop through players and add them to the table
					const importTable = document.getElementById("import_table");
					if (importTable) {
						// clear existing if any
						importTable.innerHTML = "";
						for (let j = 0; j < p_s.length; j++) {
							const row = document.createElement("tr");

							const positionCell = document.createElement("th");
							positionCell.textContent =
								p_s[j].position.toString();
							row.appendChild(positionCell);

							const nameCell = document.createElement("td");
							nameCell.textContent = p_s[j].name;
							row.appendChild(nameCell);

							const pointsCell = document.createElement("td");
							pointsCell.textContent = p_s[j].points.toString();
							row.appendChild(pointsCell);

							if (importTable) importTable.appendChild(row);

							if (j === 0) row.classList.add("bg-info");
						}
					}

					const importGameButton =
						document.getElementById("import-game");
					if (importGameButton) {
						importGameButton.addEventListener("click", function () {
							if (!gameExists(game.id!)) {
								game.isActive = false;
								game.save();
							} else {
								Logger.info("Game already exists", {
									id: game.id,
								});
							}

							const viewGameLink = document.getElementById(
								"view_game"
							) as HTMLAnchorElement;
							if (viewGameLink)
								viewGameLink.href = "/history?id=" + gameId;
							success("The game has been imported successfully");
						});
					}
				} catch (e) {
					error("Invalid game data" + e);
				}
			}
		})
		.catch((err) => {
			error(err.message);
		});

	QRCode.toCanvas(document.getElementById("qr_canvas"), window.location.href)
		.then((url) => {
			Logger.debug("QR generated");
		})
		.catch((err) => {
			Logger.error("QR generation failed", { error: err?.message });
		});

	document.getElementById("copy-url").addEventListener("click", function () {
		navigator.clipboard.writeText(window.location.href);
	});
}

document.addEventListener("DOMContentLoaded", () => {
	document.querySelectorAll('a[href="/"]').forEach((link) => {
		(link as HTMLAnchorElement).href = localStorage.getItem("lang") === "de" ? "/de/" : "/";
	});
});
