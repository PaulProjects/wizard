import { updatescore, score_switch_view } from "./score.ts";
import { GameData as gamedata } from "./game/gamedata.ts";
import { HistoryAnalyticsUI } from "./history-analytics-ui.ts";
import { Logger } from "./logger.ts";

import confetti from "canvas-confetti";

let view = 0; //0 = overview ; 1 = details
// check if past_games exists in local storage if not return
let past_games = JSON.parse(localStorage.getItem("recent_games"));
if (past_games === null || past_games.length === 0) {
	location.href = "/";
}

//newest game first - time_started for backwards compatibility
past_games.sort((a, b) => {
	return b.time_started - a.time_started;
});

//create game objects from the games
let games: gamedata[] = [];
let skippedGames: any[] = [];

for (let i = 0; i < past_games.length; i++) {
	try {
		const game = gamedata.fromJson(past_games[i]);

		//check if it has a id else try to upload it
		if (!game.hasID()) {
			Logger.info("No id found, trying to upload", { game });

			fetch("https://s.paulbertram.de/wizardshare.php", {
				method: "POST",
				headers: {
					"Content-Type": "application/x-www-form-urlencoded",
				},
				body: new URLSearchParams({
					game: JSON.stringify(game),
				}),
			})
				.then((response) => response.text())
				.then((data: string) => {
					//add id info to the game
					game.setId(data);
					past_games[i] = game;
					localStorage.setItem(
						"recent_games",
						JSON.stringify(past_games)
					);
					Logger.info("Success uploading", { id: data });
				})
				.catch((error) => {
					Logger.error("Error uploading game", {
						error: error?.message,
					});
				});
		}

		// Only add successfully loaded games to the games array
		games.push(game);

		let players = game.getPlayers();

		let time_started = game.getTimeStarted();
		let time_ended = game.getTimeEnded();
		let time_diff = time_ended - time_started;
		let time_diff_minutes = Math.floor(time_diff / 60000);

		//Extract date from time_ended
		let date = new Date(time_started);
		let day = date.getDate();
		//write month as string
		let month = date.toLocaleString("default", { month: "short" });
		let year = date.getFullYear();
		let date_string = `${day}.${month}.${year}`;

		// Use the game index in the games array (not the original past_games index)
		const gameIndex = games.length - 1;

		// Create game card using native DOM manipulation
		const card = document.createElement("div");
		card.className = "card mt-10 bg-base-200 w-full";
		card.id = `card${gameIndex}`;
		card.innerHTML = `
            <div class="w-full h-full">
              <span class="inline-block pl-3 pt-3">${date_string}</span>
              <span class="float-right pr-3 pt-3">${time_diff_minutes} Minutes</span>
              <div class="card-body">
                <div class="overflow-x-auto">
                  <table class="table">
                    <!-- head -->
                    <thead>
                      <tr>
                        <th>Position</th>
                        <th>Name</th>
                        <th>Points</th>
                      </tr>
                    </thead>
                    <tbody id="table${gameIndex}">
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="card--hover">
                <a id="more${gameIndex}">Find out more</a>
            </div>`;

		const pastGamesElement = document.getElementById("past_games");
		if (pastGamesElement) pastGamesElement.appendChild(card);

		//add event listener to the more button
		const moreButton = document.getElementById(`more${gameIndex}`);
		if (moreButton) {
			moreButton.addEventListener("click", function () {
				clicked_more(gameIndex);
			});
		}

		const cardElement = document.getElementById(`card${gameIndex}`);
		if (cardElement) {
			cardElement.addEventListener("click", function () {
				clicked_more(gameIndex);
			});
		}

		let score = game.getScore();
		//extract last row of score
		let last_row = score[score.length - 1];
		//create a new array with the players and their points
		let p_s = [];
		for (let j = 0; j < players.length; j++) {
			p_s.push({ name: players[j], points: last_row[j], position: 1 });
		}

		//sort the array by points descending
		p_s.sort((a, b) => b.points - a.points);

		// Determine positions (handling ties)
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
		const tableElement = document.getElementById(`table${gameIndex}`);
		for (let j = 0; j < p_s.length; j++) {
			const row = document.createElement("tr");

			const positionCell = document.createElement("th");
			positionCell.textContent = p_s[j].position.toString();
			row.appendChild(positionCell);

			const nameCell = document.createElement("td");
			nameCell.textContent = p_s[j].name;
			row.appendChild(nameCell);

			const pointsCell = document.createElement("td");
			pointsCell.textContent = p_s[j].points.toString();
			row.appendChild(pointsCell);

			if (tableElement) tableElement.appendChild(row);
		}

		//add class="bg-info" to the first row
		if (tableElement) {
			const firstRow = tableElement.querySelector("tr:first-child");
			if (firstRow) firstRow.classList.add("bg-info");
		}
	} catch (error) {
		Logger.error(`Failed to load game at index ${i}`, {
			error: (error as Error)?.message,
			gameData: past_games[i],
			gameId: past_games[i]?.id || "unknown",
			gameMetadata: {
				id: past_games[i]?.id,
				players: past_games[i]?.players,
				timeStarted: past_games[i]?.time_started,
				round: past_games[i]?.round,
			},
		});

		// Store the broken game for potential recovery
		skippedGames.push({
			index: i,
			data: past_games[i],
			error: error.message,
		});

		// Continue with next game instead of breaking the entire page
		continue;
	}
}

