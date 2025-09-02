/**
 * Input Handler - Manages all input-related functionality
 * Handles player input for bets and tricks with validation
 */

import type {
	InputRange,
	InputValidation,
	InputHandler as InputHandlerType,
} from "./types.js";
import { GameStep } from "./types.js";
import type { gamedata } from "./gamedata.js";

export class InputHandler {
	private scores: number[] = [];
	private lastPlayerIndex: number = 0;
	private temporaryInputs: Map<string, number[]> = new Map();
	private onTotalUpdateCallback?: (total: number, isValid: boolean) => void;
	private onInputChangeCallback?: (
		playerIndex: number,
		value: number
	) => void;

	constructor(
		private game: gamedata,
		private players: string[]
	) {}

	// Callback setters
	setOnTotalUpdate(
		callback: (total: number, isValid: boolean) => void
	): void {
		this.onTotalUpdateCallback = callback;
	}

	setOnInputChange(
		callback: (playerIndex: number, value: number) => void
	): void {
		this.onInputChangeCallback = callback;
	}

	// Score management
	getScores(): number[] {
		return [...this.scores];
	}

	setScore(playerIndex: number, value: number): void {
		this.scores[playerIndex] = value;
		this.updateTotal();
		this.onInputChangeCallback?.(playerIndex, value);
	}

	initializeScores(playerCount: number): void {
		this.scores = new Array(playerCount).fill(0);
	}

	// Input validation
	validateInput(): InputValidation {
		const total = this.calculateTotal();
		const currentRound = this.game.getRound();
		const step = this.game.getStep();

		if (step === GameStep.PLACE_BETS) {
			return this.validateBets(total, currentRound);
		} else {
			return this.validateTricks(total, currentRound);
		}
	}

	private validateBets(total: number, currentRound: number): InputValidation {
		// Rule 1: Total bets cannot equal current round (except round 1)
		if (
			currentRound !== 1 &&
			this.game.getRule_1() &&
			total === currentRound
		) {
			return {
				isValid: false,
				message: "Total bets cannot equal the number of cards",
				errorType: "rule_violation",
			};
		}

		return { isValid: true };
	}

	private validateTricks(
		total: number,
		currentRound: number
	): InputValidation {
		// Tricks must equal the current round (unless expansion rule is active)
		if (!this.game.getRuleExpansion() && total !== currentRound) {
			return {
				isValid: false,
				message: `Total tricks must equal ${currentRound}`,
				errorType: "total_mismatch",
			};
		}

		return { isValid: true };
	}

	// Total calculation
	private calculateTotal(): number {
		return this.scores.reduce((sum, score) => sum + score, 0);
	}

	private updateTotal(): void {
		const total = this.calculateTotal();
		const validation = this.validateInput();

		this.onTotalUpdateCallback?.(total, validation.isValid);
		this.updateImpossibleBets(total);
	}

	private updateImpossibleBets(total: number): void {
		if (
			this.game.getStep() !== GameStep.PLACE_BETS ||
			!this.game.getRule_1()
		) {
			return;
		}

		const currentRound = this.game.getRound();
		const lastPlayerRange = this.scores[this.lastPlayerIndex];
		const adjustedTotal = total - lastPlayerRange;

		const insets = document.querySelectorAll(
			`#input_insets_${this.lastPlayerIndex} span`
		);

		insets.forEach((inset) => {
			const number = parseInt(inset.textContent || "0");
			if (number + adjustedTotal === currentRound) {
				inset.classList.add("range_number_impossible");
			} else {
				inset.classList.remove("range_number_impossible");
			}
		});
	}

	// Player input creation
	createPlayerInput(playerIndex: number, maxValue: number): void {
		this.lastPlayerIndex = playerIndex;
		const player = this.players[playerIndex];

		const card = this.createInputCard(playerIndex, player, maxValue);
		const playersContainer = document.getElementById("players");

		if (playersContainer) {
			playersContainer.appendChild(card);
		}

		this.setupInputListeners(playerIndex, maxValue);
	}

	private createInputCard(
		playerIndex: number,
		playerName: string,
		maxValue: number
	): HTMLElement {
		const card = document.createElement("div");
		card.className = "card w-full lg:w-2/3 bg-base-100 shadow-xl";

		card.innerHTML = `
      <div class="card-body">
        <h2 class="card-title text-2xl">${this.escapeHtml(playerName)}</h2>
        <input 
          type="range" 
          min="0" 
          max="${maxValue}" 
          value="0" 
          class="range" 
          step="1" 
          aria-label="Input" 
          id="input_range_${playerIndex}"
        />
        <div class="w-full flex justify-between text-xl range-lg insets pl-1 pr-1" id="input_insets_${playerIndex}">
        </div>
      </div>
    `;

		return card;
	}

