import { GameData as gamedata } from "./game/gamedata.ts";
import { Logger } from "./logger.ts";

export interface PlayerStatistics {
	name: string;
	gamesPlayed: number;
	wins: number;
	winPercentage: number;
	totalPoints: number;
	averagePoints: number;
	averagePosition: number;
	bestPosition: number;
	worstPosition: number;
	totalRounds: number;
	averageRoundsPerGame: number;
	highestScore: number;
	lowestScore: number;
	bestGameId?: string;
	worstGameId?: string;
	averageBet?: number; // average bet across all completed rounds
	averageBetDeviation?: number; // average of (bet - tricks), positive => overbet, negative => underbet
}

export interface SortOption {
	key: keyof PlayerStatistics;
	label: string;
	ascending: boolean;
}

export class PlayerAnalytics {
	private games: gamedata[];
	private playerStats: Map<string, PlayerStatistics>;

	constructor(games: gamedata[]) {
		this.games = games;
		this.playerStats = new Map();
		this.calculateStatistics();
	}

	private calculateStatistics(): void {
		Logger.info(`Processing ${this.games.length} games for analytics`);

		// Initialize player stats
		const playerMap = new Map<
			string,
			{
				displayName: string; // Store the original case name for display
				gamesPlayed: number;
				wins: number;
				totalPoints: number;
				positions: number[];
				totalRounds: number;
				scores: number[];
				gameIds: string[];
				betsSum: number; // cumulative sum of bets
				betDeviationSum: number; // cumulative sum of (bet - tricks)
				betRounds: number; // number of rounds with both bet & trick
			}
		>();

		// Process each game
		let finishedGamesCount = 0;
		for (const game of this.games) {
			Logger.debug(`Game status`, {
				round: game.getRound(),
				maxRounds: game.getMaxRounds(),
				step: game.getStep(),
				finished: game.isGameFinished(),
			});

			// For analytics, include all games that have completed at least one round
			// Not just games that reached the celebration step
			if (game.getRound() < 2) {
				Logger.debug("Skipping game - not enough rounds completed");
				continue;
			}

			finishedGamesCount++;

			const players = game.getPlayers();
			const finalScores = game.rule_altcount
				? game.getCurrentAltScores()
				: game.getCurrentScores();
			const winners = game.getWinners();
			const gameRounds = game.getRound();

			// Calculate positions for this game
			const playerScores = players.map((name, index) => ({
				name,
				score: finalScores[index],
				index,
			}));

			// Sort by score descending to determine positions
			playerScores.sort((a, b) => b.score - a.score);

			// Assign positions (handling ties)
			const positions: number[] = new Array(players.length);
			for (let i = 0; i < playerScores.length; i++) {
				const currentScore = playerScores[i].score;
				let position = i + 1;

				// Check for ties with previous players
				for (let j = i - 1; j >= 0; j--) {
					if (playerScores[j].score === currentScore) {
						position = positions[playerScores[j].index];
						break;
					}
				}

				positions[playerScores[i].index] = position;
			}

			// Update statistics for each player in this game
			const bets = game.getBets();
			const tricks = game.getTricks();

			for (let i = 0; i < players.length; i++) {
				const playerName = players[i];
				const playerKey = playerName.toLowerCase(); // Use lowercase for grouping
				const playerScore = finalScores[i];
				const playerPosition = positions[i];
				const isWinner = winners.includes(playerName);

				if (!playerMap.has(playerKey)) {
					playerMap.set(playerKey, {
						displayName: playerName, // Store original case for display
						gamesPlayed: 0,
						wins: 0,
						totalPoints: 0,
						positions: [],
						totalRounds: 0,
						scores: [],
						gameIds: [],
						betsSum: 0,
						betDeviationSum: 0,
						betRounds: 0,
					});
				}

				const stats = playerMap.get(playerKey)!;
				stats.gamesPlayed++;
				stats.totalPoints += playerScore;
				stats.positions.push(playerPosition);
				stats.scores.push(playerScore);
				stats.gameIds.push(game.getID() || "");
				stats.totalRounds += gameRounds;
				if (isWinner) stats.wins++;

				// Aggregate bet performance: iterate rounds where both bet & trick exist
				for (let r = 0; r < bets.length; r++) {
					if (tricks.length > r && bets[r] && tricks[r]) {
						const betVal = bets[r][i];
						const trickVal = tricks[r][i];
						if (typeof betVal === "number" && typeof trickVal === "number") {
							stats.betsSum += betVal;
							stats.betDeviationSum += betVal - trickVal; // positive => overestimation
							stats.betRounds++;
						}
					}
				}
			}
		}

		Logger.info(
			`Processed ${finishedGamesCount} finished games, found ${playerMap.size} unique players`
		);

		// Convert to final statistics format
		for (const [playerKey, rawStats] of playerMap) {
			const gamesPlayed = rawStats.gamesPlayed;
			const wins = rawStats.wins;
			const winPercentage =
				gamesPlayed > 0 ? (wins / gamesPlayed) * 100 : 0;
			const totalPoints = rawStats.totalPoints;
			const averagePoints =
				gamesPlayed > 0 ? totalPoints / gamesPlayed : 0;
			const averagePosition =
				rawStats.positions.length > 0
					? rawStats.positions.reduce((sum, pos) => sum + pos, 0) /
						rawStats.positions.length
					: 0;
			const bestPosition =
				rawStats.positions.length > 0
					? Math.min(...rawStats.positions)
					: 0;
			const worstPosition =
				rawStats.positions.length > 0
					? Math.max(...rawStats.positions)
					: 0;
			const totalRounds = rawStats.totalRounds;
			const averageRoundsPerGame =
				gamesPlayed > 0 ? totalRounds / gamesPlayed : 0;
			const highestScore =
				rawStats.scores.length > 0 ? Math.max(...rawStats.scores) : 0;
			const lowestScore =
				rawStats.scores.length > 0 ? Math.min(...rawStats.scores) : 0;

			// Find game IDs for best and worst scores
			let bestGameId: string | undefined;
			let worstGameId: string | undefined;

			if (rawStats.scores.length > 0) {
				const bestScoreIndex = rawStats.scores.indexOf(highestScore);
				const worstScoreIndex = rawStats.scores.indexOf(lowestScore);
				bestGameId = rawStats.gameIds[bestScoreIndex];
				worstGameId = rawStats.gameIds[worstScoreIndex];
			}

			this.playerStats.set(rawStats.displayName, {
				name: rawStats.displayName,
				gamesPlayed,
				wins,
				winPercentage,
				totalPoints,
				averagePoints,
				averagePosition,
				bestPosition,
				worstPosition,
				totalRounds,
				averageRoundsPerGame,
				highestScore,
				lowestScore,
				bestGameId,
				worstGameId,
				averageBet:
					rawStats.betRounds > 0
						? Number((rawStats.betsSum / rawStats.betRounds).toFixed(2))
						: undefined,
				averageBetDeviation:
					rawStats.betRounds > 0
						? Number(
							(
								rawStats.betDeviationSum / rawStats.betRounds
							).toFixed(2)
						  )
						: undefined,
			});
		}
	}