// Log information about skipped games
if (skippedGames.length > 0) {
	Logger.warn(`Skipped ${skippedGames.length} corrupted games`, {
		skippedGames,
	});

	// Optional: Show user notification about skipped games
	const notification = document.createElement("div");
	notification.className = "alert alert-warning mt-4";
	notification.innerHTML = `
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.186-.833-2.956 0L3.858 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <span>Warning: ${skippedGames.length} corrupted game(s) were skipped and not displayed. Check the console for details.</span>
      </div>`;
	const pastGamesElement = document.getElementById("past_games");
	if (pastGamesElement) pastGamesElement.prepend(notification);
}

let Lgame: gamedata;
function clicked_more(i: number) {
	document.getElementById("nav_container").classList.remove("hidden");
	score_switch_view(4);
	view = 1;
	// Indicate that we are viewing a finished game from the history page.
	// This flag is used by score/confetti logic to shorten celebration.
	(globalThis as any).historyPageViewing = true;
	// Allow a fresh (single) short confetti burst each time a card is opened.
	(globalThis as any).historyConfettiShown = false;
	//hide past_games and remove hidden from score
	const pastGamesElement = document.getElementById("past_games");
	const scoreElement = document.getElementById("score");
	const delGameElement = document.getElementById("del_game");
	const shareGameElement = document.getElementById("share_game");
	const sRoundElement = document.getElementById("s_round");
	const tabNavigationElement = document.getElementById(
		"tab_navigation_container"
	);
	const playerAnalyticsElement = document.getElementById("player_analytics");

	if (pastGamesElement) pastGamesElement.classList.add("hidden");
	if (scoreElement) scoreElement.classList.remove("hidden");
	if (delGameElement) delGameElement.classList.remove("hidden");
	if (shareGameElement) shareGameElement.classList.remove("hidden");
	if (sRoundElement) sRoundElement.classList.add("hidden");
	if (tabNavigationElement) tabNavigationElement.classList.add("hidden");
	if (playerAnalyticsElement) playerAnalyticsElement.classList.add("hidden");

	//get the game and store it in Lgame
	Lgame = games[i];
	Lgame.setStep(3);
	//add the id to the url
	history.replaceState({}, "", `?id=${Lgame.getID()}`);
	let players = Lgame.getPlayers();
	updatescore(players, Lgame as any);

	const shareGameLink = document.getElementById(
		"share_game"
	) as HTMLAnchorElement;
	if (shareGameLink)
		shareGameLink.href = `${location.origin}/share?id=${Lgame.getID()}`;
}

// Tab switching is now handled in score.ts

//#endregion

const tlBtn = document.getElementById("tlbtn");
if (tlBtn) {
	tlBtn.addEventListener("click", () => {
		if (view == 1) {
			document.getElementById("nav_container").classList.add("hidden");
			const scoreElement = document.getElementById("score");
			const pastGamesElement = document.getElementById("past_games");
			const delGameElement = document.getElementById("del_game");
			const tabNavigationElement = document.getElementById(
				"tab_navigation_container"
			);

				// Leaving detailed view: clear history confetti flags
				(globalThis as any).historyPageViewing = false;
				(globalThis as any).historyConfettiShown = false;

				// Restore tab navigation active state to Past Games tab
				const pastGamesTab = document.getElementById("past-games-tab");
				const playerAnalyticsTab = document.getElementById("player-analytics-tab");
				if (pastGamesTab) pastGamesTab.classList.add("active");
				if (playerAnalyticsTab) playerAnalyticsTab.classList.remove("active");

			if (scoreElement) scoreElement.classList.add("hidden");
			if (pastGamesElement) pastGamesElement.classList.remove("hidden");
			if (delGameElement) delGameElement.classList.add("hidden");
			if (tabNavigationElement)
				tabNavigationElement.classList.remove("hidden");

			view = 0;

			confetti.reset();
			//remove the id from the url
			history.pushState({}, "", "/history/");
		} else {
			location.href = "/";
		}
	});
}

