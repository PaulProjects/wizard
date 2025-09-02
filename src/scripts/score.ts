import type { gamedata } from "./game/gamedata";
import { Chart, registerables } from "chart.js";
Chart.register(...registerables);

import confetti from "canvas-confetti";
import { Logger } from "./logger";

// Helper: are advanced tabs (Chart/Analytics) unlocked?
function isAdvancedTabsUnlocked(): boolean {
	const g = (globalThis as any)?.game;
	// If no game context (e.g., history page), allow tabs to work freely
	if (!g || typeof g.getRound !== "function") return true;
	const round = g.getRound?.();
	const step = g.getStep?.();
	// Unlock after round 2 (i.e., starting round 3) or during/after celebration (step 3)
	return (typeof round === "number" && round > 2) || step === 3;
}

export function score_switch_view(x: number): void {
	// Redirect removed table view (2) to top_players view (3)
	if (x === 2) {
		x = 3;
	}

	// Map view numbers to tab IDs and panel IDs
	const tabMapping = {
		1: { tabId: "tab_chart", panelId: "graph" },
		3: { tabId: "tab_top", panelId: "top_players" },
		4: { tabId: "tab_celeb", panelId: "celebration" },
		5: { tabId: "tab_analytics", panelId: "analytics" },
	};

	// If trying to switch to a locked tab early, fall back to Top Players
	const candidate = tabMapping[x as keyof typeof tabMapping];
	if (
		candidate &&
		(candidate.panelId === "graph" || candidate.panelId === "analytics") &&
		!isAdvancedTabsUnlocked()
	) {
		x = 3;
	}

	// Hide all panels and remove active class from all tabs
	const tabPanels = document.querySelectorAll(".tab-panel");
	const tabBtns = document.querySelectorAll(".tab-btn");

	tabPanels.forEach((panel) => panel.classList.add("hidden"));
	tabBtns.forEach((btn) => btn.classList.remove("active"));

	// Show the target panel and activate the target tab
	const mapping = tabMapping[x];
	if (mapping) {
		Logger.event("tab.switch", {
			tabId: mapping.tabId,
			panelId: mapping.panelId,
			view: x,
		});
		const targetPanel = document.getElementById(mapping.panelId);
		const targetTab = document.getElementById(mapping.tabId);

		if (targetPanel) targetPanel.classList.remove("hidden");
		if (targetTab) targetTab.classList.add("active");
	}
}

// Initialize tab click handlers
document.addEventListener("DOMContentLoaded", () => {
	const tabBtns = document.querySelectorAll<HTMLElement>(".tab-btn");

	tabBtns.forEach((btn) => {
		btn.addEventListener("click", function () {
			const panelId = this.dataset.tab;

			// Create reverse mapping from panel ID to view number
			const panelToViewMapping = {
				graph: 1,
				top_players: 3,
				celebration: 4,
				analytics: 5,
			};

			// Hide all panels and remove active class from all tabs
			const tabPanels = document.querySelectorAll(".tab-panel");
			const allTabBtns = document.querySelectorAll(".tab-btn");

			tabPanels.forEach((panel) => panel.classList.add("hidden"));
			allTabBtns.forEach((btn) => btn.classList.remove("active"));

			// Show the clicked panel and activate the clicked tab
			const targetPanel = document.getElementById(panelId);
			if (targetPanel) targetPanel.classList.remove("hidden");
			this.classList.add("active");

			// Save the selected view to game data if available
			const viewNumber = panelToViewMapping[panelId];
			if (
				viewNumber &&
				typeof globalThis !== "undefined" &&
				(globalThis as any).game
			) {
				(globalThis as any).game.setScoreDisplay(viewNumber);
				// Save to localStorage immediately
				(globalThis as any).game.save();
				Logger.event("tab.switch.click", { panelId, view: viewNumber });
			}
		});
	});

	// Touch swipe functionality for tab switching
	let touchStartX = 0;
	let touchStartY = 0;
	let touchEndX = 0;
	let touchEndY = 0;

	const tabContainer = document.querySelector(".tab-content-container");
	if (tabContainer) {
		tabContainer.addEventListener(
			"touchstart",
			function (e: TouchEvent) {
				touchStartX = e.changedTouches[0].screenX;
				touchStartY = e.changedTouches[0].screenY;
			},
			{ passive: true }
		);

		tabContainer.addEventListener(
			"touchend",
			function (e: TouchEvent) {
				touchEndX = e.changedTouches[0].screenX;
				touchEndY = e.changedTouches[0].screenY;
				handleSwipe();
			},
			{ passive: true }
		);
	}

	function handleSwipe() {
		const swipeThreshold = 50; // Minimum distance for a swipe
		const swipeAngleThreshold = 30; // Maximum angle from horizontal for a valid swipe

		const deltaX = touchEndX - touchStartX;
		const deltaY = touchEndY - touchStartY;
		const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);

		// Check if swipe is long enough
		if (distance < swipeThreshold) return;

		// Check if swipe is mostly horizontal
		const angle = Math.abs((Math.atan2(deltaY, deltaX) * 180) / Math.PI);
		if (angle > swipeAngleThreshold && angle < 180 - swipeAngleThreshold)
			return;

		// Get current active tab
		const currentTab = document.querySelector(
			".tab-btn.active"
		) as HTMLElement;
		if (!currentTab) return;

		// Get only visible tabs (not hidden with display: none)
		const allTabBtns = document.querySelectorAll<HTMLElement>(".tab-btn");
		const visibleTabButtons = Array.from(allTabBtns).filter((btn) => {
			const style = window.getComputedStyle(btn);
			return style.display !== "none";
		});

		if (visibleTabButtons.length <= 1) return; // No point swiping if only one tab

		const currentIndex = visibleTabButtons.indexOf(currentTab);
		if (currentIndex === -1) return; // Current tab not in visible list

		let nextIndex = -1;

		if (deltaX > 0) {
			// Swipe right - go to previous visible tab
			nextIndex =
				currentIndex > 0
					? currentIndex - 1
					: visibleTabButtons.length - 1;
		} else {
			// Swipe left - go to next visible tab
			nextIndex =
				currentIndex < visibleTabButtons.length - 1
					? currentIndex + 1
					: 0;
		}

		if (nextIndex >= 0 && nextIndex < visibleTabButtons.length) {
			// Add a brief visual feedback before switching
			const tabContainer = document.querySelector(
				".tab-content-container"
			) as HTMLElement;
			if (tabContainer) {
				tabContainer.style.opacity = "0.7";
				setTimeout(() => {
					visibleTabButtons[nextIndex].click();
					tabContainer.style.opacity = "1";
				}, 100);
			} else {
				visibleTabButtons[nextIndex].click();
			}
		}
	}
});

