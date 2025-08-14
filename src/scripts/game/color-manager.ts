/**
 * Color Manager - Handles round color selection and management
 * Provides color picker functionality and random color selection
 */

import type { ColorPickerState } from "./types.js";
import { RoundColor, COLORS } from "./types.js";
import type { gamedata } from "./gamedata.js";

export class ColorManager {
	private state: ColorPickerState;
	private randomAnimation: { intervalId?: number; isRunning: boolean } = {
		isRunning: false,
	};
	private onColorChangeCallback?: (
		round: number,
		color: RoundColor | null
	) => void;

	constructor(
		private game: gamedata,
		private isDemoMode: boolean = false
	) {
		this.state = {
			isOpen: false,
			currentRound: 1,
		};

		this.initializeEventListeners();
	}

	// Callback setters
	setOnColorChange(
		callback: (round: number, color: RoundColor | null) => void
	): void {
		this.onColorChangeCallback = callback;
	}

	// Public color methods
	setRoundColor(round: number, color: RoundColor): void {
		this.game.setColor(round, color);
		this.saveIfNotDemo();
		this.onColorChangeCallback?.(round, color);
	}

	removeRoundColor(round: number): void {
		this.game.removeColor(round);
		this.saveIfNotDemo();
		this.onColorChangeCallback?.(round, null);
	}

	getCurrentRoundColor(): RoundColor | null {
		const colors = this.game.getColor();
		return colors[this.game.getRound()] || null;
	}

	// Color picker modal
	openColorPicker(round: number = this.game.getRound()): void {
		this.state.currentRound = round;
		this.state.isOpen = true;
		this.showModal("modal_color");
	}

	closeColorPicker(): void {
		this.state.isOpen = false;
		this.closeModal("modal_color");
	}

	// Random color functionality
	selectRandomColor(): void {
		if (this.randomAnimation.isRunning) return;

		const randomColor = this.getRandomColor();
		this.startRandomAnimation(randomColor);
	}

	private getRandomColor(): RoundColor {
		const randomIndex = Math.floor(Math.random() * COLORS.length);
		return COLORS[randomIndex];
	}

	private startRandomAnimation(finalColor: RoundColor): void {
		this.randomAnimation.isRunning = true;

		// Show random color modal
		this.resetRandomModal();
		this.showModal("modal_randomcolor");

		let colorIndex = 0;

		// Animation interval
		this.randomAnimation.intervalId = window.setInterval(() => {
			colorIndex = (colorIndex + 1) % COLORS.length;
			this.updateRandomModalColor(COLORS[colorIndex]);
		}, 150);

		// Stop animation and set final color
		setTimeout(() => {
			this.stopRandomAnimation();
			this.setFinalRandomColor(finalColor);
		}, 2000);
	}

	private stopRandomAnimation(): void {
		if (this.randomAnimation.intervalId) {
			clearInterval(this.randomAnimation.intervalId);
			this.randomAnimation.intervalId = undefined;
		}
		this.randomAnimation.isRunning = false;
	}

	private setFinalRandomColor(color: RoundColor): void {
		this.updateRandomModalColor(color);
		this.setRoundColor(this.game.getRound(), color);

		// Update modal text
		const slotText = document.getElementById("slot_text");
		const randomCloseButton = document.getElementById(
			"random_close_button"
		);

		if (slotText) {
			slotText.textContent = color.toUpperCase();
			slotText.style.color =
				color === RoundColor.YELLOW ? "black" : "white";
		}

		if (randomCloseButton) {
			randomCloseButton.classList.remove("btn-disabled");
		}
	}

	private resetRandomModal(): void {
		const slotText = document.getElementById("slot_text");
		const randomCloseButton = document.getElementById(
			"random_close_button"
		);

		if (slotText) {
			slotText.textContent = "";
		}

		if (randomCloseButton) {
			randomCloseButton.classList.add("btn-disabled");
		}
	}

	private updateRandomModalColor(color: RoundColor): void {
		const container = document.getElementById("random_text_container");
		if (container) {
			container.style.backgroundColor = color;
		}
	}

	// Event listeners setup
	private initializeEventListeners(): void {
		this.setupColorButtons();
		this.setupRandomColorButton();
		this.setupRoundClickListener();
	}

	private setupColorButtons(): void {
		// Individual color buttons
		COLORS.forEach((color) => {
			const button = document.getElementById(`color_${color}`);
			if (button) {
				button.addEventListener("click", () => {
					this.setRoundColor(this.game.getRound(), color);
					this.closeColorPicker();
				});
			}
		});

		// Remove color button
		const noneButton = document.getElementById("color_none");
		if (noneButton) {
			noneButton.addEventListener("click", () => {
				this.removeRoundColor(this.game.getRound());
				this.closeColorPicker();
			});
		}
	}

	private setupRandomColorButton(): void {
		const randomButton = document.getElementById("color_random");
		if (randomButton) {
			randomButton.addEventListener("click", () => {
				this.selectRandomColor();
				this.closeColorPicker();
			});
		}
	}

	private setupRoundClickListener(): void {
		const roundElement = document.getElementById("s_round");
		if (roundElement) {
			roundElement.addEventListener("click", () => {
				this.openColorPicker();
			});
		}
	}

	// Utility methods
	private saveIfNotDemo(): void {
		if (!this.isDemoMode) {
			this.game.save();
		}
	}

	private showModal(modalId: string): void {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		if (modal) {
			modal.showModal();
		}
	}

	private closeModal(modalId: string): void {
		const modal = document.getElementById(modalId) as HTMLDialogElement;
		if (modal) {
			modal.close();
		}
	}

	// Color utility methods
	getColorForRound(round: number): RoundColor | null {
		const colors = this.game.getColor();
		return colors[round] || null;
	}

	getAllRoundColors(): Record<number, RoundColor> {
		return this.game.getColor() as Record<number, RoundColor>;
	}

	hasColorForRound(round: number): boolean {
		return this.getColorForRound(round) !== null;
	}

	// CSS class helpers
	getColorCssClass(color: RoundColor): string {
		return `${color}_tag`;
	}

	// Color validation
	isValidColor(color: string): color is RoundColor {
		return COLORS.includes(color as RoundColor);
	}

	// Cleanup
	destroy(): void {
		this.stopRandomAnimation();
		// Remove event listeners if needed
	}
}