//advances modal
const titleElement = document.getElementById("title");
if (titleElement) {
	titleElement.addEventListener("click", () => {
		(document.getElementById("modal_settings") as HTMLDialogElement).open =
			true;
		Logger.event("settings.open");
	});
}

const delGameButton = document.getElementById("del_game");
if (delGameButton) {
	delGameButton.addEventListener("click", () => {
		let id = Lgame.getID();
		const rremoveDataButton = document.getElementById("rremovedata");

		//remove all onclick attributes
		if (rremoveDataButton) {
			rremoveDataButton.removeAttribute("onclick");
			// Remove any existing event listeners by cloning and replacing the element
			const newButton = rremoveDataButton.cloneNode(true);
			rremoveDataButton.parentNode?.replaceChild(
				newButton,
				rremoveDataButton
			);
		}

		//show modal_delete
		(document.getElementById("modal_delete") as HTMLDialogElement).open =
			true;
		//change text
		const modalDelText = document.getElementById("modal_del_text");
		const modalDelInfoText = document.getElementById("modal_del_infotext");

		if (modalDelText)
			modalDelText.textContent =
				"Do you really want to delete this game?";
		if (modalDelInfoText)
			modalDelInfoText.textContent =
				"This will remove all stored data about this game permanently!";

		//add click event to the button
		const newRremoveDataButton = document.getElementById("rremovedata");
		if (newRremoveDataButton) {
			newRremoveDataButton.addEventListener("click", () => {
				//delete the game from the local storage
				let index = past_games.findIndex((game) => game.id === id);
				past_games.splice(index, 1);
				localStorage.setItem(
					"recent_games",
					JSON.stringify(past_games)
				);

				//delete the game on the server
				fetch(
					`https://s.paulbertram.de/wizardshare.php?id=${Lgame.getID()}`,
					{
						method: "DELETE",
					}
				)
					.then(() => {
						Logger.info("Success deleting", { id });
					})
					.catch((error) => {
						Logger.error("Error deleting", {
							error: error?.message,
						});
					})
					.finally(() => {
						location.reload();
					});
			});
		}
	});
}

const delAllButton = document.getElementById("del_all");
if (delAllButton) {
	delAllButton.addEventListener("click", () => {
		const rremoveDataButton = document.getElementById("rremovedata");

		//remove all onclick attributes
		if (rremoveDataButton) {
			rremoveDataButton.removeAttribute("onclick");
			// Remove any existing event listeners by cloning and replacing the element
			const newButton = rremoveDataButton.cloneNode(true);
			rremoveDataButton.parentNode?.replaceChild(
				newButton,
				rremoveDataButton
			);
		}

		//show modal_delete
		(document.getElementById("modal_delete") as HTMLDialogElement).open =
			true;
		//change text
		const modalDelText = document.getElementById("modal_del_text");
		const modalDelInfoText = document.getElementById("modal_del_infotext");

		if (modalDelText)
			modalDelText.textContent = "Do you really want to delete all data?";
		if (modalDelInfoText)
			modalDelInfoText.textContent =
				"This will remove all locally stored data about current and past games permanently!";

		//add click event to the button
		const newRremoveDataButton = document.getElementById("rremovedata");
		if (newRremoveDataButton) {
			newRremoveDataButton.addEventListener("click", () => {
				localStorage.clear();
				location.reload();
			});
		}
	});
}

//get url params
const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get("id");
//open the game with the id
if (myParam) {
	// Find the game in the successfully loaded games array
	for (let i = 0; i < games.length; i++) {
		if (games[i].getID() === myParam) {
			clicked_more(i);
			break;
		}
	}
}

// Initialize player analytics
try {
	const analyticsUI = new HistoryAnalyticsUI(games);
	Logger.info("Player analytics initialized successfully");
} catch (error) {
	Logger.error("Failed to initialize player analytics", {
		error: (error as Error)?.message,
	});
}
