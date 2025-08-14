/**
 * UI State Manager - Handles all UI state and DOM manipulation
 * Separates UI concerns from game logic for better maintainability
 */

import type { UIState, NavigationState, ClickHandler } from "./types.js";
import { ScoreView, GameDisplay, GameStep } from "./types.js";

export class UIStateManager {
	private state: UIState;
	private navigationState: NavigationState;

	constructor() {
		this.state = {
			currentView: ScoreView.CHART,
			editMode: false,
			inputBlockReload: false,
			isValidInput: true,
		};

		this.navigationState = {
			isPrimary: true,
			isDisabled: false,
			text: "Confirm",
		};
	}

	// State getters
	getCurrentView(): ScoreView {
		return this.state.currentView;
	}

	isEditMode(): boolean {
		return this.state.editMode;
	}

	isInputBlocked(): boolean {
		return this.state.inputBlockReload;
	}

	isValidInput(): boolean {
		return this.state.isValidInput;
	}

	// State setters
	setCurrentView(view: ScoreView): void {
		this.state.currentView = view;
	}

	setEditMode(editMode: boolean): void {
		this.state.editMode = editMode;
		(globalThis as any).editmode = editMode;
	}

	setInputBlocked(blocked: boolean): void {
		this.state.inputBlockReload = blocked;
	}

	setValidInput(valid: boolean): void {
		this.state.isValidInput = valid;
		this.updateNavigationStyle(valid);
	}

	// Navigation methods
	updateNavigationStyle(isPrimary: boolean): void {
		this.navigationState.isPrimary = isPrimary;

		const chartNav = document.getElementById("chart_nav");
		const navButton = document.getElementById("nav_button");
		const chartNavRight = document.getElementById("chart_nav_right");

		if (isPrimary) {
			this.setNavigationBlue([chartNav, navButton, chartNavRight]);
		} else {
			this.setNavigationRed([chartNav, navButton, chartNavRight]);
		}
	}

	private setNavigationBlue(elements: (HTMLElement | null)[]): void {
		elements.forEach((element) => {
			if (element) {
				element.classList.remove("btn-primary");
				element.classList.add("btn-secondary");
			}
		});
	}

	private setNavigationRed(elements: (HTMLElement | null)[]): void {
		elements.forEach((element) => {
			if (element) {
				element.classList.remove("btn-secondary");
				element.classList.add("btn-primary");
			}
		});
	}

	setNavigationText(text: string): void {
		this.navigationState.text = text;
		const navText = document.getElementById("navtext");
		if (navText) {
			navText.textContent = text;
		}
	}

	freezeNavigationButton(duration: number = 500): void {
		const navButton = document.getElementById("nav_button");
		const navGraphs = document.querySelectorAll(".nav_graph");

		if (navButton) {
			navButton.classList.add("btn-disabled");
		}

		navGraphs.forEach((element) => {
			element.classList.add("btn-disabled");
		});

		setTimeout(() => {
			if (navButton) {
				navButton.classList.remove("btn-disabled");
			}
			navGraphs.forEach((element) => {
				element.classList.remove("btn-disabled");
			});
		}, duration);
	}

	// Display management
	showScoreView(): void {
		this.hideElement("input");
		this.showElement("score");
		this.hideGraphIcon();
	}

	showInputView(): void {
		this.hideElement("score");
		this.showElement("input");
		this.hideElement("bet_display_container");
		this.showGraphIcon();
	}

	showBetDisplay(): void {
		this.showElement("bet_display_container");
	}

	hideBetDisplay(): void {
		this.hideElement("bet_display_container");
	}

	showElement(id: string): void {
		const element = document.getElementById(id);
		if (element) {
			element.classList.remove("hidden");
		}
	}

	hideElement(id: string): void {
		const element = document.getElementById(id);
		if (element) {
			element.classList.add("hidden");
		}
	}

	private showGraphIcon(): void {
		const chartNavIcon = document.getElementById("chart_nav_icon");
		const navButton = document.getElementById("nav_button");
		const navGraphs = document.querySelectorAll(".nav_graph");

		if (chartNavIcon) {
			chartNavIcon.classList.remove("hidden");
		}
		if (navButton) {
			navButton.classList.add("join-item");
		}
		navGraphs.forEach((element) => {
			element.classList.remove("hidden");
		});
	}

