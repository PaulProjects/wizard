import type { GameState, Optional } from "./types.js";
import {
	GameStep,
	GameDisplay,
	ScoreView,
	RoundColor,
	ValidationError,
	StorageError,
} from "./types.js";
import { Logger } from "../logger.js";

export class GameData implements GameState {
	/** The Current Dealer */
	public dealer: number;
	/** if the +- 1 Rule is active */
	public rule_1: boolean;
	/** if a random dealer should be picked at the start */
	public rule_random_dealer: boolean;
	/** if the expansion is active -> sum of tricks dont have to match sum of bets */
	public rule_expansion: boolean;
	/** if the number of rounds is set custom */
	public rule_custom_rounds: boolean;
	/** if crowdchaos is active -> No limit on the amount of players */
	public rule_crowdchaos: boolean;
	/** if the altcount rule is active -> display the alternative counting system */
	public rule_altcount: boolean;
	/** The current round */
	public round: number;
	/** The maximum number of rounds */
	public max_rounds: number;
	/** The player names, order is essential*/
	public players: string[];
	/** The bets of the players */
	public bets: number[][];
	/** The tricks of the players */
	public tricks: number[][];
	/** The scores of the players */
	public score: number[][];
	/** The change in score of the players */
	public score_change: number[][];
	/** The score of the players calculated with an alternative method */
	public alt_score: number[][];
	/** The change in alternative score of the players of the alternative method*/
	public alt_score_change: number[][];
	/** The color of the rounds */
	public color: Record<number, RoundColor>;
	/** 1 enter bets | 2 enter tricks - deleted after game finished*/
	public step?: GameStep;
	/** 1 score overview | 2 bets/tricks | 3 celebration view - deleted after game finished*/
	public display?: GameDisplay;
	/** selected view of the score overview - deleted after game finished*/
	public score_display?: ScoreView;
	/** The time the game was started */
	public time_started: number;
	//optional
	/** The time the game was ended */
	public time_ended?: number;
	/** game id on the server*/
	public id?: string;

	constructor(config: GameState) {
		this.dealer = config.dealer;
		this.rule_1 = config.rule_1;
		this.rule_random_dealer = config.rule_random_dealer;
		this.rule_expansion = config.rule_expansion;
		this.rule_custom_rounds = config.rule_custom_rounds;
		this.rule_crowdchaos = config.rule_crowdchaos;
		this.rule_altcount = config.rule_altcount;
		this.round = config.round;
		this.max_rounds = config.max_rounds;
		this.players = [...config.players]; // Create a copy
		this.bets = config.bets.map((round) => [...round]); // Deep copy
		this.tricks = config.tricks.map((round) => [...round]); // Deep copy
		this.score = config.score.map((round) => [...round]); // Deep copy
		this.score_change = config.score_change.map((round) => [...round]); // Deep copy
		this.alt_score = config.alt_score.map((round) => [...round]); // Deep copy
		this.alt_score_change = config.alt_score_change.map((round) => [
			...round,
		]); // Deep copy
		this.color = { ...config.color }; // Shallow copy is sufficient for color object
		this.step = config.step;
		this.display = config.display;
		this.score_display = config.score_display;
		this.time_started = config.time_started;
		this.time_ended = config.time_ended;
		this.id = config.id;
	}

	// Factory methods
	static load(): GameData {
		const json = localStorage.getItem("game");
		if (!json) {
			throw new StorageError("No game found in localStorage");
		}
		return this.fromJSONString(json);
	}