export function updatescore(players: any, game: gamedata) {
	// Data
	const bets = [...game.getBets()];
	const gameScore: number[][] = game.getRuleAltcount()
		? [...game.getAltScore()]
		: [...game.getScore()];
	const score_change: number[][] = game.getRuleAltcount()
		? [...game.getAltScoreChange()]
		: [...game.getScoreChange()];

	let playerlist = [];
	let sorted_playerlist = [];
	// Array Structure
	// 0 -> Name
	// 1 -> Score
	// 2 -> Bet
	// 3 -> Place
	// 4 -> Dealer?
	// 5 -> Name without decoration

	//sorting the players by score
	//Give the players a crown if they are first
	if (game.getRound() > 1) {
		for (let i = 0; i < players.length; i++) {
			playerlist[i] = [players[i], gameScore[gameScore.length - 1][i]];
			sorted_playerlist[i] = [
				players[i],
				gameScore[gameScore.length - 1][i],
				bets[bets.length - 1][i],
				,
				,
				players[i],
			];
		}
		for (let i = 0; i < playerlist.length; i++) {
			if (i == game.getDealer()) {
				playerlist[i][2] = 1;
				sorted_playerlist[i][4] = 1;
			} else {
				playerlist[i][2] = 0;
				sorted_playerlist[i][4] = 0;
			}
		}
		sorted_playerlist.sort(function (a, b) {
			return b[1] - a[1];
		});
	} else {
		for (let i = 0; i < players.length; i++) {
			playerlist[i] = [players[i], 0];
			if (bets.length == 0) {
				sorted_playerlist[i] = [players[i], 0, 0, , , players[i]];
			} else {
				sorted_playerlist[i] = [
					players[i],
					0,
					bets[bets.length - 1][i],
					,
					,
					players[i],
				];
			}
			if (i == game.getDealer()) {
				playerlist[i][2] = 1;
				sorted_playerlist[i][4] = 1;
			} else {
				playerlist[i][2] = 0;
				sorted_playerlist[i][4] = 0;
			}
		}
	}
	let max = sorted_playerlist[0][1];
	let currentPlace = 1;
	let lastScore = sorted_playerlist[0][1];
	for (let i = 0; i < sorted_playerlist.length; i++) {
		if (sorted_playerlist[i][1] == max)
			sorted_playerlist[i][0] = sorted_playerlist[i][0] + " 👑";
		if (sorted_playerlist[i][1] != lastScore) currentPlace = i + 1;
		sorted_playerlist[i][0] = currentPlace + ". " + sorted_playerlist[i][0];
		sorted_playerlist[i][3] = currentPlace;
		lastScore = sorted_playerlist[i][1];
	}
	for (let i = 0; i < playerlist.length; i++) {
		if (playerlist[i][1] == max)
			playerlist[i][0] = playerlist[i][0] + " 👑";
	}

	//Views
	const topPlayersContainer = document.querySelector("#top_players > div");
	if (topPlayersContainer) {
		topPlayersContainer.innerHTML = "";
	}

	//Top Players list
	for (let i = 0; i < sorted_playerlist.length; i++) {
		// Create the player card structure safely
		const playerCard = document.createElement("div");
		playerCard.className =
			"min-w-72 w-11/12 sm:w-5/12 max-w-full bg-neutral rounded-md p-4 transition-all border-2 border-neutral duration-300 hover:-translate-y-2 hover:border-secondary relative cursor-pointer group";
		playerCard.id = `top_players_${i}`;
		playerCard.dataset.playerIndex = i.toString();

		playerCard.innerHTML = `
			<div class="absolute top-2 right-2 text-base-content/60 transition-all duration-300 group-hover:text-secondary group-hover:scale-110">
				<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="-7 -7 24 24"><path fill="currentColor" d="M8 2H1a1 1 0 1 1 0-2h8a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0z"/></svg>
			</div>
			<div class="w-full justify-between items-center gap-16 inline-flex">
				<h1 class="text-4xl font-medium ${sorted_playerlist[i][4] == 1 ? "text-secondary" : ""}" id="top_players_name_${i}"></h1>
			</div>
			<div class="w-full h-9 justify-between items-center inline-flex mb-2 mt-2">
				<div class="w-10 self-stretch">
						<h3 class="text-2xl">${sorted_playerlist[i][1]}</h3>
						<p class="font-light text-sm">Score<p>
				</div>
				${
					game.getStep() === 2
						? /*html*/ `<div class="w-10 self-stretch">
					<h3 class="text-2xl">${sorted_playerlist[i][2]}</h3>
					<p class="font-light text-sm">Bet<p>
				</div>`
						: ""
				}  
			</div>`;

		// Safely set the player name
		const playerNameElement = playerCard.querySelector(
			`#top_players_name_${i}`
		);
		if (playerNameElement) {
			playerNameElement.textContent = sorted_playerlist[i][0];
		}

		// Add click handler to show player stats modal
		playerCard.addEventListener("click", function () {
			showPlayerStatsModal(
				i,
				sorted_playerlist,
				players,
				game,
				gameScore,
				bets,
				game.getTricks(),
				score_change
			);
		});

		if (topPlayersContainer) {
			topPlayersContainer.appendChild(playerCard);
		}
	}

	const tabNavigation = document.getElementById("tab_navigation");
	if (game.getRound() == 1 || game.getRound() == 2) {
		if (tabNavigation) tabNavigation.style.display = "none";
	} else {
		//Graph
		let score_chart: Chart;

		if (tabNavigation) tabNavigation.style.display = "";

		const existingChart = document.getElementById("chart");
		if (existingChart) existingChart.remove();

		const chartContainer = document.getElementById("chart_container");
		if (chartContainer) {
			const canvas = document.createElement("canvas");
			canvas.id = "chart";
			chartContainer.appendChild(canvas);
		}
		let ctx: CanvasRenderingContext2D = (
			document.getElementById("chart") as HTMLCanvasElement
		).getContext("2d");
		score_chart?.destroy();

		let graph_score: number[][];
		if (game.getRuleAltcount()) {
			graph_score = [...game.getAltScore()];
		} else {
			graph_score = [...game.getScore()];
		}
		let zero_line: number[] = [];
		for (let i = 0; i < players.length; i++) {
			zero_line.push(0);
		}
		graph_score.unshift(zero_line);

		//chartjs config that displays the rounds on the x axis and the scores on the y axis while having a own line for each playe
		score_chart = new Chart(ctx, {
			type: "line",
			data: {
				labels: graph_score.map((graph_score, index) => index + 1),
				datasets: players.map((pplayer, index) => ({
					label: pplayer,
					data: graph_score.map((graph_score) => graph_score[index]),
					borderColor: `hsl(${(index * 360) / players.length}, 100%, 50%)`,
					fill: false,
					cubicInterpolationMode: "monotone",
				})),
			},
			options: {
				responsive: true,
				maintainAspectRatio: false,
				scales: {
					x: {
						display: true,
						title: {
							display: true,
							text: "Round",
						},
					},
					y: {
						display: true,
						title: {
							display: true,
							text: "Points",
						},
					},
				},
				plugins: {
					legend: {
						labels: {
							usePointStyle: true,
						},
					},
				},
			},
		});

		//Analytics
		const tabAnalytics = document.getElementById("tab_analytics");
		if (tabAnalytics) tabAnalytics.style.display = "";

		//analyze the score_change and save the highest and lowest score
		let score_change_max_points = 0;
		let score_change_max_round = 0;
		let score_change_max_index = 0;
		let score_change_max_bet;
		let score_change_max_tricks;
		let score_change_min_points = 1000;
		let score_change_min_round = 1000;
		let score_change_min_index = 1000;
		let score_change_min_bet;
		let score_change_min_tricks;

		for (let i = 0; i < score_change.length; i++) {
			for (let j = 0; j < score_change[i].length; j++) {
				if (score_change[i][j] > score_change_max_points) {
					score_change_max_points = score_change[i][j];
					score_change_max_round = i;
					score_change_max_index = j;
				}
				if (score_change[i][j] < score_change_min_points) {
					score_change_min_points = score_change[i][j];
					score_change_min_round = i;
					score_change_min_index = j;
				}
			}
		}
		//get the bets and tricks
		let tricks = game.getTricks();
		let bets = game.getBets();
		//get the highest and lowest bet and tricks
		score_change_max_bet =
			bets[score_change_max_round][score_change_max_index];
		score_change_max_tricks =
			tricks[score_change_max_round][score_change_max_index];
		score_change_min_bet =
			bets[score_change_min_round][score_change_min_index];
		score_change_min_tricks =
			tricks[score_change_min_round][score_change_min_index];

		//remove the minus sign from the lowest score
		score_change_min_points = score_change_min_points * -1;

		//display the highest and lowest score in the analytics
		const bestBetName = document.getElementById("best_bet_name");
		const bestBetDesc = document.getElementById("best_bet_desc");
		const worstBetName = document.getElementById("worst_bet_name");
		const worstBetDesc = document.getElementById("worst_bet_desc");

		if (bestBetName)
			bestBetName.textContent = players[score_change_max_index];
		if (bestBetDesc)
			bestBetDesc.textContent =
				"Made " +
				score_change_max_points +
				" points in round " +
				(score_change_max_round + 1) +
				" with a bet of " +
				score_change_max_bet +
				" and " +
				score_change_max_tricks +
				" tricks";

		if (worstBetName)
			worstBetName.textContent = players[score_change_min_index];
		if (worstBetDesc)
			worstBetDesc.textContent =
				"Lost " +
				score_change_min_points +
				" points in round " +
				(score_change_min_round + 1) +
				" with a bet of " +
				score_change_min_bet +
				" and " +
				score_change_min_tricks +
				" tricks";

		//loop over players
		const playerStatsContainer = document.getElementById("player_stats");
		if (playerStatsContainer) playerStatsContainer.innerHTML = "";
		for (let i = 0; i < playerlist.length; i++) {
			//calculate the bet accuracy
			let bet_accuracy = 0;
			let bet_accuracy_rounds = 0;
			let total_bet_difference = 0; // total difference between bets and actual results
			let average_bet = 0;
			let average_bet_rounds = 0;
			for (let j = 0; j < bets.length; j++) {
				average_bet = Number(average_bet) + Number(bets[j][i]);
				average_bet_rounds++;
				if (tricks.length > j) {
					if (bets[j][i] == tricks[j][i]) {
						bet_accuracy++;
					}
					bet_accuracy_rounds++;
					total_bet_difference += bets[j][i] - tricks[j][i]; // calculate the difference for each round
				}
			}
			bet_accuracy = (bet_accuracy / bet_accuracy_rounds) * 100;
			bet_accuracy = Math.round(bet_accuracy);

			//calculate the average bet difference
			let average_bet_difference =
				total_bet_difference / bet_accuracy_rounds;
			//round the average bet difference to 2 decimals
			average_bet_difference =
				Math.round(average_bet_difference * 100) / 100;

			let average_difference_value;
			let average_difference_desc;
			//text for the average bet difference
			if (average_bet_difference > 0) {
				average_difference_value = "too high";
				average_difference_desc =
					"bets on average " + average_bet_difference + " too high";
			} else if (average_bet_difference < 0) {
				average_difference_value = "too low";
				average_difference_desc =
					"bets on average " +
					average_bet_difference * -1 +
					" too low";
			} else {
				average_difference_value = "correct";
				average_difference_desc = "bets on average correct";
			}

			//average bet
			average_bet = average_bet / bets.length;
			//round the average bet to 2 decimals
			average_bet = Math.round(average_bet * 100) / 100;

			// Create player stats section safely
			const playerStatsDiv = document.createElement("div");
			playerStatsDiv.innerHTML = `
      <div class="pb-5">
        <h2 class="pt-10 text-3xl player-stats-name"></h2>
      </div>
      <div class="stats stats-vertical sm:stats-horizontal shadow w-full">
        <div class="stat mx-auto w-60">
          <div class="stat-figure text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              viewBox="0 0 24 24"
              class="inline-block w-8 h-8"
              ><path
                d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,10.84 21.79,9.69 21.39,8.61L19.79,10.21C19.93,10.8 20,11.4 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.6,4 13.2,4.07 13.79,4.21L15.4,2.6C14.31,2.21 13.16,2 12,2M19,2L15,6V7.5L12.45,10.05C12.3,10 12.15,10 12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12C14,11.85 14,11.7 13.95,11.55L16.5,9H18L22,5H19V2M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12H16A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8V6Z"
              ></path></svg
            >
          </div>
          <div class="stat-value">${bet_accuracy}%</div>
          <div class="stat-title">Bet accuarcy</div>
        </div>
        
        <div class="stat mx-auto w-60">
          <div class="stat-figure text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#d97fbe"
              viewBox="0 0 24 24"
              class="inline-block w-8 h-8 fill-current"
              ><path
                d="M12,14A2,2 0 0,1 14,16A2,2 0 0,1 12,18A2,2 0 0,1 10,16A2,2 0 0,1 12,14M23.46,8.86L21.87,15.75L15,14.16L18.8,11.78C17.39,9.5 14.87,8 12,8C8.05,8 4.77,10.86 4.12,14.63L2.15,14.28C2.96,9.58 7.06,6 12,6C15.58,6 18.73,7.89 20.5,10.72L23.46,8.86Z"
              ></path></svg
            >
          </div>
          <div class="stat-value text-primary" style="color:#d97fbe;">${average_difference_value}</div>
          <div class="stat-desc">${average_difference_desc}</div>
        </div>
        
        <div class="stat mx-auto w-60">
          <div class="stat-figure text-secondary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="#76c4ee"
              class="inline-block w-8 h-8 fill-current"
              ><path
                d="M18.5,3.5L3.5,18.5L5.5,20.5L20.5,5.5M7,4A3,3 0 0,0 4,7A3,3 0 0,0 7,10A3,3 0 0,0 10,7A3,3 0 0,0 7,4M17,14A3,3 0 0,0 14,17A3,3 0 0,0 17,20A3,3 0 0,0 20,17A3,3 0 0,0 17,14Z"
              ></path></svg
            >
          </div>
          <div class="stat-value text-secondary">${average_bet}</div>
          <div class="stat-desc">Average Bet</div>
        </div>
        </div>
        </div>`;

			// Safely set the player name
			const playerNameElement =
				playerStatsDiv.querySelector(".player-stats-name");
			if (playerNameElement) {
				playerNameElement.textContent = playerlist[i][0];
			}

			if (playerStatsContainer) {
				playerStatsContainer.appendChild(playerStatsDiv);
			}
		}
	}

	if (game.getStep() == 3) {
		const navtext = document.getElementById("navtext");
		if (navtext) navtext.textContent = "Save and Quit";

		podium(sorted_playerlist);
		confettilauncher();
		//bind onclick to launch confetti
		const questionButton = document.getElementById("questionbutton");
		if (questionButton) {
			questionButton.addEventListener("click", () => {
				confettilauncher();
			});
			//remove onclick attribute
			questionButton.removeAttribute("onclick");
			//change ? to an confetti emoji
			questionButton.textContent = "🎉";
		}
	}
}