	private hideGraphIcon(): void {
		const chartNavIcon = document.getElementById("chart_nav_icon");
		const navButton = document.getElementById("nav_button");
		const navGraphs = document.querySelectorAll(".nav_graph");

		if (chartNavIcon) {
			chartNavIcon.classList.add("hidden");
		}
		if (navButton) {
			navButton.classList.remove("join-item");
		}
		navGraphs.forEach((element) => {
			element.classList.add("hidden");
		});
	}

	// Round info display
	updateRoundInfo(
		currentRound: number,
		maxRounds: number,
		colors: Record<number, string>
	): void {
		const roundElement = document.getElementById("s_round");
		if (!roundElement) return;

		const roundText =
			maxRounds === Number.MAX_SAFE_INTEGER
				? `${currentRound}/∞`
				: `${currentRound}/${maxRounds}`;

		roundElement.textContent = roundText;
		roundElement.className = "text-4xl h-full";

		const roundColor = colors[currentRound];
		if (roundColor) {
			roundElement.classList.add(`${roundColor}_tag`);
		}
	}

	// Bet display management
	updateBetDisplay(totalBets: number, currentRound: number): void {
		const betAbove = document.getElementById("bet_above");
		const betBelow = document.getElementById("bet_below");
		const betAboveText = document.getElementById("bet_above_text");
		const betBelowText = document.getElementById("bet_below_text");

		if (totalBets > currentRound) {
			// Too many bets
			betAbove?.classList.remove("hidden");
			betBelow?.classList.add("hidden");
			if (betAboveText) {
				betAboveText.textContent = (
					totalBets - currentRound
				).toString();
			}
		} else if (totalBets < currentRound) {
			// Too few bets
			betAbove?.classList.add("hidden");
			betBelow?.classList.remove("hidden");
			if (betBelowText) {
				betBelowText.textContent = (
					currentRound - totalBets
				).toString();
			}
		} else {
			// Perfect bet total
			betAbove?.classList.add("hidden");
			betBelow?.classList.add("hidden");
		}
	}

	// Modal management
	showModal(modalId: string): void {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		if (modal) {
			modal.showModal();
		}
	}

	closeModal(modalId: string): void {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		if (modal) {
			modal.close();
		}
	}

	// Game step specific UI updates
	updateUIForStep(step: GameStep): void {
		switch (step) {
			case GameStep.PLACE_BETS:
				this.setNavigationText("Place Bets");
				this.hideBetDisplay();
				break;
			case GameStep.ENTER_TRICKS:
				this.setNavigationText("Enter Tricks");
				this.showBetDisplay();
				break;
			case GameStep.CELEBRATION:
				this.updateNavigationStyle(true);
				this.showElement("tab_celeb");
				this.hideElement("endgame");
				this.hideElement("savequit");
				this.showElement("continuegame");
				this.hideElement("rules");
				break;
		}
	}

	// Input field management
	clearInputContainer(): void {
		const playersContainer = document.getElementById("players");
		if (playersContainer) {
			playersContainer.innerHTML = "";
		}
	}

	updateRoundHeader(
		currentRound: number,
		maxRounds: number,
		step: GameStep
	): void {
		const roundElement = document.getElementById("round");
		if (!roundElement) return;

		const stepText =
			step === GameStep.PLACE_BETS ? "Place Bets" : "Enter Tricks";
		const maxRoundsText =
			maxRounds === Number.MAX_SAFE_INTEGER ? "∞" : maxRounds.toString();

		roundElement.textContent = `${currentRound}/${maxRoundsText} - ${stepText}`;
	}

	// Event listener management
	addClickListener(elementId: string, handler: ClickHandler): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.addEventListener("click", handler);
		}
	}

	addClickListenerToClass(className: string, handler: ClickHandler): void {
		const elements = document.querySelectorAll(`.${className}`);
		elements.forEach((element) => {
			element.addEventListener("click", handler);
		});
	}

	setElementText(elementId: string, text: string): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.textContent = text;
		}
	}

	setElementHtml(elementId: string, html: string): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.innerHTML = html;
		}
	}

	addElementClass(elementId: string, className: string): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.classList.add(className);
		}
	}

	removeElementClass(elementId: string, className: string): void {
		const element = document.getElementById(elementId);
		if (element) {
			element.classList.remove(className);
		}
	}

	setElementStyle(elementId: string, property: string, value: string): void {
		const element = document.getElementById(elementId) as HTMLElement;
		if (element) {
			element.style.setProperty(property, value);
		}
	}
}