	static fromJSONString(jsonString: string): GameData {
		try {
			const json = JSON.parse(jsonString);
			return this.fromJson(json);
		} catch (error) {
			if (error instanceof SyntaxError) {
				Logger.error("GameData.fromJSONString - JSON Parse Error", {
					error: (error as Error)?.message,
					jsonStringLength: jsonString?.length || 0,
					jsonPreview:
						jsonString?.substring(0, 200) +
						(jsonString?.length > 200 ? "..." : ""),
					fullJsonString: jsonString,
				});
				throw new ValidationError(
					`Failed to parse JSON string: ${error.message}`,
					{
						jsonStringLength: jsonString?.length || 0,
						jsonPreview:
							jsonString?.substring(0, 100) +
							(jsonString?.length > 100 ? "..." : ""),
						fullJsonString: jsonString,
						failureContext: "JSON.parse in GameData.fromJSONString",
					}
				);
			}
			// Re-throw ValidationError from fromJson with additional context
			Logger.error("GameData.fromJSONString - Validation Error", {
				error: (error as Error)?.message,
				jsonStringLength: jsonString?.length || 0,
				fullJsonString: jsonString,
			});
			throw new ValidationError(
				`GameData creation failed: ${error.message}`,
				{
					originalError: error.message,
					jsonStringLength: jsonString?.length || 0,
					fullJsonString: jsonString,
					failureContext: "GameData.fromJSONString",
				}
			);
		}
	}

	static fromJson(json: any): GameData {
		try {
			const validated = this.validateAndSanitizeJson(json);
			return new GameData(validated);
		} catch (error) {
			const gameId = json?.id || "unknown";
			const gameMetadata = {
				id: gameId,
				players: json?.players || [],
				round: json?.round || "unknown",
				timeStarted: json?.time_started || "unknown",
			};

			Logger.error("GameData.fromJson - Validation Error", {
				gameId,
				gameMetadata,
				error: (error as Error)?.message,
				fullGameData: json,
				jsonKeys: json ? Object.keys(json) : [],
			});

			const errorMessage =
				error instanceof ValidationError
					? error.message
					: `Validation failed: ${error.message}`;
			throw new ValidationError(
				`Failed to create GameData from JSON object (Game ID: ${gameId}): ${errorMessage}`,
				{
					originalError: error.message,
					gameId,
					gameMetadata,
					jsonKeys: json ? Object.keys(json) : [],
					fullGameData: json,
					failureContext: "GameData.fromJson",
				}
			);
		}
	}

	private static validateAndSanitizeJson(json: any): GameState {
		// Type validation with backwards compatibility
		const dealer = this.validateNumber(json.dealer, "dealer", 0);
		const rule_1 = this.validateBoolean(json.rule_1, "rule_1", false);
		const rule_random_dealer = this.validateBoolean(
			json.rule_random_dealer,
			"rule_random_dealer",
			false
		);
		const rule_expansion = this.validateBoolean(
			json.rule_expansion,
			"rule_expansion",
			false
		);
		const rule_custom_rounds = this.validateBoolean(
			json.rule_custom_rounds,
			"rule_custom_rounds",
			false
		);
		const rule_crowdchaos = this.validateBoolean(
			json.rule_crowdchaos,
			"rule_crowdchaos",
			false
		);
		const rule_altcount = this.validateBoolean(
			json.rule_altcount,
			"rule_altcount",
			false
		); // Default for backwards compatibility
		const round = this.validateNumber(json.round, "round", 1);
		const max_rounds = this.validateNumber(
			json.max_rounds,
			"max_rounds",
			12
		);
		const players = this.validateArray(json.players, "players");
		const bets = this.validateArray(json.bets, "bets");
		const tricks = this.validateArray(json.tricks, "tricks");
		const score = this.validateArray(json.score, "score");
		const score_change = this.validateArray(
			json.score_change,
			"score_change"
		);
		const alt_score = this.validateArray(
			json.alt_score,
			"alt_score",
			json.score
		); // Backwards compatibility
		const alt_score_change = this.validateArray(
			json.alt_score_change,
			"alt_score_change",
			json.score_change
		); // Backwards compatibility
		const color = this.validateObject(json.color, "color", {}) as Record<
			number,
			RoundColor
		>;
		const step = this.validateNumber(
			json.step,
			"step",
			GameStep.PLACE_BETS
		); // Default for backwards compatibility
		const display = this.validateNumber(
			json.display,
			"display",
			GameDisplay.SCORE_OVERVIEW
		);
		const score_display = this.validateNumber(
			json.score_display,
			"score_display",
			ScoreView.ANALYTICS
		);
		const time_started = this.validateNumber(
			json.time_started,
			"time_started"
		);
		const time_ended =
			json.time_ended !== undefined
				? this.validateNumber(json.time_ended, "time_ended")
				: undefined;
		const id =
			json.id !== undefined
				? this.validateString(json.id, "id")
				: undefined;

		return {
			dealer,
			rule_1,
			rule_random_dealer,
			rule_expansion,
			rule_custom_rounds,
			rule_crowdchaos,
			rule_altcount,
			round,
			max_rounds,
			players,
			bets,
			tricks,
			score,
			score_change,
			alt_score,
			alt_score_change,
			color,
			step,
			display,
			score_display,
			time_started,
			time_ended,
			id,
		};
	}