let celebtime = 250;
function podium(sorted_playerlist) {
	add_podium(sorted_playerlist);

	//animate podium
	const podiumElements = document.querySelectorAll(".js-podium");
	podiumElements.forEach((element) => {
		const podiumEl = element as HTMLElement;
		setTimeout(function () {
			podiumEl.classList.add("is-visible");
			const height = podiumEl.dataset.height;
			const baseElement = podiumEl.querySelector(
				".scoreboard__podium-base"
			) as HTMLElement;
			if (baseElement && height) {
				baseElement.style.height = height + "px";
				baseElement.classList.add("is-expanding");
			}
		}, celebtime);
		celebtime += 250;
	});
	add_bottomlist(sorted_playerlist);
}

function add_bottomlist(sorted_playerlist) {
	const scoreboardItems = document.getElementById("scoreboard_items");
	if (scoreboardItems) scoreboardItems.innerHTML = "";

	for (let i = 3; i < sorted_playerlist.length; i++) {
		const listItem = document.createElement("li");
		listItem.className = "scoreboard__item";
		listItem.id = `item_${i}`;
		listItem.innerHTML = `
        <div class="scoreboard__title bottom-player-name"></div>
        <div class="scoreboard__numbers">
          <span class="js-number bottom-player-score"></span>
        </div>
        <div class="scoreboard__bar js-bar">
          <div class="scoreboard__bar-bar" id="bar_${i}"></div>
        </div>`;

		// Safely set the player name and score
		const playerNameElement = listItem.querySelector(".bottom-player-name");
		const playerScoreElement = listItem.querySelector(
			".bottom-player-score"
		);

		if (playerNameElement)
			playerNameElement.textContent = sorted_playerlist[i][0];
		if (playerScoreElement)
			playerScoreElement.textContent = sorted_playerlist[i][1];

		if (scoreboardItems) scoreboardItems.appendChild(listItem);

		const barElement = document.getElementById(`bar_${i}`) as HTMLElement;
		if (barElement) {
			barElement.style.width =
				(sorted_playerlist[i][1] / sorted_playerlist[2][1]) * 100 + "%";
		}

		setTimeout(function () {
			const itemElement = document.getElementById(`item_${i}`);
			if (itemElement) itemElement.classList.add("is-visible");
		}, celebtime);
	}
}

