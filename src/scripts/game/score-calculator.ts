/**
 * Score Calculator - Pure functions for calculating game scores
 * Provides both classic and alternative scoring methods
 */

import type { ScoreCalculation, ScoreParameters } from "./types.js";

/**
 * Classic Wizard scoring system
 * Correct prediction: 20 + (bet * 10) points
 * Incorrect prediction: Math.abs(bet - tricks) * -10 points
 */
export function calculateClassicScore(bet: number, tricks: number): number {
	if (bet === tricks) {
		return 20 + bet * 10;
	} else {
		return Math.abs(bet - tricks) * -10;
	}
}

/**
 * Alternative Wizard scoring system (German version)
 * Correct prediction: (tricks * 10) + (round * 10) points
 * Incorrect prediction: (tricks * 10) - penalty points
 * Penalty: 10 * (deviation * (deviation + 1)) / 2
 *
 * Based on: https://de.wikipedia.org/wiki/Wizard_(Spiel)
 */
export function calculateAlternativeScore(
	bet: number,
	tricks: number,
	round: number
): number {
	const basePoints = tricks * 10;

	if (bet === tricks) {
		// Correct prediction: base points + round bonus
		return basePoints + round * 10;
	} else {
		// Incorrect prediction: base points minus penalty
		const deviation = Math.abs(bet - tricks);
		const penalty = 10 * ((deviation * (deviation + 1)) / 2);
		return basePoints - penalty;
	}
}

/**
 * Calculate scores for all players in a round using both scoring systems
 */
export function calculateRoundScores(
	bets: number[],
	tricks: number[],
	round: number,
	previousClassicScores?: number[],
	previousAltScores?: number[]
): ScoreCalculation {
	const playerCount = bets.length;
	const playerScores: number[] = [];
	const scoreChanges: number[] = [];
	const altPlayerScores: number[] = [];
	const altScoreChanges: number[] = [];

	for (let i = 0; i < playerCount; i++) {
		// Calculate score changes for this round
		const classicChange = calculateClassicScore(bets[i], tricks[i]);
		const altChange = calculateAlternativeScore(bets[i], tricks[i], round);

		scoreChanges[i] = classicChange;
		altScoreChanges[i] = altChange;

		// Calculate cumulative scores
		if (round === 1 || !previousClassicScores || !previousAltScores) {
			// First round - use current changes as total scores
			playerScores[i] = classicChange;
			altPlayerScores[i] = altChange;
		} else {
			// Add to previous scores
			playerScores[i] = previousClassicScores[i] + classicChange;
			altPlayerScores[i] = previousAltScores[i] + altChange;
		}
	}

	return {
		playerScores,
		scoreChanges,
		altPlayerScores,
		altScoreChanges,
	};
}

/**
 * Calculate total score for a player across all rounds
 */
export function calculateTotalScore(scoreChanges: number[][]): number[] {
	if (scoreChanges.length === 0) return [];

	const playerCount = scoreChanges[0].length;
	const totalScores: number[] = new Array(playerCount).fill(0);

	for (const roundScores of scoreChanges) {
		for (let i = 0; i < playerCount; i++) {
			totalScores[i] += roundScores[i];
		}
	}

	return totalScores;
}

/**
 * Get player rankings based on scores (highest score wins)
 */
export function getPlayerRankings(
	players: string[],
	scores: number[]
): Array<{ name: string; score: number; rank: number }> {
	const rankings = players.map((name, index) => ({
		name,
		score: scores[index] || 0,
		rank: 0,
	}));

	// Sort by score (descending)
	rankings.sort((a, b) => b.score - a.score);

	// Assign ranks (handle ties)
	let currentRank = 1;
	for (let i = 0; i < rankings.length; i++) {
		if (i > 0 && rankings[i].score < rankings[i - 1].score) {
			currentRank = i + 1;
		}
		rankings[i].rank = currentRank;
	}

	return rankings;
}

/**
 * Calculate the winner(s) of the game
 */