	private static validateNumber(
		value: any,
		field: string,
		defaultValue?: number
	): number {
		if (value === undefined && defaultValue !== undefined) {
			return defaultValue;
		}
		if (typeof value === "number") {
			return value;
		}
		if (typeof value === "string") {
			const parsed = parseInt(value);
			if (!isNaN(parsed)) {
				return parsed;
			}
		}
		throw new ValidationError(
			`Invalid field '${field}': expected number but received ${typeof value} (${JSON.stringify(value)})`,
			{
				field,
				expectedType: "number",
				receivedType: typeof value,
				receivedValue: value,
				failureContext: "GameData.validateNumber",
			}
		);
	}

	private static validateBoolean(
		value: any,
		field: string,
		defaultValue?: boolean
	): boolean {
		if (value === undefined && defaultValue !== undefined) {
			return defaultValue;
		}
		if (typeof value === "boolean") {
			return value;
		}
		throw new ValidationError(
			`Invalid field '${field}': expected boolean but received ${typeof value} (${JSON.stringify(value)})`,
			{
				field,
				expectedType: "boolean",
				receivedType: typeof value,
				receivedValue: value,
				failureContext: "GameData.validateBoolean",
			}
		);
	}

	private static validateArray(
		value: any,
		field: string,
		defaultValue?: any[]
	): any[] {
		if (value === undefined && defaultValue !== undefined) {
			return defaultValue;
		}
		if (Array.isArray(value)) {
			return value;
		}
		throw new ValidationError(
			`Invalid field '${field}': expected array but received ${typeof value} (${JSON.stringify(value)})`,
			{
				field,
				expectedType: "array",
				receivedType: typeof value,
				receivedValue: value,
				failureContext: "GameData.validateArray",
			}
		);
	}

	private static validateObject(
		value: any,
		field: string,
		defaultValue?: object
	): object {
		if (value === undefined && defaultValue !== undefined) {
			return defaultValue;
		}
		if (
			typeof value === "object" &&
			value !== null &&
			!Array.isArray(value)
		) {
			return value;
		}
		throw new ValidationError(
			`Invalid field '${field}': expected object but received ${typeof value} (${JSON.stringify(value)})`,
			{
				field,
				expectedType: "object",
				receivedType: typeof value,
				receivedValue: value,
				isNull: value === null,
				isArray: Array.isArray(value),
				failureContext: "GameData.validateObject",
			}
		);
	}

	private static validateString(value: any, field: string): string {
		if (typeof value === "string") {
			return value;
		}
		throw new ValidationError(
			`Invalid field '${field}': expected string but received ${typeof value} (${JSON.stringify(value)})`,
			{
				field,
				expectedType: "string",
				receivedType: typeof value,
				receivedValue: value,
				failureContext: "GameData.validateString",
			}
		);
	}

	// Export methods
	static toJsonString(gamedata: GameData): string {
		return JSON.stringify(this.toJsonObject(gamedata));
	}