function add_podium(sorted_playerlist) {
	const scoreboardPodium = document.getElementById("scoreboard_podium");
	if (scoreboardPodium) scoreboardPodium.innerHTML = "";

	append_graph(
		sorted_playerlist[1][3],
		sorted_playerlist[1][0],
		sorted_playerlist[1][1]
	);
	if (sorted_playerlist.length == 1) return;
	append_graph(
		sorted_playerlist[0][3],
		sorted_playerlist[0][0],
		sorted_playerlist[0][1]
	);
	if (sorted_playerlist.length == 2) return;
	append_graph(
		sorted_playerlist[2][3],
		sorted_playerlist[2][0],
		sorted_playerlist[2][1]
	);
}

function append_graph(place, name, score) {
	const scoreboardPodium = document.getElementById("scoreboard_podium");
	if (!scoreboardPodium) return;

	switch (place) {
		case 1:
			const podium1 = document.createElement("div");
			podium1.className = "scoreboard__podium js-podium";
			podium1.dataset.height = "250";
			podium1.innerHTML = `
                <div class="scoreboard__podium-base scoreboard__podium-base--first">
                  <div class="scoreboard__podium-rank">1</div>
                </div>
                <div class="scoreboard__podium-number">
                  <p class="scoreboard__text podium-name"></p>
                  <small><span class="js-podium-data podium-score"></span></small>
                </div>`;

			const podium1Name = podium1.querySelector(".podium-name");
			const podium1Score = podium1.querySelector(".podium-score");
			if (podium1Name) podium1Name.textContent = name;
			if (podium1Score) podium1Score.textContent = score;
			scoreboardPodium.appendChild(podium1);
			break;
		case 2:
			const podium2 = document.createElement("div");
			podium2.className = "scoreboard__podium js-podium";
			podium2.dataset.height = "200";
			podium2.innerHTML = `
                <div class="scoreboard__podium-base scoreboard__podium-base--second">
                  <div class="scoreboard__podium-rank">2</div>
                </div>
                <div class="scoreboard__podium-number">
                  <p class="scoreboard__text podium-name"></p>
                  <small><span class="js-podium-data podium-score"></span></small>
                </div>`;

			const podium2Name = podium2.querySelector(".podium-name");
			const podium2Score = podium2.querySelector(".podium-score");
			if (podium2Name) podium2Name.textContent = name;
			if (podium2Score) podium2Score.textContent = score;
			scoreboardPodium.appendChild(podium2);
			break;
		case 3:
			const podium3 = document.createElement("div");
			podium3.className = "scoreboard__podium js-podium";
			podium3.dataset.height = "150";
			podium3.innerHTML = `
                 <div class="scoreboard__podium-base scoreboard__podium-base--third">
                   <div class="scoreboard__podium-rank">3</div>
                 </div>
                 <div class="scoreboard__podium-number">
                   <p class="scoreboard__text podium-name"></p>
                   <small><span class="js-podium-data podium-score"></span></small>
                 </div>`;

			const podium3Name = podium3.querySelector(".podium-name");
			const podium3Score = podium3.querySelector(".podium-score");
			if (podium3Name) podium3Name.textContent = name;
			if (podium3Score) podium3Score.textContent = score;
			scoreboardPodium.appendChild(podium3);
			break;
	}
}

