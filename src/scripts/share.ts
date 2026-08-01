import { GameData } from "./game/gamedata.ts";
import QRCode from "qrcode";
import { SyncManager } from "./sync.ts";
import { Logger } from "./logger.ts";

function showError(msg: any) {
	const loadingElement = document.getElementById("loading");
	const startElement = document.getElementById("start");
	const errorElement = document.getElementById("error");
	const errorcodeElement = document.getElementById("errorcode");

	if (loadingElement) loadingElement.classList.add("hidden");
	if (startElement) startElement.classList.add("hidden");
	if (errorElement) errorElement.classList.remove("hidden");
	if (errorcodeElement) errorcodeElement.textContent = String(msg);
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

function goBack() {
	if (window.history.length > 1 && document.referrer) {
		window.history.back();
	} else {
		const isDe = localStorage.getItem("lang") === "de";
		window.location.href = isDe ? "/de/" : "/";
	}
}

function copyToClipboard(button: HTMLElement | null) {
	if (!button) return;
	navigator.clipboard.writeText(window.location.href).then(() => {
		const originalHTML = button.innerHTML;
		button.innerHTML = `<span class="text-success font-bold">Copied!</span>`;
		setTimeout(() => {
			button.innerHTML = originalHTML;
		}, 2000);
	}).catch((err) => {
		Logger.error("Failed to copy URL", { error: err });
	});
}

function setupShareModal() {
	const qrModalCanvas = document.getElementById("qr_modal_canvas") as HTMLCanvasElement | null;
	const shareBtn = document.getElementById("share-btn");
	const qrModal = document.getElementById("qr_modal") as HTMLDialogElement | null;

	if (qrModalCanvas) {
		QRCode.toCanvas(qrModalCanvas, window.location.href, { width: 260, margin: 2 })
			.then(() => Logger.debug("Modal QR generated"))
			.catch((err) => Logger.error("Modal QR generation failed", { error: err?.message }));
	}

	const openModal = () => {
		if (qrModal) {
			if (typeof qrModal.showModal === "function") {
				qrModal.showModal();
			} else {
				qrModal.open = true;
			}
		}
	};

	shareBtn?.addEventListener("click", openModal);

	const qrModalCopyBtn = document.getElementById("qr_modal_copy");
	qrModalCopyBtn?.addEventListener("click", () => copyToClipboard(qrModalCopyBtn));

	const nativeShareBtn = document.getElementById("native-share");
	if (nativeShareBtn && typeof navigator.share === "function") {
		nativeShareBtn.classList.remove("hidden");
		nativeShareBtn.addEventListener("click", () => {
			navigator.share({
				title: "Wizard Game",
				url: window.location.href,
			}).catch(() => { });
		});
	}
}

// Read game ID from URL
const gameId = new URLSearchParams(window.location.search).get("id");

if (gameId === null) {
	showError("Not a valid share link");
} else {
	SyncManager.load(gameId)
		.then(async (result) => {
			if (Array.isArray(result)) {
				// Status 210: List of games
				Logger.info("Importing multiple games", { count: result.length });

				for (const id of result) {
					if (gameExists(id)) continue;
					try {
						const game = await SyncManager.load(id);
						if (game instanceof GameData) {
							game.isActive = false;
							game.save();
						}
					} catch (e) {
						Logger.error("Failed to import game from list", { id, error: e });
					}
				}

				// Open history page directly
				const isDe = localStorage.getItem("lang") === "de";
				window.location.href = isDe ? "/de/history" : "/history";
			} else {
				// Single game
				const game = result as GameData;
				const loadingElement = document.getElementById("loading");
				const startElement = document.getElementById("start");
				if (loadingElement) loadingElement.classList.add("hidden");
				if (startElement) startElement.classList.remove("hidden");

				try {
					const players = game.getPlayers();
					const timeStarted = game.getTimeStarted();
					const timeEnded = game.getTimeEnded();
					const timeDiffMinutes = Math.floor((timeEnded - timeStarted) / 60000);

					const date = new Date(timeEnded);
					const day = date.getDate();
					const month = date.toLocaleString("default", { month: "short" });
					const year = date.getFullYear();
					const dateString = `${day}. ${month} ${year}`;

					const dateElement = document.getElementById("date");
					const durationElement = document.getElementById("duration");
					if (dateElement) dateElement.textContent = dateString;
					if (durationElement) durationElement.textContent = `${timeDiffMinutes} Minutes`;

					const score = game.getScore();
					const lastRow = score[score.length - 1] || [];
					const playerStats = players.map((name, idx) => ({
						name,
						points: lastRow[idx] ?? 0,
						position: 1,
					}));

					// Sort by points descending
					playerStats.sort((a, b) => b.points - a.points);

					// Assign positions (ties get same position)
					for (let i = 0; i < playerStats.length; i++) {
						if (i > 0 && playerStats[i].points === playerStats[i - 1].points) {
							playerStats[i].position = playerStats[i - 1].position;
						} else {
							playerStats[i].position = i + 1;
						}
					}

					// Populate leaderboard table
					const importTable = document.getElementById("import_table");
					if (importTable) {
						importTable.innerHTML = "";
						playerStats.forEach((p) => {
							const row = document.createElement("tr");

							const posCell = document.createElement("th");
							posCell.className = "text-center font-bold";
							if (p.position === 1) {
								posCell.innerHTML = `<span class="badge badge-secondary badge-sm">1</span>`;
							} else {
								posCell.textContent = p.position.toString();
							}
							row.appendChild(posCell);

							const nameCell = document.createElement("td");
							nameCell.className = "text-left font-medium";
							nameCell.textContent = p.name;
							row.appendChild(nameCell);

							const pointsCell = document.createElement("td");
							pointsCell.className = "text-right font-bold";
							pointsCell.textContent = p.points.toString();
							row.appendChild(pointsCell);

							if (p.position === 1) {
								row.classList.add("bg-primary/10");
							}

							importTable.appendChild(row);
						});
					}

					// "View Game" Button handler
					const viewGameButton = document.getElementById("view-game");
					if (viewGameButton) {
						viewGameButton.addEventListener("click", () => {
							if (!gameExists(game.id!)) {
								game.isActive = false;
								game.save();
								Logger.info("Game saved to local storage", { id: game.id });
							}
							window.location.href = `/history?id=${encodeURIComponent(gameId)}`;
						});
					}
				} catch (e) {
					showError("Invalid game data: " + e);
				}
			}
		})
		.catch((err) => {
			showError(err.message || "Failed to load game");
		});

	setupShareModal();
}

// Global button handlers
document.addEventListener("DOMContentLoaded", () => {
	// Top left back button
	const tlBtn = document.getElementById("tlbtn");
	tlBtn?.addEventListener("click", goBack);

	// Error view back button
	const errorBackBtn = document.getElementById("error_back_btn");
	errorBackBtn?.addEventListener("click", goBack);
});
