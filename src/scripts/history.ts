import { updatescore, score_switch_view } from "./score.ts";
import { GameData as gamedata } from "./game/gamedata.ts";
import { HistoryAnalyticsUI } from "./history-analytics-ui.ts";
import { GameAnalyticsUI } from "./game-analytics-ui.ts";
import { Logger } from "./logger.ts";
import { SyncManager } from "./sync.ts";

import confetti from "canvas-confetti";

let view = 0; //0 = overview ; 1 = details

type SortOption = "date-desc" | "date-asc" | "duration-desc" | "duration-asc" | "players-desc" | "players-asc";
type FilterOption = "completed" | "active" | "all"; 

const DEFAULT_SORT: SortOption = "date-desc";
const DEFAULT_FILTER: FilterOption = "completed";
const VALID_SORT_OPTIONS: SortOption[] = [
	"date-desc",
	"date-asc",
	"duration-desc",
	"duration-asc",
	"players-desc",
	"players-asc",
];
const VALID_FILTER_OPTIONS: FilterOption[] = ["completed", "active", "all"];

let currentSort: SortOption = DEFAULT_SORT;
let currentFilter: FilterOption = DEFAULT_FILTER;
let currentSearch = "";

const OLD_ACTIVE_GAME_LIMIT_MS = 180 * 60 * 60 * 1000;
const FALLBACK_ENDED_DURATION_MS = 90 * 60 * 1000;

function getThreeMonthsAgoTimestamp(): number {
	const cutoff = new Date();
	cutoff.setMonth(cutoff.getMonth() - 3);
	return cutoff.getTime();
}

function applyListStateFromUrl() {
	const params = new URLSearchParams(window.location.search);
	const sort = params.get("sort");
	const filter = params.get("filter");
	const search = params.get("search");

	currentSort = VALID_SORT_OPTIONS.includes(sort as SortOption)
		? (sort as SortOption)
		: DEFAULT_SORT;
	currentFilter = VALID_FILTER_OPTIONS.includes(filter as FilterOption)
		? (filter as FilterOption)
		: DEFAULT_FILTER;
	currentSearch = search ?? "";
}

function writeListStateToUrl(options?: { push?: boolean }) {
	const url = new URL(window.location.href);

	if (currentSearch.trim()) url.searchParams.set("search", currentSearch);
	else url.searchParams.delete("search");

	if (currentSort !== DEFAULT_SORT) url.searchParams.set("sort", currentSort);
	else url.searchParams.delete("sort");

	if (currentFilter !== DEFAULT_FILTER)
		url.searchParams.set("filter", currentFilter);
	else url.searchParams.delete("filter");

	if (options?.push) {
		history.pushState({}, "", url);
	} else {
		history.replaceState({}, "", url);
	}
}

applyListStateFromUrl();

// Load all games
let allGames: gamedata[] = [];
let skippedGames: any[] = [];

try {
	const stored = localStorage.getItem("wizard.games");
	if (stored) {
		const rawGames = JSON.parse(stored);
		
		for (let i = 0; i < rawGames.length; i++) {
			try {
				const game = gamedata.fromJson(rawGames[i]);
				
				// check if it has a id else try to upload it
				if (!game.hasID()) {
					Logger.info("No id found, trying to upload", { game });

					SyncManager.sync(game)
						.then(() => {
							Logger.info("Success uploading", { id: game.getID() });
						})
						.catch((error) => {
							Logger.error("Error uploading game", {
								error: error?.message,
							});
						});
				}

				allGames.push(game);
			} catch (error) {
				Logger.error(`Failed to load game at index ${i}`, {
					error: (error as Error)?.message,
					data: rawGames[i],
				});

				skippedGames.push({
					index: i,
					data: rawGames[i],
					error: (error as Error).message,
				});
			}
		}
	}
} catch (e) {
	console.error("Failed to load games", e);
}

if (allGames.length === 0) {
	location.href = "/";
}

