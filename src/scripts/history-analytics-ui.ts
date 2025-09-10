import { PlayerAnalytics } from "./player-analytics.ts";
import type { PlayerStatistics, SortOption } from "./player-analytics.ts";
import { GameData as gamedata } from "./game/gamedata.ts";
import { Logger } from "./logger.ts";

export class HistoryAnalyticsUI {
	private analytics: PlayerAnalytics;
	private currentSortOption: SortOption;
	private searchTerm: string = "";

	constructor(games: gamedata[]) {
		this.analytics = new PlayerAnalytics(games);
		this.currentSortOption = this.analytics.getAvailableSortOptions()[0]; // Default to most games played
		this.initializeUI();
	}

	private initializeUI(): void {
		this.setupTabNavigation();
		this.populateSortOptions();
		this.setupSortHandler();
		this.setupSearchHandler();
		this.renderAnalyticsTable();
	}

	private setupTabNavigation(): void {
		const pastGamesTab = document.getElementById("past-games-tab");
		const playerAnalyticsTab = document.getElementById(
			"player-analytics-tab"
		);
		const pastGamesView = document.getElementById("past_games");
		const playerAnalyticsView = document.getElementById("player_analytics");

		if (
			!pastGamesTab ||
			!playerAnalyticsTab ||
			!pastGamesView ||
			!playerAnalyticsView
		) {
			Logger.error("Required tab elements not found");
			return;
		}

		pastGamesTab.addEventListener("click", () => {
			// Switch to past games view
			pastGamesTab.classList.add("active");
			playerAnalyticsTab.classList.remove("active");
			pastGamesView.classList.remove("hidden");
			playerAnalyticsView.classList.add("hidden");
			Logger.event("tab.switch.history", { to: "past_games" });
		});

		playerAnalyticsTab.addEventListener("click", () => {
			// Switch to analytics view
			playerAnalyticsTab.classList.add("active");
			pastGamesTab.classList.remove("active");
			playerAnalyticsView.classList.remove("hidden");
			pastGamesView.classList.add("hidden");
			Logger.event("tab.switch.history", { to: "player_analytics" });
		});
	}

	private populateSortOptions(): void {
		const sortSelect = document.getElementById(
			"sort-select"
		) as HTMLSelectElement;
		if (!sortSelect) {
			Logger.error("Sort select element not found");
			return;
		}

		sortSelect.innerHTML = "";
		const sortOptions = this.analytics.getAvailableSortOptions();

		sortOptions.forEach((option) => {
			const optionElement = document.createElement("option");
			optionElement.value = JSON.stringify(option);
			optionElement.textContent = option.label;
			sortSelect.appendChild(optionElement);
		});

		// Set default selection
		sortSelect.value = JSON.stringify(this.currentSortOption);
	}

	private setupSortHandler(): void {
		const sortSelect = document.getElementById(
			"sort-select"
		) as HTMLSelectElement;
		if (!sortSelect) return;

		sortSelect.addEventListener("change", (event) => {
			const target = event.target as HTMLSelectElement;
			try {
				this.currentSortOption = JSON.parse(target.value);
				this.renderAnalyticsTable();
			} catch (error) {
				Logger.error("Error parsing sort option", {
					error: (error as Error)?.message,
				});
			}
		});
	}

	private setupSearchHandler(): void {
		const searchInput = document.getElementById(
			"player-search"
		) as HTMLInputElement;
		if (!searchInput) return;

		searchInput.addEventListener("input", (event) => {
			const target = event.target as HTMLInputElement;
			this.searchTerm = target.value.toLowerCase().trim();
			this.renderAnalyticsTable();
		});
	}

	private renderAnalyticsTable(): void {
		const cardsContainer = document.getElementById(
			"player-cards-container"
		);
		if (!cardsContainer) {
			Logger.error("Player cards container not found");
			return;
		}

		// Clear existing cards
		cardsContainer.innerHTML = "";

		// Get sorted player stats
		let sortedStats = this.analytics.getSortedPlayerStats(
			this.currentSortOption.key,
			this.currentSortOption.ascending
		);

		// Filter by search term if provided
		if (this.searchTerm) {
			sortedStats = sortedStats.filter((stats) =>
				stats.name.toLowerCase().includes(this.searchTerm)
			);
		}

		Logger.debug(`Rendering ${sortedStats.length} player cards`);

		// Show no results message if search yields no results
		if (sortedStats.length === 0) {
			cardsContainer.innerHTML = `
        <div class="col-span-full text-center py-8">
          <div class="text-lg opacity-70">
            ${this.searchTerm ? "No players found matching your search." : "No player data available."}
          </div>
        </div>
      `;
			return;
		}

		// Create player cards
		sortedStats.forEach((stats, index) => {
			const card = this.createPlayerCard(stats, index);
			cardsContainer.appendChild(card);
		});

		// Add summary information
		this.renderSummaryInfo(sortedStats);
	}