	static toJsonObject(gamedata: GameData): GameState {
		return {
			dealer: gamedata.dealer,
			rule_1: gamedata.rule_1,
			rule_random_dealer: gamedata.rule_random_dealer,
			rule_expansion: gamedata.rule_expansion,
			rule_custom_rounds: gamedata.rule_custom_rounds,
			rule_crowdchaos: gamedata.rule_crowdchaos,
			rule_altcount: gamedata.rule_altcount,
			round: gamedata.round,
			max_rounds: gamedata.max_rounds,
			players: [...gamedata.players],
			bets: gamedata.bets.map((round) => [...round]),
			tricks: gamedata.tricks.map((round) => [...round]),
			score: gamedata.score.map((round) => [...round]),
			score_change: gamedata.score_change.map((round) => [...round]),
			alt_score: gamedata.alt_score.map((round) => [...round]),
			alt_score_change: gamedata.alt_score_change.map((round) => [
				...round,
			]),
			color: { ...gamedata.color },
			step: gamedata.step,
			display: gamedata.display,
			score_display: gamedata.score_display,
			time_started: gamedata.time_started,
			time_ended: gamedata.time_ended,
			id: gamedata.id,
		};
	}

	// Demo data factory
	static demo(view: ScoreView = ScoreView.ANALYTICS): GameData {
		const config: GameState = {
			dealer: 2,
			rule_1: true,
			rule_random_dealer: false,
			rule_expansion: false,
			rule_custom_rounds: false,
			rule_crowdchaos: false,
			rule_altcount: false,
			round: 8,
			max_rounds: 12,
			players: ["Darth Maul", "Rey", "Han Solo", "Andor"],
			bets: [
				[0, 0, 1, 0],
				[1, 1, 0, 0],
				[0, 1, 2, 0],
				[0, 1, 0, 1],
				[2, 0, 1, 0],
				[0, 4, 1, 0],
				[2, 1, 1, 0],
			],
			tricks: [
				[0, 0, 1, 0],
				[1, 0, 0, 0],
				[0, 0, 2, 1],
				[1, 1, 0, 1],
				[0, 1, 1, 0],
				[1, 4, 1, 0],
				[2, 1, 1, 0],
			],
			score: [
				[20, 20, 30, 20],
				[50, 10, 50, 40],
				[70, 0, 90, 30],
				[60, 30, 110, 60],
				[40, 20, 140, 80],
				[30, 80, 170, 100],
				[70, 110, 200, 120],
			],
			score_change: [
				[20, 20, 30, 20],
				[30, -10, 20, 20],
				[20, -10, 40, -10],
				[-10, 30, 20, 30],
				[-20, -10, 30, 20],
				[-10, 60, 30, 20],
				[40, 30, 30, 20],
			],
			alt_score: [
				[20, 20, 30, 20],
				[50, 10, 50, 40],
				[70, 0, 90, 30],
				[60, 30, 110, 60],
				[40, 20, 140, 80],
				[30, 80, 170, 100],
				[70, 110, 200, 120],
			],
			alt_score_change: [
				[20, 20, 30, 20],
				[30, -10, 20, 20],
				[20, -10, 40, -10],
				[-10, 30, 20, 30],
				[-20, -10, 30, 20],
				[-10, 60, 30, 20],
				[40, 30, 30, 20],
			],
			color: {},
			step: GameStep.PLACE_BETS,
			display: GameDisplay.SCORE_OVERVIEW,
			score_display: view,
			time_started: Date.now() - 3600000, // Started 1 hour ago
		};

		return new GameData(config);
	}

	// Instance methods
	save(): void {
		try {
			const gameString = GameData.toJsonString(this);
			localStorage.setItem("game", gameString);
		} catch (error) {
			throw new StorageError("Failed to save game", {
				error: error.message,
			});
		}
	}

	// Color management
	setColor(round: number, color: RoundColor): void {
		this.color[round] = color;
	}

	removeColor(round: number): void {
		delete this.color[round];
	}

	// Round data management
	setRoundBets(bets: number[]): void {
		if (!this.bets[this.round - 1]) {
			this.bets[this.round - 1] = [];
		}
		this.bets[this.round - 1] = [...bets];
	}