// Log information about skipped games
if (skippedGames.length > 0) {
	Logger.warn(`Skipped ${skippedGames.length} corrupted games`, {
		skippedGames,
	});
    
    const notification = document.createElement("div");
	notification.className = "alert alert-warning mt-4 max-w-4xl";
	notification.innerHTML = `
      <div class="flex-1">
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6 inline-block mr-2" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.186-.833-2.956 0L3.858 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <span>Warning: ${skippedGames.length} corrupted game(s) were skipped.</span>
      </div>
      <button class="btn btn-sm">Copy Debug Info</button>`;

	const btn = notification.querySelector("button");
	if (btn) {
		btn.addEventListener("click", () => {
			navigator.clipboard
				.writeText(JSON.stringify(skippedGames, null, 2))
				.then(() => {
					const originalText = btn.innerText;
					btn.innerText = "Copied!";
					setTimeout(() => (btn.innerText = originalText), 2000);
				})
				.catch((err) => {
					console.error("Failed to copy debug info:", err);
					btn.innerText = "Error!";
				});
		});
	}

	const pastGamesElement = document.getElementById("past_games");
	if (pastGamesElement) pastGamesElement.prepend(notification);
}

// Render Loop
function renderGames() {
    const listContainer = document.getElementById("past_games_list");
    if (!listContainer) return;

    listContainer.innerHTML = "";

    let displayedGames = allGames.filter((g) => {
        const isActive = g.isActive;
        const players = g.getPlayers();
        
        switch (currentFilter) {
            case "completed":
                if (isActive) return false;
                break;
            case "active":
                if (!isActive) return false;
                break;
            case "all":
                break;
        }
        
        if (currentSearch) {
            const term = currentSearch.toLowerCase();
            // Search in players
            if (players.some(p => p.toLowerCase().includes(term))) return true;
			// Search in date string
			const date = new Date(g.getTimeStarted());
			const dateStr = date.toLocaleDateString().toLowerCase(); 
            // Also try format used in card: DD.MMM.YYYY
            const day = date.getDate();
		    const month = date.toLocaleString("default", { month: "short" }).toLowerCase();
		    const year = date.getFullYear();
            if (`${day}.${month}.${year}`.toLowerCase().includes(term)) return true;
            if (dateStr.includes(term)) return true;

            return false;
        }
        return true;
    });

    // Sorting
    displayedGames.sort((a, b) => {
        // Duration helper: active/undefined games get -1 duration
        const getDur = (g: gamedata) => {
            const e = g.getTimeEnded();
            if (!e) return -1;
            return e - g.getTimeStarted();
        };

        switch (currentSort) {
            case "date-desc":
                return b.getTimeStarted() - a.getTimeStarted();
            case "date-asc":
                return a.getTimeStarted() - b.getTimeStarted();
            case "duration-desc":
                return getDur(b) - getDur(a);
            case "duration-asc":
                return getDur(a) - getDur(b);
            case "players-desc":
                return b.getPlayers().length - a.getPlayers().length;
            case "players-asc":
                return a.getPlayers().length - b.getPlayers().length;
            default:
                return b.getTimeStarted() - a.getTimeStarted();
        }
    });

    displayedGames.forEach(game => {
        const gameId = game.getID();
        const players = game.getPlayers();
		const time_started = game.getTimeStarted();
		const time_ended = game.getTimeEnded();
		const time_diff = time_ended ? (time_ended - time_started) : 0;
		const time_diff_minutes = Math.floor(time_diff / 60000);
        const isActive = game.isActive;

		//Extract date from time_started
		let date = new Date(time_started);
		let day = date.getDate();
		let month = date.toLocaleString("default", { month: "short" });
		let year = date.getFullYear();
		let date_string = `${day}.${month}.${year}`;

		const card = document.createElement("div");
		card.className = `card mt-10 bg-base-200 w-full ${isActive ? 'border-2 border-primary' : ''}`;
        	
		// Sanitize ID for DOM usage if needed, but assuming ID is safeish
		card.id = `card-${gameId}`; 
		card.innerHTML = `
            <div class="w-full h-full">
              <div class="flex justify-between items-center pl-3 pt-3 pr-3">
								 <span class="inline-block font-bold">${date_string}</span>
								 <div class="flex items-center gap-2">
									 ${isActive ? '<span class="badge badge-primary">Active</span>' : ''}
									 ${
						!isActive && !isNaN(time_diff_minutes)
							? `<span class="">${time_diff_minutes} Minutes</span>`
							: ""
					}
									 <div class="dropdown dropdown-end history-card-menu" id="menu-${gameId}">
										 <button class="btn btn-ghost btn-sm btn-circle" tabindex="0" aria-label="Game actions" id="menu-btn-${gameId}">
											 <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" class="h-5 w-5 stroke-current"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6h.01M12 12h.01M12 18h.01"/></svg>
										 </button>
										 <ul tabindex="0" class="dropdown-content menu bg-base-100 rounded-box z-[5] w-52 p-2 shadow" id="menu-list-${gameId}">
											 ${isActive ? `<li><button id="menu-end-${gameId}">End game</button></li>` : ""}
											 <li><button id="menu-export-${gameId}">Export game</button></li>
											 <li><button class="text-error" id="menu-delete-${gameId}">Delete this game</button></li>
										 </ul>
									 </div>
								 </div>
              </div>
              <div class="card-body">
                <div class="overflow-x-auto">
                  <table class="table">
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Name</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody id="table-${gameId}">
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="card--hover">
                <a id="more-${gameId}">Find out more</a>
            </div>`;

        listContainer.appendChild(card);

        // Populate table
		let score = game.getScore();
		let last_row =
			score.length > 0
				? score[score.length - 1]
				: new Array(players.length).fill(0);
		let p_s = [];
		for (let j = 0; j < players.length; j++) {
			p_s.push({ name: players[j], points: last_row[j], position: 1 });
		}
		p_s.sort((a, b) => b.points - a.points);
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

		const tableElement = document.getElementById(`table-${gameId}`);
		for (let j = 0; j < p_s.length; j++) {
			const row = document.createElement("tr");
			const posCell = document.createElement("th");
			posCell.textContent = p_s[j].position.toString();
			row.appendChild(posCell);
			const nameCell = document.createElement("td");
			nameCell.textContent = p_s[j].name;
			row.appendChild(nameCell);
			const ptsCell = document.createElement("td");
			ptsCell.textContent = p_s[j].points.toString();
			row.appendChild(ptsCell);
			if (tableElement) tableElement.appendChild(row);
		}
		if (tableElement) {
			const firstRow = tableElement.querySelector("tr:first-child");
			if (firstRow) firstRow.classList.add("bg-info");
		}

        // Attach listeners
        const moreButton = document.getElementById(`more-${gameId}`);
		if (moreButton) {
			moreButton.addEventListener("click", function () {
				clicked_more_game(game);
			});
		}
		const cardElement = document.getElementById(`card-${gameId}`);
		if (cardElement) {
			cardElement.addEventListener("click", function () {
				clicked_more_game(game);
			});
		}

		const menuElement = document.getElementById(`menu-${gameId}`);
		if (menuElement) {
			menuElement.addEventListener("click", (event) => {
				event.stopPropagation();
			});
		}

		const exportButton = document.getElementById(`menu-export-${gameId}`);
		if (exportButton) {
			exportButton.addEventListener("click", (event) => {
				event.stopPropagation();
				exportSingleGame(game);
			});
		}

		const deleteButton = document.getElementById(`menu-delete-${gameId}`);
		if (deleteButton) {
			deleteButton.addEventListener("click", (event) => {
				event.stopPropagation();
				confirmDeleteGame(game);
			});
		}

		const endGameButton = document.getElementById(`menu-end-${gameId}`);
		if (endGameButton) {
			endGameButton.addEventListener("click", (event) => {
				event.stopPropagation();
				confirmEndGame(game);
			});
		}
    });

    if (displayedGames.length === 0) {
        listContainer.innerHTML = `<div class="p-10 opacity-50 text-center">No games found matching your filters.</div>`;
    }
}

