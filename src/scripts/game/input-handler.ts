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
	private temporaryBlindEntryStates: Map<
		string,
		{ completedPlayers: number[]; enteringPlayer: number | null }
	> = new Map();
	private blindEntryComplete: Set<number> = new Set();
	private blindEntryOrder: number[] = [];
	private blindEntryEnteringPlayer: number | null = null;
	private onTotalUpdateCallback?: (total: number, isValid: boolean) => void;
	private onInputChangeCallback?: (
		playerIndex: number,
		value: number,
	) => void;

	constructor(private game: gamedata, private players: string[]) {}

	// Callback setters
	setOnTotalUpdate(
		callback: (total: number, isValid: boolean) => void,
	): void {
		this.onTotalUpdateCallback = callback;
	}

	setOnInputChange(
		callback: (playerIndex: number, value: number) => void,
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
		if (this.game.getRuleBlindentry()) {
			return { isValid: true };
		}

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
		currentRound: number,
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
			!this.game.getRule_1() ||
			this.game.getRuleBlindentry()
		) {
			return;
		}

		const currentRound = this.game.getRound();
		const lastPlayerRange = this.scores[this.lastPlayerIndex];
		const adjustedTotal = total - lastPlayerRange;

		const insets = document.querySelectorAll(
			`#input_insets_${this.lastPlayerIndex} span`,
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

		const isBlindEntry =
			this.game.getRuleBlindentry() &&
			this.game.getStep() === GameStep.PLACE_BETS;

		let card: HTMLElement;
		if (isBlindEntry) {
			this.blindEntryOrder.push(playerIndex);
			card = this.createBlindEntryCard(playerIndex, player, maxValue);
		} else {
			card = this.createInputCard(playerIndex, player, maxValue);
		}

		const playersContainer = document.getElementById("players");

		if (playersContainer) {
			playersContainer.appendChild(card);
		}

		if (isBlindEntry) {
			this.setupBlindEntryListeners(playerIndex, maxValue);
		} else {
			this.setupInputListeners(playerIndex, maxValue);
		}
	}

	private createInputCard(
		playerIndex: number,
		playerName: string,
		maxValue: number,
	): HTMLElement {
		const card = document.createElement("div");
		card.className = "card w-full lg:w-2/3 bg-base-100 shadow-xl";
		const isReadOnly = this.isTrickInputLocked();

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
					${isReadOnly ? "disabled" : ""}
        />
        <div class="w-full flex justify-between text-xl range-lg insets pl-1 pr-1" id="input_insets_${playerIndex}">
        </div>
      </div>
    `;

		return card;
	}

	private setupInputListeners(playerIndex: number, maxValue: number): void {
		if (this.isTrickInputLocked()) {
			this.createInsets(playerIndex, maxValue);
			return;
		}

		const rangeInput = document.getElementById(
			`input_range_${playerIndex}`,
		) as HTMLInputElement;

		if (rangeInput) {
			rangeInput.addEventListener("input", (event) => {
				const value = parseInt(
					(event.target as HTMLInputElement).value,
				);
				this.setScore(playerIndex, value);
				this.updateInsetHighlight(playerIndex, value);
			});
		}

		this.createInsets(playerIndex, maxValue);
	}

	private createInsets(playerIndex: number, maxValue: number, isBlindEntry: boolean = false): void {
		const prefix = isBlindEntry ? "blind_entry" : "input";
		const insetsContainer = document.getElementById(
			`${prefix}_insets_${playerIndex}`,
		);
		if (!insetsContainer) return;

		for (let i = 0; i <= maxValue; i++) {
			const span = document.createElement("span");
			span.textContent = i.toString();

			if (isBlindEntry) {
				span.className = "range_number";
			} else {
				const hideTrickBetHints =
					this.game.getRuleBlindentry() &&
					this.game.getRuleFullblind() &&
					!this.game.getFullblindBetsRevealed();

				if (
					this.game.getStep() === GameStep.ENTER_TRICKS &&
					!hideTrickBetHints
				) {
					const playerBet =
						this.game.getBets()[this.game.getRound() - 1][playerIndex];
					span.className =
						i === playerBet
							? "range_number_highlighted"
							: "range_number";
				} else {
					span.className = "range_number";
				}
			}

			// Add click listener
			span.addEventListener("click", () => {
				if (!isBlindEntry && this.isTrickInputLocked()) {
					return;
				}

				const rangeInput = document.getElementById(
					`${prefix}_range_${playerIndex}`,
				) as HTMLInputElement;
				if (rangeInput) {
					rangeInput.value = i.toString();
					this.setScore(playerIndex, i);
					this.updateInsetHighlight(playerIndex, i, `${prefix}_insets`);
				}
			});

			insetsContainer.appendChild(span);
		}

		// Adjust font size for rounds > 10
		if (maxValue > 10) {
			const numberElements = insetsContainer.querySelectorAll(
				".range_number, .range_number_highlighted",
			);
			numberElements.forEach((element) => {
				element.classList.add("range_number_small_font");
			});
		}
	}

	private updateInsetHighlight(
		playerIndex: number,
		value: number,
		prefix: string = "input_insets",
	): void {
		const insets = document.querySelectorAll(
			`#${prefix}_${playerIndex} span`,
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
		const step = this.game.getStep();
		const temporaryKey = this.getTemporaryInputKey(currentRound, step);
		const blindEntryState =
			this.temporaryBlindEntryStates.get(temporaryKey);

		this.initializeScores(this.players.length);

		// Reset blind entry state
		this.blindEntryComplete.clear();
		this.blindEntryOrder = [];
		this.blindEntryEnteringPlayer = null;

		if (
			this.game.getRuleBlindentry() &&
			step === GameStep.PLACE_BETS &&
			blindEntryState
		) {
			blindEntryState.completedPlayers.forEach((playerIndex) => {
				this.blindEntryComplete.add(playerIndex);
			});
			this.blindEntryEnteringPlayer = blindEntryState.enteringPlayer;
		}

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

	private createBlindEntryCard(
		playerIndex: number,
		playerName: string,
		maxValue: number,
	): HTMLElement {
		const card = document.createElement("div");
		card.className =
			"card w-full lg:w-2/3 bg-base-100 shadow-xl blind-entry-card";
		card.id = `blind_entry_card_${playerIndex}`;
		const isLocked = this.blindEntryComplete.has(playerIndex);
		const orderIndex = this.blindEntryOrder.indexOf(playerIndex);
		const isActive =
			orderIndex === 0 ||
			(orderIndex > 0 &&
				this.blindEntryComplete.has(
					this.blindEntryOrder[orderIndex - 1],
				));

		card.innerHTML = `
      <div class="card-body">
        <h2 class="card-title text-2xl">${this.escapeHtml(playerName)}</h2>
        <div id="blind_entry_unlocked_${playerIndex}" class="blind-entry-unlocked ${
			!isLocked && isActive ? "" : "hidden"
		}">
          <div style="color: rgb(34 197 94);" class="flex items-center justify-between pb-2">
            <span class="font-bold text-green-500">Ready to enter bet</span>
            <span class="text-3xl">🔓</span>
          </div>
          <button id="blind_entry_unlock_btn_${playerIndex}" class="btn btn-success btn-block mb-2">
            Unlock to Enter Bet
          </button>
        </div>
				<div id="blind_entry_entering_${playerIndex}" class="blind-entry-entering hidden">
          <input 
            type="range" 
            min="0" 
            max="${maxValue}" 
            value="0" 
            class="range blind-entry-range" 
            step="1" 
            aria-label="Bet amount" 
            id="blind_entry_range_${playerIndex}"
          />
          <div class="w-full flex justify-between text-xl range-lg insets pl-1 pr-1" id="blind_entry_insets_${playerIndex}">
          </div>
          <button id="blind_entry_lock_btn_${playerIndex}" class="btn btn-secondary btn-block mt-4">
            Lock Bet
          </button>
        </div>
        <div id="blind_entry_locked_${playerIndex}" class="blind-entry-locked ${
			isLocked ? "" : "hidden"
		}">
          <div class="flex items-center justify-between pb-2">
            <span class="font-semibold text-blue-400">Bet Locked</span>
            <span class="text-3xl text-blue-400">🔒</span>
          </div>
        </div>
        <div id="blind_entry_waiting_${playerIndex}" class="blind-entry-waiting ${
			!isActive && !isLocked ? "" : "hidden"
		}">
          <div class="flex items-center justify-between pb-2 opacity-50">
            <span class="font-semibold">Waiting...</span>
            <span class="text-3xl">⏳</span>
          </div>
        </div>
      </div>
    `;

		return card;
	}

	private setupBlindEntryListeners(
		playerIndex: number,
		maxValue: number,
	): void {
		const unlockBtn = document.getElementById(
			`blind_entry_unlock_btn_${playerIndex}`,
		) as HTMLButtonElement;
		const lockBtn = document.getElementById(
			`blind_entry_lock_btn_${playerIndex}`,
		) as HTMLButtonElement;
		const rangeInput = document.getElementById(
			`blind_entry_range_${playerIndex}`,
		) as HTMLInputElement;

		if (unlockBtn) {
			unlockBtn.addEventListener("click", () => {
				this.handleBlindEntryUnlock(playerIndex);
			});
		}

		if (lockBtn) {
			lockBtn.addEventListener("click", () => {
				this.handleBlindEntryLock(playerIndex);
			});
		}

		if (rangeInput) {
			rangeInput.addEventListener("input", (event) => {
				const value = parseInt(
					(event.target as HTMLInputElement).value,
				);
				this.setScore(playerIndex, value);
				this.updateInsetHighlight(playerIndex, value, "blind_entry_insets");
			});
		}

		this.createInsets(playerIndex, maxValue, true);
	}

	private handleBlindEntryUnlock(playerIndex: number): void {
		const unlockedDiv = document.getElementById(
			`blind_entry_unlocked_${playerIndex}`,
		);
		const enteringDiv = document.getElementById(
			`blind_entry_entering_${playerIndex}`,
		);

		if (unlockedDiv && enteringDiv) {
			unlockedDiv.classList.add("hidden");
			enteringDiv.classList.remove("hidden");
		}

		this.blindEntryEnteringPlayer = playerIndex;
	}

	private handleBlindEntryLock(playerIndex: number): void {
		const orderIndex = this.blindEntryOrder.indexOf(playerIndex);
		const isLastPlayer =
			orderIndex === this.blindEntryOrder.length - 1;
		const violatesPlusMinusOneRule =
			isLastPlayer &&
			this.game.getRule_1() &&
			this.game.getRound() !== 1 &&
			this.calculateTotal() === this.game.getRound();

		if (violatesPlusMinusOneRule) {
			this.showBlindEntryLockBlockedState(playerIndex);
			return;
		}

		const enteringDiv = document.getElementById(
			`blind_entry_entering_${playerIndex}`,
		);
		const lockedDiv = document.getElementById(
			`blind_entry_locked_${playerIndex}`,
		);

		if (enteringDiv && lockedDiv) {
			enteringDiv.classList.add("hidden");
			lockedDiv.classList.remove("hidden");
		}

		this.blindEntryComplete.add(playerIndex);
		this.blindEntryEnteringPlayer = null;

		// Find the next player in the order
		if (orderIndex >= 0 && orderIndex < this.blindEntryOrder.length - 1) {
			const nextPlayerIndex = this.blindEntryOrder[orderIndex + 1];
			const nextCard = document.getElementById(
				`blind_entry_card_${nextPlayerIndex}`,
			);

			if (nextCard) {
				const nextWaitingDiv = document.getElementById(
					`blind_entry_waiting_${nextPlayerIndex}`,
				);
				const nextUnlockedDiv = document.getElementById(
					`blind_entry_unlocked_${nextPlayerIndex}`,
				);

				if (nextWaitingDiv && nextUnlockedDiv) {
					nextWaitingDiv.classList.add("hidden");
					nextUnlockedDiv.classList.remove("hidden");
				}
			}
		}

		// Update validation
		this.updateTotal();
	}

	private showBlindEntryLockBlockedState(playerIndex: number): void {
		const lockBtn = document.getElementById(
			`blind_entry_lock_btn_${playerIndex}`,
		) as HTMLButtonElement;
		if (!lockBtn) {
			return;
		}

		const originalText = lockBtn.textContent;
		lockBtn.textContent = "Invalid with ±1 Rule";
		lockBtn.classList.remove("btn-secondary");
		lockBtn.classList.add("btn-error");

		setTimeout(() => {
			lockBtn.textContent = originalText;
			lockBtn.classList.remove("btn-error");
			lockBtn.classList.add("btn-secondary");
		}, 1200);
	}





	private isTrickInputLocked(): boolean {
		return (
			this.game.getStep() === GameStep.ENTER_TRICKS &&
			this.game.getRuleBlindentry() &&
			this.game.getRuleFullblind() &&
			this.game.getFullblindBetsRevealed()
		);
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

	isBlindEntryComplete(): boolean {
		if (
			!this.game.getRuleBlindentry() ||
			this.game.getStep() !== GameStep.PLACE_BETS
		) {
			return true;
		}

		const playerCount = this.players.length;
		for (let i = 0; i < playerCount; i++) {
			if (!this.blindEntryComplete.has(i)) {
				return false;
			}
		}
		return true;
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
		this.temporaryInputs.set(key, [...this.scores]);

		if (this.game.getRuleBlindentry() && step === GameStep.PLACE_BETS) {
			const completedPlayers = this.blindEntryOrder.filter(
				(playerIndex) => this.blindEntryComplete.has(playerIndex),
			);
			this.temporaryBlindEntryStates.set(key, {
				completedPlayers,
				enteringPlayer: this.blindEntryEnteringPlayer,
			});
		} else {
			this.temporaryBlindEntryStates.delete(key);
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
			this.restoreBlindEntryViewState(key);
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
		this.temporaryBlindEntryStates.delete(key);
	}

	private getTemporaryInputKey(
		round: number,
		step: GameStep | undefined,
	): string {
		return `${round}_${step || "unknown"}`;
	}

	private restoreInputFieldValues(): void {
		const isBlindEntry =
			this.game.getRuleBlindentry() &&
			this.game.getStep() === GameStep.PLACE_BETS;

		this.scores.forEach((score, playerIndex) => {
			const rangeInputId = isBlindEntry
				? `blind_entry_range_${playerIndex}`
				: `input_range_${playerIndex}`;
			const rangeInput = document.getElementById(
				rangeInputId,
			) as HTMLInputElement;
			if (rangeInput) {
				rangeInput.value = score.toString();
				if (isBlindEntry) {
					this.updateInsetHighlight(playerIndex, score, "blind_entry_insets");
				} else {
					this.updateInsetHighlight(playerIndex, score);
				}
			}
		});
	}

	private restoreBlindEntryViewState(key: string): void {
		if (
			!this.game.getRuleBlindentry() ||
			this.game.getStep() !== GameStep.PLACE_BETS
		) {
			return;
		}

		const state = this.temporaryBlindEntryStates.get(key);
		if (!state) {
			return;
		}

		const completed = new Set(state.completedPlayers);
		const enteringPlayer = state.enteringPlayer;

		let unlockablePlayer: number | null = null;
		if (enteringPlayer === null) {
			unlockablePlayer =
				this.blindEntryOrder.find(
					(playerIndex) => !completed.has(playerIndex),
				) ?? null;
		}

		this.blindEntryOrder.forEach((playerIndex) => {
			const unlockedDiv = document.getElementById(
				`blind_entry_unlocked_${playerIndex}`,
			);
			const enteringDiv = document.getElementById(
				`blind_entry_entering_${playerIndex}`,
			);
			const lockedDiv = document.getElementById(
				`blind_entry_locked_${playerIndex}`,
			);
			const waitingDiv = document.getElementById(
				`blind_entry_waiting_${playerIndex}`,
			);

			if (!unlockedDiv || !enteringDiv || !lockedDiv || !waitingDiv) {
				return;
			}

			const isCompleted = completed.has(playerIndex);
			const isEntering = enteringPlayer === playerIndex;
			const isUnlockable =
				!isCompleted && !isEntering && unlockablePlayer === playerIndex;

			unlockedDiv.classList.toggle("hidden", !isUnlockable);
			enteringDiv.classList.toggle("hidden", !isEntering);
			lockedDiv.classList.toggle("hidden", !isCompleted);
			waitingDiv.classList.toggle(
				"hidden",
				isCompleted || isEntering || isUnlockable,
			);
		});

		this.blindEntryEnteringPlayer = enteringPlayer;
	}
}