var duration;
var end;

function confettilauncher() {
	//if confetti is already running then set end to now
	if (Date.now() < end) {
		end = Date.now();
		return;
	}
	duration = 20 * 1000;
	end = Date.now() + duration;
	confetticannon();
}

function confetticannon() {
	// launch a few confetti from the left edge
	if (window.innerWidth < 768) {
		confetti({
			particleCount: 2,
			angle: 60,
			spread: 60,
			origin: { x: 0 },
		});
		// and launch a few from the right edge
		confetti({
			particleCount: 2,
			angle: 120,
			spread: 60,
			origin: { x: 1 },
		});
	} else {
		// launch a few confetti from the left edge
		confetti({
			particleCount: 5,
			angle: 60,
			spread: 60,
			origin: { x: 0 },
		});
		// and launch a few from the right edge
		confetti({
			particleCount: 5,
			angle: 120,
			spread: 60,
			origin: { x: 1 },
		});
	}

	// keep going until we are out of time
	if (Date.now() < end) {
		requestAnimationFrame(confetticannon);
	}
}

function showPlayerStatsModal(
	playerIndex: number,
	sorted_playerlist: any[],
	players: string[],
	game: gamedata,
	gameScore: number[][],
	bets: number[][],
	tricks: number[][],
	score_change: number[][]
) {
	Logger.event("player.modal.open", { playerIndex });
	// Find the actual player index in the original players array
	const playerName = sorted_playerlist[playerIndex][5]; // Use the name without decoration
	const actualPlayerIndex = players.indexOf(playerName);

	if (actualPlayerIndex === -1) return;

	// Set player name and rank
	const modalPlayerName = document.getElementById("modal_player_name");
	const modalTotalScore = document.getElementById("modal_total_score");

	if (modalPlayerName)
		modalPlayerName.textContent = sorted_playerlist[playerIndex][0];
	if (modalTotalScore)
		modalTotalScore.textContent = sorted_playerlist[playerIndex][1];

	// Check if we have any game data yet
	const hasGameData =
		bets.length > 0 || tricks.length > 0 || gameScore.length > 0;

	const modalRoundsTable = document.getElementById("modal_rounds_table");

	if (!hasGameData) {
		// hide modal content at the start of the game
		if (modalRoundsTable) modalRoundsTable.innerHTML = "";

		const noDataRow = document.createElement("tr");
		noDataRow.innerHTML = `
			<td colspan="4" class="text-center text-base-content/60 py-8">
				No round data available yet. Start playing to see statistics!
			</td>`;
		if (modalRoundsTable) modalRoundsTable.appendChild(noDataRow);

		const modalPlayerStats =
			document.querySelectorAll(".modal_player_stat");
		modalPlayerStats.forEach(
			(stat) => ((stat as HTMLElement).style.display = "none")
		);

		// Show the modal
		(
			document.getElementById("modal_player_stats") as HTMLDialogElement
		).showModal();
		return;
	}

	const modalPlayerStats = document.querySelectorAll(".modal_player_stat");
	modalPlayerStats.forEach(
		(stat) => ((stat as HTMLElement).style.display = "block")
	);

	// Calculate and set bet accuracy
	let betAccuracy = 0;
	let accurateRounds = 0;
	let totalRounds = 0;
	let totalBetDifference = 0;
	let totalBets = 0;

	for (let round = 0; round < bets.length; round++) {
		if (tricks.length > round) {
			if (
				bets[round][actualPlayerIndex] ===
				tricks[round][actualPlayerIndex]
			) {
				accurateRounds++;
			}
			totalBetDifference += Math.abs(
				bets[round][actualPlayerIndex] -
					tricks[round][actualPlayerIndex]
			);
			totalRounds++;
		}
		totalBets += bets[round][actualPlayerIndex];
	}

	const accuracy =
		totalRounds > 0 ? Math.round((accurateRounds / totalRounds) * 100) : 0;
	const avgBet =
		bets.length > 0 ? Math.round((totalBets / bets.length) * 100) / 100 : 0;

	const modalBetAccuracy = document.getElementById("modal_bet_accuracy");
	const modalAvgBet = document.getElementById("modal_avg_bet");

	if (modalBetAccuracy) modalBetAccuracy.textContent = accuracy + "%";
	if (modalAvgBet) modalAvgBet.textContent = avgBet.toString();

	// Populate round-by-round table
	if (modalRoundsTable) modalRoundsTable.innerHTML = "";

	const roundsToShow = Math.max(
		game.getRound(),
		bets.length,
		tricks.length,
		gameScore.length
	);

	for (let round = 0; round < roundsToShow; round++) {
		const bet = bets.length > round ? bets[round][actualPlayerIndex] : "-";
		const trick =
			tricks.length > round ? tricks[round][actualPlayerIndex] : "-";
		const points =
			gameScore.length > round
				? gameScore[round][actualPlayerIndex]
				: "-";
		const pointChange =
			score_change.length > round
				? score_change[round][actualPlayerIndex]
				: 0;

		// Determine if bet was accurate (only if we have both bet and trick data)
		const isAccurate = bet !== "-" && trick !== "-" ? bet === trick : false;
		const rowClass =
			bet !== "-" && trick !== "-"
				? isAccurate
					? "bg-success/20"
					: "bg-error/20"
				: "";

		const row = document.createElement("tr");
		row.className = rowClass;
		row.innerHTML = `
			<td class="font-semibold">${round + 1}</td>
			<td>${bet}</td>
			<td>${trick}</td>
			<td>${points}</td>`;

		if (modalRoundsTable) modalRoundsTable.appendChild(row);
	}

	// Show the modal
	(
		document.getElementById("modal_player_stats") as HTMLDialogElement
	).showModal();

	// Store player data for edit functionality
	(globalThis as any).currentEditPlayerData = {
		playerIndex: playerIndex,
		actualPlayerIndex: actualPlayerIndex,
		sorted_playerlist: sorted_playerlist,
		players: players,
		game: game,
		gameScore: gameScore,
		bets: bets,
		tricks: tricks,
		score_change: score_change,
	};
}