// New logic for controls
const searchInput = document.getElementById("history-search") as HTMLInputElement;
const sortSelect = document.getElementById("history-sort") as HTMLSelectElement;
const filterSelect = document.getElementById("history-filter") as HTMLSelectElement;

if (searchInput) searchInput.value = currentSearch;
if (sortSelect) sortSelect.value = currentSort;
if (filterSelect) filterSelect.value = currentFilter;

if (searchInput) {
    searchInput.addEventListener("input", (e) => {
        currentSearch = (e.target as HTMLInputElement).value;
		writeListStateToUrl();
        renderGames();
    });
}
if (sortSelect) {
    sortSelect.addEventListener("change", (e) => {
        currentSort = (e.target as HTMLSelectElement).value as SortOption;
		writeListStateToUrl();
        renderGames();
    });
}
if (filterSelect) {
    filterSelect.addEventListener("change", (e) => {
        currentFilter = (e.target as HTMLSelectElement).value as FilterOption;
		writeListStateToUrl();
        renderGames();
    });
}

// Initial render
renderGames();


let Lgame: gamedata | undefined;

function clicked_more_game(game: gamedata) {
	document.getElementById("nav_container").classList.remove("hidden");
	score_switch_view(4);
	view = 1;

	(globalThis as any).historyPageViewing = true;
	(globalThis as any).historyConfettiShown = false;

	const pastGamesElement = document.getElementById("past_games");
	const scoreElement = document.getElementById("score");
	const delGameElement = document.getElementById("del_game");
	const shareGameElement = document.getElementById("share_game");
	const sRoundElement = document.getElementById("s_round");
	const tabNavigationElement = document.getElementById("tab_navigation_container");
	const playerAnalyticsElement = document.getElementById("player_analytics");
    const gameAnalyticsElement = document.getElementById("game_analytics");

	if (pastGamesElement) pastGamesElement.classList.add("hidden");
	if (scoreElement) scoreElement.classList.remove("hidden");
	if (delGameElement) delGameElement.classList.remove("hidden");
	if (shareGameElement) shareGameElement.classList.remove("hidden");
	if (sRoundElement) sRoundElement.classList.add("hidden");
	if (tabNavigationElement) tabNavigationElement.classList.add("hidden");
	if (playerAnalyticsElement) playerAnalyticsElement.classList.add("hidden");
    if (gameAnalyticsElement) gameAnalyticsElement.classList.add("hidden");

	Lgame = game;
	Lgame.setStep(3);
	const detailUrl = new URL(window.location.href);
	detailUrl.searchParams.set("id", Lgame.getID() || "");
	if (currentSearch.trim()) detailUrl.searchParams.set("search", currentSearch);
	else detailUrl.searchParams.delete("search");
	if (currentSort !== DEFAULT_SORT) detailUrl.searchParams.set("sort", currentSort);
	else detailUrl.searchParams.delete("sort");
	if (currentFilter !== DEFAULT_FILTER) detailUrl.searchParams.set("filter", currentFilter);
	else detailUrl.searchParams.delete("filter");
	history.replaceState({}, "", detailUrl);
	let players = Lgame.getPlayers();
	updatescore(players, Lgame as any);

	const shareGameLink = document.getElementById("share_game") as HTMLAnchorElement;
	if (shareGameLink && Lgame)
		shareGameLink.href = `${location.origin}/share?id=${Lgame.getID()}`;

	updateExportButton();
}