	public getAllPlayerStats(): PlayerStatistics[] {
		return Array.from(this.playerStats.values());
	}

	public getPlayerStats(playerName: string): PlayerStatistics | undefined {
		return this.playerStats.get(playerName);
	}

	public getSortedPlayerStats(
		sortBy: keyof PlayerStatistics,
		ascending: boolean = false
	): PlayerStatistics[] {
		const stats = this.getAllPlayerStats();

		return stats.sort((a, b) => {
			const aValue = a[sortBy];
			const bValue = b[sortBy];

			if (typeof aValue === "string" && typeof bValue === "string") {
				const comparison = aValue.localeCompare(bValue);
				return ascending ? comparison : -comparison;
			}

			if (typeof aValue === "number" && typeof bValue === "number") {
				const comparison = aValue - bValue;
				return ascending ? comparison : -comparison;
			}

			return 0;
		});
	}

	public getTopPlayers(
		sortBy: keyof PlayerStatistics,
		limit: number = 10,
		ascending: boolean = false
	): PlayerStatistics[] {
		return this.getSortedPlayerStats(sortBy, ascending).slice(0, limit);
	}

	public getAvailableSortOptions(): SortOption[] {
		return [
			{
				key: "gamesPlayed",
				label: "Most Games Played",
				ascending: false,
			},
			{ key: "winPercentage", label: "Highest Win %", ascending: false },
			{
				key: "averagePosition",
				label: "Best Average Position",
				ascending: true,
			},
			{
				key: "averagePoints",
				label: "Highest Average Points",
				ascending: false,
			},
			{ key: "wins", label: "Most Wins", ascending: false },
			{
				key: "bestPosition",
				label: "Best Position Ever",
				ascending: true,
			},
			{
				key: "highestScore",
				label: "Highest Single Score",
				ascending: false,
			},
			{
				key: "lowestScore",
				label: "Lowest Single Score",
				ascending: true,
			},
			{ key: "name", label: "Name (A-Z)", ascending: true },
		];
	}
}