	setRoundTricks(tricks: number[]): void {
		if (!this.tricks[this.round - 1]) {
			this.tricks[this.round - 1] = [];
		}
		this.tricks[this.round - 1] = [...tricks];
	}

	addScore(score: number[]): void {
		if (!this.score[this.round - 1]) {
			this.score[this.round - 1] = [];
		}
		this.score[this.round - 1] = [...score];
	}

	setRoundScore(score: number[]): void {
		if (!this.score[this.round - 1]) {
			this.score[this.round - 1] = [];
		}
		this.score[this.round - 1] = [...score];
	}

	setRoundScoreChange(scoreChange: number[]): void {
		if (!this.score_change[this.round - 1]) {
			this.score_change[this.round - 1] = [];
		}
		this.score_change[this.round - 1] = [...scoreChange];
	}

	addScoreChange(scoreChange: number[]): void {
		if (!this.score_change[this.round - 1]) {
			this.score_change[this.round - 1] = [];
		}
		this.score_change[this.round - 1] = [...scoreChange];
	}

	addAltScore(altScore: number[]): void {
		if (!this.alt_score[this.round - 1]) {
			this.alt_score[this.round - 1] = [];
		}
		this.alt_score[this.round - 1] = [...altScore];
	}

	setRoundAltScore(altScore: number[]): void {
		if (!this.alt_score[this.round - 1]) {
			this.alt_score[this.round - 1] = [];
		}
		this.alt_score[this.round - 1] = [...altScore];
	}

	setRoundAltScoreChange(altScoreChange: number[]): void {
		if (!this.alt_score_change[this.round - 1]) {
			this.alt_score_change[this.round - 1] = [];
		}
		this.alt_score_change[this.round - 1] = [...altScoreChange];
	}

	addAltScoreChange(altScoreChange: number[]): void {
		if (!this.alt_score_change[this.round - 1]) {
			this.alt_score_change[this.round - 1] = [];
		}
		this.alt_score_change[this.round - 1] = [...altScoreChange];
	}

	// Game progression
	nextRound(): void {
		this.round++;
	}

	// Utility methods
	getCurrentScores(): number[] {
		if (this.score.length === 0)
			return new Array(this.players.length).fill(0);
		const lastRound = Math.min(this.round - 1, this.score.length - 1);
		return lastRound >= 0
			? [...this.score[lastRound]]
			: new Array(this.players.length).fill(0);
	}

	getCurrentAltScores(): number[] {
		if (this.alt_score.length === 0)
			return new Array(this.players.length).fill(0);
		const lastRound = Math.min(this.round - 1, this.alt_score.length - 1);
		return lastRound >= 0
			? [...this.alt_score[lastRound]]
			: new Array(this.players.length).fill(0);
	}

	getWinners(): string[] {
		const scores = this.rule_altcount
			? this.getCurrentAltScores()
			: this.getCurrentScores();
		const maxScore = Math.max(...scores);
		const winners: string[] = [];

		for (let i = 0; i < this.players.length; i++) {
			if (scores[i] === maxScore) {
				winners.push(this.players[i]);
			}
		}

		return winners;
	}

	isGameFinished(): boolean {
		return (
			this.round >= this.max_rounds && this.step === GameStep.CELEBRATION
		);
	}

	canAdvanceRound(): boolean {
		return (
			this.round < this.max_rounds ||
			this.max_rounds === Number.MAX_SAFE_INTEGER
		);
	}

	renamePlayer(index: number, newName: string): void {
		if (index >= 0 && index < this.players.length) {
			this.players[index] = newName;
		}
	}