const tlBtn = document.getElementById("tlbtn");

function switchToOverview(pushHistory: boolean) {
	document.getElementById("nav_container")?.classList.add("hidden");
	const scoreElement = document.getElementById("score");
	const pastGamesElement = document.getElementById("past_games");
	const delGameElement = document.getElementById("del_game");
	const tabNavigationElement = document.getElementById("tab_navigation_container");

	(globalThis as any).historyPageViewing = false;
	(globalThis as any).historyConfettiShown = false;

	const pastGamesTab = document.getElementById("past-games-tab");
	const playerAnalyticsTab = document.getElementById("player-analytics-tab");
	const gameAnalyticsTab = document.getElementById("game-analytics-tab");

	if (pastGamesTab) pastGamesTab.classList.add("active");
	if (playerAnalyticsTab) playerAnalyticsTab.classList.remove("active");
	if (gameAnalyticsTab) gameAnalyticsTab.classList.remove("active");

	const gameAnalyticsView = document.getElementById("game_analytics");
	const playerAnalyticsView = document.getElementById("player_analytics");

	if (scoreElement) scoreElement.classList.add("hidden");
	if (pastGamesElement) pastGamesElement.classList.remove("hidden");
	if (playerAnalyticsView) playerAnalyticsView.classList.add("hidden");
	if (gameAnalyticsView) gameAnalyticsView.classList.add("hidden");

	if (delGameElement) delGameElement.classList.add("hidden");
	if (tabNavigationElement) tabNavigationElement.classList.remove("hidden");

	view = 0;
	confetti.reset();

	const overviewUrl = new URL(`${location.origin}/history/`);
	if (currentSearch.trim()) overviewUrl.searchParams.set("search", currentSearch);
	if (currentSort !== DEFAULT_SORT) overviewUrl.searchParams.set("sort", currentSort);
	if (currentFilter !== DEFAULT_FILTER) overviewUrl.searchParams.set("filter", currentFilter);

	if (pushHistory) history.pushState({}, "", overviewUrl);
	else history.replaceState({}, "", overviewUrl);

	updateExportButton();
}