	private setupInputListeners(playerIndex: number, maxValue: number): void {
		const rangeInput = document.getElementById(
			`input_range_${playerIndex}`
		) as HTMLInputElement;

		if (rangeInput) {
			rangeInput.addEventListener("input", (event) => {
				const value = parseInt(
					(event.target as HTMLInputElement).value
				);
				this.setScore(playerIndex, value);
				this.updateInsetHighlight(playerIndex, value);
			});
		}

		this.createInsets(playerIndex, maxValue);
	}

	private createInsets(playerIndex: number, maxValue: number): void {
		const insetsContainer = document.getElementById(
			`input_insets_${playerIndex}`
		);
		if (!insetsContainer) return;

		for (let i = 0; i <= maxValue; i++) {
			const span = document.createElement("span");
			span.textContent = i.toString();

			if (this.game.getStep() === GameStep.ENTER_TRICKS) {
				const playerBet =
					this.game.getBets()[this.game.getRound() - 1][playerIndex];
				span.className =
					i === playerBet
						? "range_number_highlighted"
						: "range_number";
			} else {
				span.className = "range_number";
			}

			// Add click listener
			span.addEventListener("click", () => {
				const rangeInput = document.getElementById(
					`input_range_${playerIndex}`
				) as HTMLInputElement;
				if (rangeInput) {
					rangeInput.value = i.toString();
					this.setScore(playerIndex, i);
					this.updateInsetHighlight(playerIndex, i);
				}
			});

			insetsContainer.appendChild(span);
		}

		// Adjust font size for rounds > 10
		if (maxValue > 10) {
			const numberElements = insetsContainer.querySelectorAll(
				".range_number, .range_number_highlighted"
			);
			numberElements.forEach((element) => {
				element.classList.add("range_number_small_font");
			});
		}
	}

	private updateInsetHighlight(playerIndex: number, value: number): void {
		const insets = document.querySelectorAll(
			`#input_insets_${playerIndex} span`
		);

		insets.forEach((inset, index) => {
			if (index === value) {
				inset.classList.add("underline");
			} else {
				inset.classList.remove("underline");
			}
		});
	}

	// Input update workflow
	updateInputView(): void {
		this.clearInputContainer();

		const currentRound = this.game.getRound();
		const maxValue = currentRound;

		this.initializeScores(this.players.length);

		// Add players in dealer order
		this.addPlayersInDealerOrder(maxValue);

		// Try to restore previously entered values
		const restored = this.restoreTemporaryInput();
		if (!restored) {
			this.updateTotal();
		}
	}

	private addPlayersInDealerOrder(maxValue: number): void {
		const dealer = this.game.getDealer();
		const playerCount = this.players.length;

		// Add players from dealer + 1 to end
		for (let i = dealer + 1; i < playerCount; i++) {
			this.createPlayerInput(i, maxValue);
		}

		// Add players from start to dealer
		for (let i = 0; i <= dealer; i++) {
			this.createPlayerInput(i, maxValue);
		}
	}

	private clearInputContainer(): void {
		const playersContainer = document.getElementById("players");
		if (playersContainer) {
			playersContainer.innerHTML = "";
		}
	}

	// Utility methods
	private escapeHtml(text: string): string {
		const div = document.createElement("div");
		div.textContent = text;
		return div.innerHTML;
	}

	// Public methods for game controller
	confirmInput(): boolean {
		const validation = this.validateInput();
		return validation.isValid;
	}

	getCurrentTotal(): number {
		return this.calculateTotal();
	}

	getValidationMessage(): string {
		const validation = this.validateInput();
		return validation.message || "";
	}

	// Temporary input state management
	saveTemporaryInput(): void {
		const round = this.game.getRound();
		const step = this.game.getStep();
		const key = this.getTemporaryInputKey(round, step);

		// Only save if there are actually some non-zero values
		if (this.scores.some((score) => score > 0)) {
			this.temporaryInputs.set(key, [...this.scores]);
		}
	}

	restoreTemporaryInput(): boolean {
		const round = this.game.getRound();
		const step = this.game.getStep();
		const key = this.getTemporaryInputKey(round, step);

		const savedInputs = this.temporaryInputs.get(key);
		if (savedInputs && savedInputs.length === this.players.length) {
			this.scores = [...savedInputs];
			this.restoreInputFieldValues();
			this.updateTotal();
			return true;
		}
		return false;
	}

	clearTemporaryInput(): void {
		const round = this.game.getRound();
		const step = this.game.getStep();
		const key = this.getTemporaryInputKey(round, step);
		this.temporaryInputs.delete(key);
	}

	private getTemporaryInputKey(
		round: number,
		step: GameStep | undefined
	): string {
		return `${round}_${step || "unknown"}`;
	}

	private restoreInputFieldValues(): void {
		this.scores.forEach((score, playerIndex) => {
			const rangeInput = document.getElementById(
				`input_range_${playerIndex}`
			) as HTMLInputElement;
			if (rangeInput) {
				rangeInput.value = score.toString();
				this.updateInsetHighlight(playerIndex, score);
			}
		});
	}
}