	private createPlayerCard(
		stats: PlayerStatistics,
		index: number
	): HTMLElement {
		const card = document.createElement("div");
		card.classList.add("card", "mt-10", "bg-base-200", "w-full");

		// Add hover effect
		card.addEventListener("mouseenter", () => {
			card.classList.add("scale-105");
		});
		card.addEventListener("mouseleave", () => {
			card.classList.remove("scale-105");
		});

		// Add click handler to open detailed view
		card.addEventListener("click", () => {
			this.openPlayerDetails(stats);
			Logger.event("player.details.open", { player: stats.name });
		});

		const rankBadge =
			index < 3 ? this.getRankBadge(index + 1) : `#${index + 1}`;

		card.innerHTML = `
      <div class="w-full h-full">
        <span class="inline-block pl-3 pt-3">${stats.name}</span>
        <span class="float-right pr-3 pt-3">${rankBadge}</span>
        <div class="card-body">
          <div class="grid grid-cols-2 gap-2 text-sm">
            <div class="stat-item">
              <div class="font-semibold text-primary">${stats.gamesPlayed}</div>
              <div class="text-xs opacity-70">Games</div>
            </div>
            <div class="stat-item">
              <div class="font-semibold text-success">${stats.winPercentage.toFixed(1)}%</div>
              <div class="text-xs opacity-70">Win Rate</div>
            </div>
            <div class="stat-item">
              <div class="font-semibold text-info">${stats.averagePosition.toFixed(2)}</div>
              <div class="text-xs opacity-70">Avg Position</div>
            </div>
            <div class="stat-item">
              <div class="font-semibold text-secondary">${stats.averagePoints.toFixed(0)}</div>
              <div class="text-xs opacity-70">Avg Points</div>
            </div>
            <div class="stat-item">
              <div class="font-semibold text-accent">${stats.highestScore}</div>
              <div class="text-xs opacity-70">High Score</div>
            </div>
            <div class="stat-item">
              <div class="font-semibold text-warning">${stats.lowestScore}</div>
              <div class="text-xs opacity-70">Low Score</div>
            </div>
          </div>
        </div>
      </div>
      <div class="card--hover">
        <a>View Details</a>
      </div>
    `;

		return card;
	}

	private getRankBadge(rank: number): string {
		switch (rank) {
			case 1:
				return "🥇";
			case 2:
				return "🥈";
			case 3:
				return "🥉";
			default:
				return `#${rank}`;
		}
	}