if (tlBtn) {
	tlBtn.addEventListener("click", () => {
		if (view == 1) {
			switchToOverview(true);
		} else {
			location.href = "/";
		}
	});
}

//advances modal
const titleElement = document.getElementById("title");
if (titleElement) {
	titleElement.addEventListener("click", () => {
		(document.getElementById("modal_settings") as HTMLDialogElement).open = true;
		Logger.event("settings.open");
	});
}

const settingsButton = document.getElementById("settings_btn");
if (settingsButton) {
	settingsButton.addEventListener("click", () => {
		(document.getElementById("modal_settings") as HTMLDialogElement).open = true;
		Logger.event("settings.open.button");
	});
}

const endOldGamesButton = document.getElementById("end_old_games");
if (endOldGamesButton) {
	endOldGamesButton.addEventListener("click", () => {
		const threshold = getThreeMonthsAgoTimestamp();
		const oldActiveGames = allGames.filter(
			(game) => game.isActive && game.getTimeStarted() < threshold
		);

		if (oldActiveGames.length === 0) {
			showConfirmModal(
				"No active games older than 3 months were found.",
				"Only active games with a start date older than 3 months are ended automatically.",
				"OK",
				"Close",
				"Nothing To End",
				() => {}
			);
			return;
		}

		showConfirmModal(
			`End ${oldActiveGames.length} active game(s) older than 3 months?`,
			"These games will be marked as completed automatically.",
			`End ${oldActiveGames.length} Games`,
			"Cancel",
			"Auto End Old Games",
			() => {
				autoEndOldGames(oldActiveGames);
			}
		);
	});
}

const delAllLocalButton = document.getElementById("del_all_local");
if (delAllLocalButton) {
	delAllLocalButton.addEventListener("click", () => {
		showConfirmModal(
			"Delete all local data on this device?",
			"Cloud games are not deleted. This only removes local Wizard data in this browser.",
			"Delete Local Data",
			"Keep Data",
			"Delete Local Data",
			() => {
				deleteAllLocalData();
			}
		);
	});
}

//get url params
const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get("id");
if (myParam) {
	for (let i = 0; i < allGames.length; i++) {
		if (allGames[i].getID() === myParam) {
			clicked_more_game(allGames[i]);
			break;
		}
	}
}

// Initialize player analytics and game analytics
let analyticsUI: HistoryAnalyticsUI;
let gameAnalyticsUI: GameAnalyticsUI;
try {
    const completedGames = allGames.filter((g) => !g.isActive);
	analyticsUI = new HistoryAnalyticsUI(completedGames);
    gameAnalyticsUI = new GameAnalyticsUI(allGames); // Pass all games, analytics will filter internally if needed
	Logger.info("Analytics initialized successfully");
    
    // Setup Tab Navigation
    setupTabNavigation();

} catch (error) {
	Logger.error("Failed to initialize analytics", {
		error: (error as Error)?.message,
	});
}