	// Getters (keeping the original method names for compatibility)
	getDealer(): number {
		return this.dealer;
	}
	getRule_1(): boolean {
		return this.rule_1;
	}
	getRuleRandomDealer(): boolean {
		return this.rule_random_dealer;
	}
	getRuleExpansion(): boolean {
		return this.rule_expansion;
	}
	getRuleCustomRounds(): boolean {
		return this.rule_custom_rounds;
	}
	getRuleCrowdchaos(): boolean {
		return this.rule_crowdchaos;
	}
	getRuleAltcount(): boolean {
		return this.rule_altcount;
	}
	getRound(): number {
		return this.round;
	}
	getMaxRounds(): number {
		return this.max_rounds;
	}
	getPlayers(): string[] {
		return [...this.players];
	}
	getBets(): number[][] {
		return this.bets.map((round) => [...round]);
	}
	getTricks(): number[][] {
		return this.tricks.map((round) => [...round]);
	}
	getScore(): number[][] {
		return this.score.map((round) => [...round]);
	}
	getScoreChange(): number[][] {
		return this.score_change.map((round) => [...round]);
	}
	getAltScore(): number[][] {
		return this.alt_score.map((round) => [...round]);
	}
	getAltScoreChange(): number[][] {
		return this.alt_score_change.map((round) => [...round]);
	}
	getColor(): Record<number, RoundColor> {
		return { ...this.color };
	}
	getStep(): GameStep | undefined {
		return this.step;
	}
	getDisplay(): GameDisplay | undefined {
		return this.display;
	}
	getScoreDisplay(): ScoreView | undefined {
		return this.score_display;
	}
	getTimeStarted(): number {
		return this.time_started;
	}
	getTimeEnded(): number | undefined {
		return this.time_ended;
	}
	hasID(): boolean {
		return typeof this.id === "string";
	}
	getID(): string | undefined {
		return this.id;
	}

	// Setters (keeping the original method names for compatibility)
	setDealer(dealer: number): void {
		this.dealer = dealer;
	}
	setRule_1(rule_1: boolean): void {
		this.rule_1 = rule_1;
	}
	setRuleRandomDealer(ruleRandomDealer: boolean): void {
		this.rule_random_dealer = ruleRandomDealer;
	}
	setRuleExpansion(ruleExpansion: boolean): void {
		this.rule_expansion = ruleExpansion;
	}
	setRuleCustomRounds(ruleCustomRounds: boolean): void {
		this.rule_custom_rounds = ruleCustomRounds;
	}
	setRuleCrowdchaos(ruleCrowdchaos: boolean): void {
		this.rule_crowdchaos = ruleCrowdchaos;
	}
	setRuleAltcount(ruleAltcount: boolean): void {
		this.rule_altcount = ruleAltcount;
	}
	setRound(round: number): void {
		this.round = round;
	}
	setMaxRounds(maxRounds: number): void {
		this.max_rounds = maxRounds;
	}
	setPlayers(players: string[]): void {
		this.players = [...players];
	}
	setBets(bets: number[][]): void {
		this.bets = bets.map((round) => [...round]);
	}
	setTricks(tricks: number[][]): void {
		this.tricks = tricks.map((round) => [...round]);
	}
	setScore(score: number[][]): void {
		this.score = score.map((round) => [...round]);
	}
	setScoreChange(scoreChange: number[][]): void {
		this.score_change = scoreChange.map((round) => [...round]);
	}
	setAltScore(altScore: number[][]): void {
		this.alt_score = altScore.map((round) => [...round]);
	}
	setAltScoreChange(altScoreChange: number[][]): void {
		this.alt_score_change = altScoreChange.map((round) => [...round]);
	}
	setStep(step: GameStep): void {
		this.step = step;
	}
	setDisplay(display: GameDisplay): void {
		this.display = display;
	}
	setScoreDisplay(scoreDisplay: ScoreView): void {
		this.score_display = scoreDisplay;
	}
	setTimeStarted(timeStarted: number): void {
		this.time_started = timeStarted;
	}
	setTimeEnded(timeEnded: number): void {
		this.time_ended = timeEnded;
	}
	setId(id: string): void {
		this.id = id;
	}
}

// Export the class with the old name for backwards compatibility
export { GameData as gamedata };