	private openPlayerDetails(stats: PlayerStatistics): void {
		const modal = document.getElementById(
			"player_details_modal"
		) as HTMLDialogElement;
		const content = document.getElementById("player-details-content");

		if (!modal || !content) {
			Logger.error("Player details modal not found");
			return;
		}

		// Populate modal content with styling matching the about modal
		content.innerHTML = `
      <!-- Header -->
      <div class="flex items-center gap-3 mb-6">
        <svg class="w-8 h-8 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <h1 class="font-bold text-3xl">${stats.name}</h1>
      </div>

      <!-- Player Statistics -->
      <div class="space-y-6">
        <!-- Key Statistics -->
        <div class="p-3 sm:p-4 bg-primary/5 border border-primary/20 rounded-lg">
          <div class="flex items-start gap-2 sm:gap-3 mb-3 sm:mb-4">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-primary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"></path>
            </svg>
            <div class="flex-1">
              <h2 class="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Key Statistics</h2>
              <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
                <div class="flex items-center gap-2 p-2 bg-success/10 rounded text-sm sm:text-base">
                  <span class="text-lg sm:text-2xl">🏆</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">${stats.wins} Wins</div>
                    <div class="text-xs sm:text-sm opacity-70">${stats.winPercentage.toFixed(1)}% win rate</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 p-2 bg-info/10 rounded text-sm sm:text-base">
                  <span class="text-lg sm:text-2xl">🎯</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">${stats.averagePoints.toFixed(1)} Avg Points</div>
                    <div class="text-xs sm:text-sm opacity-70">${stats.totalPoints} total</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 p-2 bg-warning/10 rounded text-sm sm:text-base">
                  <span class="text-lg sm:text-2xl">📊</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">${stats.averagePosition.toFixed(2)} Avg Position</div>
                    <div class="text-xs sm:text-sm opacity-70">Lower is better</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 p-2 bg-secondary/10 rounded text-sm sm:text-base">
                  <span class="text-lg sm:text-2xl">🎮</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">${stats.gamesPlayed} Games</div>
                    <div class="text-xs sm:text-sm opacity-70">${stats.totalRounds} total rounds</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

		<!-- Bet Performance -->
		<div class="p-3 sm:p-4 bg-base-200 rounded-lg">
		  <div class="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
			<svg class="w-5 h-5 sm:w-6 sm:h-6 text-info flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4M7 7h10M7 11h10M7 15h6" />
			</svg>
			<div class="flex-1">
			  <h2 class="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Bet Performance</h2>
			  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
				<div class="flex items-center gap-2 p-2 bg-info/10 rounded text-sm sm:text-base">
				  <span class="text-lg sm:text-2xl">🎯</span>
				  <div class="flex-1 min-w-0">
					<div class="font-semibold truncate">Avg Bet</div>
					<div class="text-base sm:text-lg">${
						stats.averageBet !== undefined
							? stats.averageBet.toFixed(2)
							: "N/A"
					}</div>
				  </div>
				</div>
				<div class="flex items-center gap-2 p-2 bg-warning/10 rounded text-sm sm:text-base">
				  <span class="text-lg sm:text-2xl">📏</span>
				  <div class="flex-1 min-w-0">
					<div class="font-semibold truncate">Avg Deviation</div>
					<div class="text-base sm:text-lg">${
						stats.averageBetDeviation !== undefined
							? (stats.averageBetDeviation > 0
								? "+" + stats.averageBetDeviation.toFixed(2)
								: stats.averageBetDeviation.toFixed(2))
							: "N/A"
					}</div>
					<div class="text-xs opacity-70">Positive = overbet, negative = underbet</div>
				  </div>
				</div>
			  </div>
			</div>
		  </div>
		</div>

        <!-- Score Range -->
        <div class="p-3 sm:p-4 bg-base-200 rounded-lg">
          <div class="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-accent flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
            <div class="flex-1">
              <h2 class="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Score Range</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div class="flex items-center gap-2 p-2 bg-accent/10 rounded ${stats.bestGameId ? "cursor-pointer hover:bg-accent/20 transition-colors" : ""} text-sm sm:text-base" ${stats.bestGameId ? `onclick="window.location.href='?id=${stats.bestGameId}'"` : ""}>
                  <span class="text-lg sm:text-2xl">📈</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">${stats.highestScore} High Score</div>
                    <div class="text-xs sm:text-sm opacity-70">${stats.bestGameId ? "Tap to view game" : "Best performance"}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 p-2 bg-warning/10 rounded ${stats.worstGameId ? "cursor-pointer hover:bg-warning/20 transition-colors" : ""} text-sm sm:text-base" ${stats.worstGameId ? `onclick="window.location.href='?id=${stats.worstGameId}'"` : ""}>
                  <span class="text-lg sm:text-2xl">📉</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold truncate">${stats.lowestScore} Low Score</div>
                    <div class="text-xs sm:text-sm opacity-70">${stats.worstGameId ? "Tap to view game" : "Worst performance"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Position Performance -->
        <div class="p-3 sm:p-4 bg-base-200 rounded-lg">
          <div class="flex items-start gap-2 sm:gap-3 mb-2 sm:mb-3">
            <svg class="w-5 h-5 sm:w-6 sm:h-6 text-secondary flex-shrink-0 mt-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"></path>
            </svg>
            <div class="flex-1">
              <h2 class="font-semibold text-base sm:text-lg mb-2 sm:mb-3">Position Performance</h2>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                <div class="flex items-center gap-2 p-2 bg-success/10 rounded text-sm sm:text-base">
                  <span class="text-lg sm:text-2xl">🥇</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-success truncate">Best Position</div>
                    <div class="text-base sm:text-lg">${this.formatPosition(stats.bestPosition)}</div>
                  </div>
                </div>
                <div class="flex items-center gap-2 p-2 bg-error/10 rounded text-sm sm:text-base">
                  <span class="text-lg sm:text-2xl">📉</span>
                  <div class="flex-1 min-w-0">
                    <div class="font-semibold text-error truncate">Worst Position</div>
                    <div class="text-base sm:text-lg">${this.formatPosition(stats.worstPosition)}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

		// Show modal
		modal.showModal();
	}

	private renderSummaryInfo(stats: PlayerStatistics[]): void {
		// Find or create summary div
		let summaryDiv = document.getElementById("analytics-summary");
		if (!summaryDiv) {
			summaryDiv = document.createElement("div");
			summaryDiv.id = "analytics-summary";
			summaryDiv.classList.add(
				"mt-4",
				"text-center",
				"text-sm",
				"opacity-70"
			);

			const analyticsView = document.getElementById("player_analytics");
			if (analyticsView) {
				analyticsView.appendChild(summaryDiv);
			}
		}

		const totalPlayers = stats.length;
		const totalGames = Math.max(...stats.map((s) => s.gamesPlayed));
		const mostActivePlayer = stats.find(
			(s) => s.gamesPlayed === totalGames
		);

		summaryDiv.innerHTML = `
      <p>
        Analyzing ${totalPlayers} player${totalPlayers !== 1 ? "s" : ""} across all games.
        ${mostActivePlayer ? `Most active: ${mostActivePlayer.name} (${mostActivePlayer.gamesPlayed} games)` : ""}
      </p>
    `;
	}

	private formatPosition(position: number): string {
		if (position === 1) return "🥇 1st";
		if (position === 2) return "🥈 2nd";
		if (position === 3) return "🥉 3rd";
		return `${position}${this.getOrdinalSuffix(position)}`;
	}

	private getOrdinalSuffix(num: number): string {
		const j = num % 10;
		const k = num % 100;

		if (j === 1 && k !== 11) return "st";
		if (j === 2 && k !== 12) return "nd";
		if (j === 3 && k !== 13) return "rd";
		return "th";
	}

	public updateData(games: gamedata[]): void {
		this.analytics = new PlayerAnalytics(games);
		this.renderAnalyticsTable();
	}
}