function setupTabNavigation() {
    const tabs = [
        { id: 'past-games-tab', viewId: 'past_games', param: 'history', action: null },
        { id: 'player-analytics-tab', viewId: 'player_analytics', param: 'players', action: null },
        { id: 'game-analytics-tab', viewId: 'game_analytics', param: 'stats', action: () => { if(gameAnalyticsUI) gameAnalyticsUI.render(); } }
    ];

    function activateTab(tab: (typeof tabs)[number], updateUrl: boolean = true) {
        // Update tabs state
        tabs.forEach(t => {
            const tBtn = document.getElementById(t.id);
            const tView = document.getElementById(t.viewId);
            if (tBtn) {
                    if(t.id === tab.id) tBtn.classList.add('active');
                    else tBtn.classList.remove('active');
            }
            if (tView) {
                if(t.viewId === tab.viewId) tView.classList.remove('hidden');
                else tView.classList.add('hidden');
            }
        });
        
        if (tab.action) tab.action();

        if (updateUrl) {
            const url = new URL(window.location.href);
            url.searchParams.set("tab", tab.param);
            history.pushState({}, "", url);
            Logger.event("tab.switch.history", { to: tab.viewId });
        }
    }

    tabs.forEach(tab => {
        const btn = document.getElementById(tab.id);
        if (!btn) return;
        
        btn.addEventListener('click', () => {
             activateTab(tab);
        });
    });

    const urlParams = new URLSearchParams(window.location.search);
    const currentTabParam = urlParams.get("tab");
    // Only switch tabs if not looking at a specific game and a tab param is present
    if (currentTabParam && !urlParams.has("id")) {
        const tabToActivate = tabs.find(t => t.param === currentTabParam);
        if (tabToActivate) {
            activateTab(tabToActivate, false);
        }
    }
}


function updateExportButton() {
	const exportBtn = document.getElementById("export_data");
	if (!exportBtn) return;

	const newBtn = exportBtn.cloneNode(true) as HTMLElement;
	exportBtn.parentNode?.replaceChild(newBtn, exportBtn);

	if (view === 1 && Lgame) {
		newBtn.textContent = "Export this game";
		newBtn.addEventListener("click", () => {
			exportSingleGame(Lgame);
		});
	} else {
		newBtn.textContent = "Export All Data";
		newBtn.addEventListener("click", () => {
			const exportData = { ...localStorage };
			downloadJSON(exportData, "wizard_data_all.json");
		});
	}
}

function showConfirmModal(
	title: string,
	infoText: string,
	confirmLabel: string,
	cancelLabel: string,
	modalTitle: string,
	onConfirm: () => void
) {
	const modal = document.getElementById("modal_delete") as HTMLDialogElement;
	const modalTitleElement = modal?.querySelector(".modal-box > div h2");
	const modalDelText = document.getElementById("modal_del_text");
	const modalDelInfoText = document.getElementById("modal_del_infotext");
	const cancelButton = document.getElementById("cancel_delete_action");

	if (modalTitleElement) modalTitleElement.textContent = modalTitle;

	if (modalDelText) modalDelText.textContent = title;
	if (modalDelInfoText) modalDelInfoText.textContent = infoText;
	if (cancelButton) cancelButton.textContent = cancelLabel;

	const confirmButton = document.getElementById("rremovedata");
	if (confirmButton) {
		confirmButton.textContent = confirmLabel;
		confirmButton.removeAttribute("onclick");
		const newButton = confirmButton.cloneNode(true) as HTMLElement;
		confirmButton.parentNode?.replaceChild(newButton, confirmButton);
		newButton.addEventListener("click", () => {
			onConfirm();
			modal.open = false;
		});
	}

	modal.open = true;
}