// Variables to store current edit data
let currentEditPlayerData: any = null;

// Function to open the edit player modal
function openEditPlayerModal() {
	Logger.event("player.modal.open");
	const data = (globalThis as any).currentEditPlayerData;
	if (!data) return;

	const playerName = data.sorted_playerlist[data.playerIndex][5];

	// Set player name in display and input
	const editPlayerNameDisplay = document.getElementById(
		"edit_player_name_display"
	);
	const editPlayerNameInput = document.getElementById(
		"edit_player_name_input"
	) as HTMLInputElement;

	if (editPlayerNameDisplay) editPlayerNameDisplay.textContent = playerName;
	if (editPlayerNameInput) editPlayerNameInput.value = playerName;

	// Populate the rounds table for editing
	const editRoundsTable = document.getElementById("edit_rounds_table");
	if (editRoundsTable) editRoundsTable.innerHTML = "";

	const roundsToShow = Math.max(
		data.game.getRound(),
		data.bets.length,
		data.tricks.length,
		data.gameScore.length
	);

	for (let round = 0; round < roundsToShow; round++) {
		// Check if data exists for this round
		const hasBetData = data.bets.length > round;
		const hasTrickData = data.tricks.length > round;
		const hasScoreChangeData = data.score_change.length > round;

		const bet = hasBetData ? data.bets[round][data.actualPlayerIndex] : "-";
		const trick = hasTrickData
			? data.tricks[round][data.actualPlayerIndex]
			: "-";
		const scoreChange = hasScoreChangeData
			? data.score_change[round][data.actualPlayerIndex]
			: "-";

		// Create input fields or display values based on data availability
		const betField = hasBetData
			? `<input type="number" min="0" max="${round + 1}" value="${bet}" 
               class="input input-sm input-bordered w-20" 
               data-round="${round}" data-type="bet" />`
			: `<span class="text-base-content/60">-</span>`;

		const trickField = hasTrickData
			? `<input type="number" min="0" max="${round + 1}" value="${trick}" 
               class="input input-sm input-bordered w-20" 
               data-round="${round}" data-type="trick" />`
			: `<span class="text-base-content/60">-</span>`;

		const row = document.createElement("tr");
		row.innerHTML = `
			<td class="font-semibold">${round + 1}</td>
			<td>${betField}</td>
			<td>${trickField}</td>
			<td class="text-center font-semibold" data-round="${round}" data-type="points">${scoreChange}</td>`;

		if (editRoundsTable) editRoundsTable.appendChild(row);
	}

	// Add event listeners for real-time score calculation (only for editable inputs)
	const editInputs = document.querySelectorAll<HTMLInputElement>(
		"#edit_rounds_table input"
	);
	editInputs.forEach((input) => {
		input.addEventListener("input", recalculatePointsForEdit);
		input.addEventListener("change", recalculatePointsForEdit);
	});

	// Close the player stats modal and open edit modal
	(
		document.getElementById("modal_player_stats") as HTMLDialogElement
	).close();
	(
		document.getElementById("modal_edit_player") as HTMLDialogElement
	).showModal();
	Logger.event("player.modal.edit.open");
}

