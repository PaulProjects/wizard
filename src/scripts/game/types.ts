/**
 * Type definitions and interfaces for the Wizard card game application
 * Provides better type safety and code organization
 */

// Game-related enums
export enum GameStep {
	PLACE_BETS = 1,
	ENTER_TRICKS = 2,
	CELEBRATION = 3,
}

export enum GameDisplay {
	SCORE_OVERVIEW = 1,
	INPUT = 2,
}

export enum ScoreView {
	CHART = 1,
	TOP_PLAYERS = 3,
	CELEBRATION = 4,
	ANALYTICS = 5,
}

export enum RoundColor {
	BLUE = "blue",
	RED = "red",
	GREEN = "green",
	YELLOW = "yellow",
}

// Game state interfaces
export interface GameState {
	dealer: number;
	rule_1: boolean;
	rule_random_dealer: boolean;
	rule_expansion: boolean;
	rule_custom_rounds: boolean;
	rule_crowdchaos: boolean;
	rule_altcount: boolean;
	round: number;
	max_rounds: number;
	players: string[];
	bets: number[][];
	tricks: number[][];
	score: number[][];
	score_change: number[][];
	alt_score: number[][];
	alt_score_change: number[][];
	color: Record<number, RoundColor>;
	step?: GameStep;
	display?: GameDisplay;
	score_display?: ScoreView;
	time_started: number;
	time_ended?: number;
	id?: string;
}

// Player-related interfaces
export interface PlayerScore {
	name: string;
	currentScore: number;
	scoreChange: number;
	bet?: number;
	tricks?: number;
}

export interface PlayerRanking {
	name: string;
	score: number;
	rank: number;
}

// Input handling interfaces
export interface InputRange {
	playerId: number;
	value: number;
	min: number;
	max: number;
}

export interface InputValidation {
	isValid: boolean;
	message?: string;
	errorType?: "total_mismatch" | "rule_violation";
}

// UI state interfaces
export interface UIState {
	currentView: ScoreView;
	editMode: boolean;
	inputBlockReload: boolean;
	isValidInput: boolean;
}

export interface NavigationState {
	isPrimary: boolean;
	isDisabled: boolean;
	text: string;
}

// Score calculation interfaces
export interface ScoreCalculation {
	playerScores: number[];
	scoreChanges: number[];
	altPlayerScores: number[];
	altScoreChanges: number[];
}

export interface ScoreParameters {
	bet: number;
	tricks: number;
	round: number;
}

// Color picker interfaces
export interface ColorPickerState {
	isOpen: boolean;
	currentRound: number;
	selectedColor?: RoundColor;
}

// Event handler types
export type EventHandler<T = Event> = (event: T) => void;
export type ClickHandler = EventHandler<MouseEvent>;
export type InputHandler = EventHandler<InputEvent>;

// API response types
export interface SaveGameResponse {
	success: boolean;
	gameId?: string;
	error?: string;
}

// Demo mode types
export interface DemoConfig {
	isDemoMode: boolean;
	view?: ScoreView;
}

// Utility types
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
export type DeepReadonly<T> = {
	readonly [P in keyof T]: T[P] extends object ? DeepReadonly<T[P]> : T[P];
};

// Constants
export const COLORS: RoundColor[] = [
	RoundColor.BLUE,
	RoundColor.RED,
	RoundColor.GREEN,
	RoundColor.YELLOW,
];

export const DEFAULT_GAME_CONFIG = {
	maxPlayers: 6,
	minPlayers: 3,
	defaultMaxRounds: 10,
	infiniteRounds: Number.MAX_SAFE_INTEGER,
	scoreMultiplier: 10,
	bonusPoints: 20,
} as const;

// Error types
export class GameError extends Error {
	constructor(
		message: string,
		public code: string,
		public context?: Record<string, unknown>
	) {
		super(message);
		this.name = "GameError";
	}
}

export class ValidationError extends GameError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, "VALIDATION_ERROR", context);
		this.name = "ValidationError";
	}
}

export class StorageError extends GameError {
	constructor(message: string, context?: Record<string, unknown>) {
		super(message, "STORAGE_ERROR", context);
		this.name = "StorageError";
	}
}