function exportSingleGame(game: gamedata) {
	const exportData = {
		"wizard.games": JSON.stringify([game]),
	};
	downloadJSON(exportData, `wizard_game_${game.getID()}.json`);
}

function confirmDeleteGame(game: gamedata) {
	showConfirmModal(
		"Do you really want to delete this game?",
		"This will remove all stored data about this game permanently!",
		"Delete Game",
		"Keep Game",
		"Delete Game",
		() => {
			deleteGame(game);
		}
	);
}

function deleteGame(game: gamedata) {
	const id = game.getID();
	if (!id) return;

	try {
		const stored = localStorage.getItem("wizard.games");
		if (stored) {
			const all = JSON.parse(stored);
			const newAll = all.filter((g: any) => g.id !== id);
			localStorage.setItem("wizard.games", JSON.stringify(newAll));
		}

		if (localStorage.getItem("wizard.activegame") === id) {
			localStorage.removeItem("wizard.activegame");
		}
	} catch (e) {
		console.error("Failed to delete local game", e);
	}

	allGames = allGames.filter((g) => g.getID() !== id);

	if (view === 1 && Lgame?.getID() === id) {
		switchToOverview(false);
	}

	if (allGames.length === 0) {
		location.href = "/";
		return;
	}

	renderGames();

	SyncManager.delete(id)
		.then(() => {
			Logger.info("Success deleting", { id });
		})
		.catch((error) => {
			Logger.error("Error deleting", { error: error?.message });
		});
}

function confirmEndGame(game: gamedata) {
	showConfirmModal(
		"End this active game?",
		"The game will be marked as completed and moved to the completed list.",
		"End Game",
		"Continue Playing",
		"End Active Game",
		() => {
			endGame(game);
		}
	);
}

function endGameInternal(game: gamedata, shouldRender: boolean) {
	const now = Date.now();
	const startedAt = game.getTimeStarted();
	const existingEnd = game.getTimeEnded();

	let endedAt = now;
	if (typeof existingEnd === "number") {
		endedAt = existingEnd;
	} else if (now - startedAt > OLD_ACTIVE_GAME_LIMIT_MS) {
		endedAt = startedAt + FALLBACK_ENDED_DURATION_MS;
	}

	game.setTimeEnded(endedAt);
	game.isActive = false;
	game.save();

	if (localStorage.getItem("wizard.activegame") === game.getID()) {
		localStorage.removeItem("wizard.activegame");
	}

	SyncManager.sync(game)
		.then(() => {
			Logger.info("Success ending active game", {
				id: game.getID(),
				endedAt,
			});
		})
		.catch((error) => {
			Logger.error("Error syncing ended game", {
				error: error?.message,
				id: game.getID(),
			});
		});

	if (shouldRender) {
		renderGames();
	}
}

function endGame(game: gamedata) {
	endGameInternal(game, true);

	if (view === 1 && Lgame?.getID() === game.getID()) {
		updateExportButton();
	}
}

function autoEndOldGames(games: gamedata[]) {
	games.forEach((game) => {
		endGameInternal(game, false);
	});

	renderGames();

	if (view === 1 && Lgame && !Lgame.isActive) {
		updateExportButton();
	}
}

function deleteAllLocalData() {
	try {
		const keysToRemove: string[] = [];
		for (let i = 0; i < localStorage.length; i++) {
			const key = localStorage.key(i);
			if (key?.startsWith("wizard.")) {
				keysToRemove.push(key);
			}
		}

		keysToRemove.forEach((key) => localStorage.removeItem(key));

		Logger.info("Deleted all local wizard data", {
			removedKeys: keysToRemove,
		});
	} catch (error) {
		Logger.error("Failed to delete local wizard data", {
			error: (error as Error)?.message,
		});
	}

	allGames = [];
	location.href = "/";
}

function downloadJSON(data: any, fileName: string) {
	const blob = new Blob([JSON.stringify(data)], { type: "text/plain" });
	const url = window.URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	a.click();
	window.URL.revokeObjectURL(url);
}

// Initial initialization
updateExportButton();