// Function to recalculate points when bets or tricks change
function recalculatePointsForEdit() {
	const data = (globalThis as any).currentEditPlayerData;
	if (!data) return;

	const editRoundsTable = document.getElementById("edit_rounds_table");
	if (editRoundsTable) {
		const tableRows = editRoundsTable.querySelectorAll("tr");
		tableRows.forEach((row, index) => {
			const round = index;
			const betInput = row.querySelector<HTMLInputElement>(
				`input[data-round="${round}"][data-type="bet"]`
			);
			const trickInput = row.querySelector<HTMLInputElement>(
				`input[data-round="${round}"][data-type="trick"]`
			);
			const pointsCell = row.querySelector<HTMLElement>(
				`td[data-round="${round}"][data-type="points"]`
			);

			// Only recalculate if both inputs exist and are editable
			if (betInput && trickInput && pointsCell) {
				const bet = parseInt(betInput.value) || 0;
				const trick = parseInt(trickInput.value) || 0;

				let scoreChange = 0;
				if (data.game.getRuleAltcount()) {
					// Use alternative scoring
					scoreChange = altscorecalc(bet, trick, round + 1);
				} else {
					// Use classic scoring
					scoreChange = scorecalc(bet, trick);
				}

				pointsCell.textContent = scoreChange.toString();
			} else if (pointsCell) {
				// If inputs don't exist but we have score change data, keep the original score change
				const hasScoreChangeData = data.score_change.length > round;
				if (!hasScoreChangeData) {
					pointsCell.textContent = "-";
				}
				// If hasScoreChangeData is true, the original score change is already displayed
			}
		});
	}
}

// Function to save the edited player data
function saveEditedPlayerData() {
	const data = (globalThis as any).currentEditPlayerData;
	if (!data) return;

	const editPlayerNameInput = document.getElementById(
		"edit_player_name_input"
	) as HTMLInputElement;
	const newPlayerName = editPlayerNameInput ? editPlayerNameInput.value : "";
	const originalName = data.sorted_playerlist[data.playerIndex][5];

	// Update player name if changed
	if (newPlayerName !== originalName && newPlayerName.trim() !== "") {
		data.game.renamePlayer(data.actualPlayerIndex, newPlayerName.trim());
		// Update the players array
		data.players[data.actualPlayerIndex] = newPlayerName.trim();
	}

	// Collect all the new bets and tricks (only for rounds that have editable inputs)
	const newBets = [...data.game.getBets()];
	const newTricks = [...data.game.getTricks()];

	const editRoundsTable = document.getElementById("edit_rounds_table");
	if (editRoundsTable) {
		const tableRows = editRoundsTable.querySelectorAll("tr");
		tableRows.forEach((row, index) => {
			const round = index;
			const betInput = row.querySelector<HTMLInputElement>(
				`input[data-round="${round}"][data-type="bet"]`
			);
			const trickInput = row.querySelector<HTMLInputElement>(
				`input[data-round="${round}"][data-type="trick"]`
			);

			// Only update values that have editable input fields
			if (betInput) {
				const bet = parseInt(betInput.value) || 0;

				// Ensure the arrays exist for this round
				if (!newBets[round])
					newBets[round] = new Array(data.players.length).fill(0);
				newBets[round][data.actualPlayerIndex] = bet;
			}

			if (trickInput) {
				const trick = parseInt(trickInput.value) || 0;

				// Ensure the arrays exist for this round
				if (!newTricks[round])
					newTricks[round] = new Array(data.players.length).fill(0);
				newTricks[round][data.actualPlayerIndex] = trick;
			}
		});
	}

	// Update the game data
	data.game.setBets(newBets);
	data.game.setTricks(newTricks);

	// Recalculate all scores
	recalculateAllScores(data.game, data.players);

	// Save the game if not in demo mode
	if (!(globalThis as any).demomode) {
		data.game.save();
	}

	// Close edit modal and refresh the views
	(document.getElementById("modal_edit_player") as HTMLDialogElement).close();
	Logger.event("player.modal.edit.save", {
		player: newPlayerName || originalName,
	});

	// Refresh the score view
	updatescore(data.players, data.game);

	// Reopen the player stats modal with updated data
	setTimeout(() => {
		// Get updated data
		const updatedBets = [...data.game.getBets()];
		const updatedGameScore: number[][] = data.game.getRuleAltcount()
			? [...data.game.getAltScore()]
			: [...data.game.getScore()];
		const updatedScore_change: number[][] = data.game.getRuleAltcount()
			? [...data.game.getAltScoreChange()]
			: [...data.game.getScoreChange()];
		const updatedTricks = [...data.game.getTricks()];

		// Recreate sorted player list
		let updatedSorted_playerlist = [];
		if (data.game.getRound() > 1) {
			for (let i = 0; i < data.players.length; i++) {
				updatedSorted_playerlist[i] = [
					data.players[i],
					updatedGameScore[updatedGameScore.length - 1][i],
					updatedBets[updatedBets.length - 1]
						? updatedBets[updatedBets.length - 1][i]
						: 0,
					0, // place will be calculated
					data.game.getDealer() === i ? 1 : 0,
					data.players[i],
				];
			}
			updatedSorted_playerlist.sort(function (a, b) {
				return b[1] - a[1];
			});

			// Add ranks and crowns
			let max = updatedSorted_playerlist[0][1];
			let currentPlace = 1;
			let lastScore = updatedSorted_playerlist[0][1];
			for (let i = 0; i < updatedSorted_playerlist.length; i++) {
				if (updatedSorted_playerlist[i][1] == max)
					updatedSorted_playerlist[i][0] =
						updatedSorted_playerlist[i][0] + " 👑";
				if (updatedSorted_playerlist[i][1] != lastScore)
					currentPlace = i + 1;
				updatedSorted_playerlist[i][0] =
					currentPlace + ". " + updatedSorted_playerlist[i][0];
				updatedSorted_playerlist[i][3] = currentPlace;
				lastScore = updatedSorted_playerlist[i][1];
			}
		}

		// Find the updated player index in the sorted list
		const updatedPlayerName = data.players[data.actualPlayerIndex];
		let updatedPlayerIndex = -1;
		for (let i = 0; i < updatedSorted_playerlist.length; i++) {
			if (updatedSorted_playerlist[i][5] === updatedPlayerName) {
				updatedPlayerIndex = i;
				break;
			}
		}

		if (updatedPlayerIndex !== -1) {
			showPlayerStatsModal(
				updatedPlayerIndex,
				updatedSorted_playerlist,
				data.players,
				data.game,
				updatedGameScore,
				updatedBets,
				updatedTricks,
				updatedScore_change
			);
		}
	}, 100);
}