export function calculateWinners(
	players: string[],
	scores: number[]
): string[] {
	if (players.length === 0 || scores.length === 0) return [];

	const maxScore = Math.max(...scores);
	const winners: string[] = [];

	for (let i = 0; i < players.length; i++) {
		if (scores[i] === maxScore) {
			winners.push(players[i]);
		}
	}

	return winners;
}

/**
 * Calculate performance statistics for a player
 */
export function calculatePlayerStats(
	bets: number[][],
	tricks: number[][],
	playerIndex: number
): {
	totalRounds: number;
	correctPredictions: number;
	accuracyPercentage: number;
	averageBet: number;
	averageTricks: number;
	bestRound: { round: number; score: number } | null;
	worstRound: { round: number; score: number } | null;
} {
	if (bets.length === 0 || tricks.length === 0 || playerIndex < 0) {
		return {
			totalRounds: 0,
			correctPredictions: 0,
			accuracyPercentage: 0,
			averageBet: 0,
			averageTricks: 0,
			bestRound: null,
			worstRound: null,
		};
	}

	const totalRounds = bets.length;
	let correctPredictions = 0;
	let totalBets = 0;
	let totalTricks = 0;
	let bestRound: { round: number; score: number } | null = null;
	let worstRound: { round: number; score: number } | null = null;

	for (let round = 0; round < totalRounds; round++) {
		const playerBet = bets[round][playerIndex];
		const playerTricks = tricks[round][playerIndex];
		const roundScore = calculateClassicScore(playerBet, playerTricks);

		totalBets += playerBet;
		totalTricks += playerTricks;

		if (playerBet === playerTricks) {
			correctPredictions++;
		}

		// Track best and worst rounds
		if (bestRound === null || roundScore > bestRound.score) {
			bestRound = { round: round + 1, score: roundScore };
		}
		if (worstRound === null || roundScore < worstRound.score) {
			worstRound = { round: round + 1, score: roundScore };
		}
	}

	return {
		totalRounds,
		correctPredictions,
		accuracyPercentage:
			totalRounds > 0 ? (correctPredictions / totalRounds) * 100 : 0,
		averageBet: totalRounds > 0 ? totalBets / totalRounds : 0,
		averageTricks: totalRounds > 0 ? totalTricks / totalRounds : 0,
		bestRound,
		worstRound,
	};
}

/**
 * Validate bet and trick inputs
 */
export function validateBetInput(
	bet: number,
	maxBet: number,
	currentRound: number,
	totalBets: number,
	rule1Active: boolean
): { isValid: boolean; message?: string } {
	if (bet < 0 || bet > maxBet) {
		return {
			isValid: false,
			message: `Bet must be between 0 and ${maxBet}`,
		};
	}

	if (rule1Active && currentRound > 1) {
		// Check if this bet would make total equal to current round
		if (totalBets === currentRound) {
			return {
				isValid: false,
				message: "Total bets cannot equal the number of cards",
			};
		}
	}

	return { isValid: true };
}

export function validateTrickInput(
	trick: number,
	maxTrick: number
): { isValid: boolean; message?: string } {
	if (trick < 0 || trick > maxTrick) {
		return {
			isValid: false,
			message: `Tricks must be between 0 and ${maxTrick}`,
		};
	}

	return { isValid: true };
}

/**
 * Calculate what the last player must bet to follow rule 1 (if applicable)
 */
export function getProhibitedBet(
	currentBets: number[],
	currentRound: number,
	rule1Active: boolean
): number | null {
	if (!rule1Active || currentRound === 1) {
		return null;
	}

	const totalBets = currentBets.reduce((sum, bet) => sum + bet, 0);
	const prohibitedBet = currentRound - totalBets;

	return prohibitedBet >= 0 ? prohibitedBet : null;
}

/**
 * Export all scoring functions for easy access
 */
export const scoreCalculator = {
	classic: calculateClassicScore,
	alternative: calculateAlternativeScore,
	round: calculateRoundScores,
	total: calculateTotalScore,
	rankings: getPlayerRankings,
	winners: calculateWinners,
	playerStats: calculatePlayerStats,
	validateBet: validateBetInput,
	validateTrick: validateTrickInput,
	getProhibitedBet,
} as const;