// Function to cancel editing and return to player stats
function cancelEditPlayerData() {
	// Close edit modal and reopen player stats modal
	(document.getElementById("modal_edit_player") as HTMLDialogElement).close();
	(
		document.getElementById("modal_player_stats") as HTMLDialogElement
	).showModal();
	Logger.event("player.modal.edit.cancel");
}

// Function to recalculate all scores for all players
function recalculateAllScores(game: gamedata, players: string[]) {
	const bets = game.getBets();
	const tricks = game.getTricks();
	const rounds = Math.max(bets.length, tricks.length);

	// Initialize score arrays
	const newScore: number[][] = [];
	const newScoreChange: number[][] = [];
	const newAltScore: number[][] = [];
	const newAltScoreChange: number[][] = [];

	for (let round = 0; round < rounds; round++) {
		// Only calculate scores for rounds that have both bets and tricks data
		if (!bets[round] || !tricks[round]) continue;

		const roundScore: number[] = new Array(players.length);
		const roundScoreChange: number[] = new Array(players.length);
		const roundAltScore: number[] = new Array(players.length);
		const roundAltScoreChange: number[] = new Array(players.length);

		for (let player = 0; player < players.length; player++) {
			const bet = bets[round][player] || 0;
			const trick = tricks[round][player] || 0;

			// Calculate classic score
			const classicPoints = scorecalc(bet, trick);
			roundScoreChange[player] = classicPoints;

			// Calculate alternative score
			const altPoints = altscorecalc(bet, trick, round + 1);
			roundAltScoreChange[player] = altPoints;

			// Calculate cumulative scores
			const prevClassicScore =
				round > 0 && newScore[round - 1]
					? newScore[round - 1][player]
					: 0;
			const prevAltScore =
				round > 0 && newAltScore[round - 1]
					? newAltScore[round - 1][player]
					: 0;

			roundScore[player] = prevClassicScore + classicPoints;
			roundAltScore[player] = prevAltScore + altPoints;
		}

		newScore[round] = roundScore;
		newScoreChange[round] = roundScoreChange;
		newAltScore[round] = roundAltScore;
		newAltScoreChange[round] = roundAltScoreChange;
	}

	// Update the game with new scores
	game.setScore(newScore);
	game.setScoreChange(newScoreChange);
	game.setAltScore(newAltScore);
	game.setAltScoreChange(newAltScoreChange);
}

// Initialize edit button click handlers when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
	const editPlayerButton = document.getElementById("edit_player_button");
	if (editPlayerButton) {
		editPlayerButton.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			openEditPlayerModal();
		});
	}

	const editPlayerSave = document.getElementById("edit_player_save");
	if (editPlayerSave) {
		editPlayerSave.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			saveEditedPlayerData();
		});
	}

	const editPlayerCancel = document.getElementById("edit_player_cancel");
	if (editPlayerCancel) {
		editPlayerCancel.addEventListener("click", function (e) {
			e.preventDefault();
			e.stopPropagation();
			cancelEditPlayerData();
		});
	}

	// Also handle the close button (X) as cancel
	const modalEditPlayer = document.getElementById("modal_edit_player");
	if (modalEditPlayer) {
		const closeButton = modalEditPlayer.querySelector(".btn-circle");
		if (closeButton) {
			closeButton.addEventListener("click", function (e) {
				cancelEditPlayerData();
			});
		}
	}
});

// Add the scoring functions directly here to avoid dependency issues
function scorecalc(bet: number, trick: number): number {
	if (bet == trick) {
		return 20 + bet * 10;
	} else {
		return Math.abs(bet - trick) * -10;
	}
}

function altscorecalc(bet: number, trick: number, round: number): number {
	if (bet === trick) {
		// trick points + 10 points per card in the round
		return bet * 10 + round * 10;
	} else {
		// Wrong prediction: trick points minus penalty
		const deviation = Math.abs(bet - trick);
		return bet * 10 - 10 * ((deviation * (deviation + 1)) / 2);
	}
}
