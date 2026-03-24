import { elements } from "chart.js";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

export class TutorialManager {
	private driver: any;
	private seenTours: Set<string> = new Set();
	private readonly TOUR_KEYS = ["game", "input_bets", "input_tricks", "blindentry_bets", "blindentry_tricks", "graph", "bet_display"];
	private readonly DEV_ALWAYS_RUN_TOURS = false; // Set to true to force tours to run every time
	private readonly TOUR_DELAY = 1;
	private currentHighlightedElement: HTMLElement | null = null;
	private isTourActive: boolean = false;
	private allowClick: boolean = false;

	constructor() {
		this.driver = driver({
			showProgress: true,
			animate: true,
			allowClose: true,
			doneBtnText: "Done",
			nextBtnText: "Next",
			prevBtnText: "Previous",
			popoverClass: "driverjs-theme",
			onHighlightStarted: (element: Element) => {
				this.isTourActive = true;
				if (element) {
					this.currentHighlightedElement = element as HTMLElement;
					// Keep pointer-events logic as a backup
					this.currentHighlightedElement.style.pointerEvents = "none";
				}
			},
			onDeselected: (element: Element) => {
				if (element) {
					(element as HTMLElement).style.pointerEvents = "";
				} else if (this.currentHighlightedElement) {
					this.currentHighlightedElement.style.pointerEvents = "";
				}
				this.currentHighlightedElement = null;
			},
			onDestroyed: () => {
				this.isTourActive = false;
				if (this.currentHighlightedElement) {
					this.currentHighlightedElement.style.pointerEvents = "";
					this.currentHighlightedElement = null;
				}
			},
		});

		// Block interaction with elements during tour
		document.addEventListener(
			"click",
			(e) => {
				if (this.allowClick) return;
				if (!this.isTourActive) return;

				const target = e.target as HTMLElement;
				// Allow interactions with the driver popover (buttons etc)
				if (target.closest(".driver-popover")) return;

				// Allow clicking the overlay (to close the tour if allowed)
				if (
					target.id === "driver-page-overlay" ||
					target.classList.contains("driver-overlay")
				)
					return;

				// Block everything else
				e.preventDefault();
				e.stopPropagation();
				e.stopImmediatePropagation();
			},
			true
		);

		if (this.DEV_ALWAYS_RUN_TOURS) {
			this.seenTours.clear();
		} else {
			this.TOUR_KEYS.forEach(key => {
				if (localStorage.getItem(`tour_${key}`) === "true") {
					this.seenTours.add(key);
				}
			});
		}
	}

	public reset() {
		this.TOUR_KEYS.forEach(key => localStorage.removeItem(`tour_${key}`));
		this.seenTours.clear();
	}

	private isElementVisible(selector: string): boolean {
		const el = document.querySelector(selector) as HTMLElement;
		return !!(el && el.offsetParent !== null);
	}

	public runGameTour(force: boolean = false) {
		if (this.seenTours.has("game") && !force) return;
		if (this.isTourActive) return;

		if (!force) {
			if (!this.isElementVisible("#score")) return;
			if (this.isElementVisible("#bet_display_container")) return;

			// Block if advanced tabs are visible (game is advanced)
			const tabNavigation = document.getElementById("tab_navigation");
			if (tabNavigation && tabNavigation.style.display !== "none") return;
		}

		const steps = [
			{
				popover: {
					title: "Welcome to the game",
					description: "Let's take a quick tour of the game screen!",
				},
			},
			{
				element: "#s_round",
				popover: {
					title: "Round Info",
					description:
						"Here you can see the current round, click it to set a color.",
					side: "bottom",
					align: "start",
				},
			},
			{
				element: "#top_players",
				popover: {
					title: "Players & Scores",
					description:
						"See how everyone is doing. The current dealer is highlighted! Click a player to see advanced stats and edit mistakes.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#nav_button",
				popover: {
					title: "Action Button",
					description:
						"This is the main button that adapts to the current state: enter bets, tricks, or finish the game.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#settings_btn",
				popover: {
					title: "Settings",
					description:
						"Set the color for the round. Change game rules, the dealer, restart this tour or finish the game.",
					side: "bottom",
					align: "end",
				},
			},
		];

		this.driver.setSteps(steps);
		this.isTourActive = true;
		this.driver.drive();

		localStorage.setItem("tour_game", "true");
		this.seenTours.add("game");
	}

	public runInputBetsTour() {
		if (this.seenTours.has("input_bets")) return;

		// Wait a brief moment for the input screen to be fully rendered
		if (!this.isElementVisible("#input")) return;
		if (this.isTourActive) return;

		const steps = [
			{
				popover: {
					title: "Step 2: Place Your Bets",
					description:
						"Here you can enter how many tricks each player thinks they will win this round.",
					side: "bottom",
					align: "center",
				},
			},
			{
				element: "#input-container",
				popover: {
					title: "Round & Total",
					description:
						"The current round and the combined total bets of all players are shown here.",
					side: "bottom",
					align: "center",
				},
			},
			{
				element: "#players",
				popover: {
					title: "Enter Bets",
					description:
						"Use the sliders to set the bet for each player. They are all set to 0 by default.",
					side: "top",
					align: "center",
				},
			},
			{
				element: ".range_number_impossible",
				popover: {
					title: "Impossible Bets",
					description:
						"The +-1 rule is active! To keep the game challenging, the dealer cannot make a bet that would make the total bets equal the round number.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#chart_nav_icon",
				popover: {
					title: "Go back",
					description:
						"You can always return to the game screen without continuing by clicking this button. No worries, the entered bets will be saved!",
					side: "top",
					align: "right",
				},
			},
			{
				element: "#nav_button",
				popover: {
					title: "Confirm",
					description:
						"Once every bet is tracked, click here to start the round.",
					side: "top",
					align: "center",
				},
			},
		];

		this.isTourActive = true;
		this.driver.setSteps(steps);
		this.driver.drive();

		localStorage.setItem("tour_input_bets", "true");
		this.seenTours.add("input_bets");
	}

	public runInputTricksTour() {
		if (this.seenTours.has("input_tricks")) return;

		if (this.isTourActive) return;
		if (!this.isElementVisible("#input")) return;

		const steps = [
			{
				popover: {
					title: "Step 4: Entering Tricks",
					description:
						"After the round, enter the actual tricks won. This is very similar to entering the bets.",
				},
			},
			{
				element: "#input-container",
				popover: {
					title: "Round & Total",
					description:
						"The current round and the combined total tricks won by all players are shown here in comparison to the possible tricks for this round.",
					side: "bottom",
					align: "center",
				},
			},
			{
				element: "#players",
				popover: {
					title: "Enter Tricks",
					description:
						"Use the sliders to set the tricks won for each player. They are all set to 0 by default.",
					side: "top",
					align: "center",
				},
			},
			{
				element: ".range_number_highlighted",
				popover: {
					title: "Bets",
					description:
						"The highlighted number shows the bet the player made.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#nav_button",
				popover: {
					title: "Continue",
					description:
						"Continue here once all tricks are entered. The colors will indicate if the all tricks are entered.",
					side: "top",
					align: "center",
				},
			},
		];
		this.isTourActive = true;
		this.driver.setSteps(steps);
		this.driver.drive();

		localStorage.setItem("tour_input_tricks", "true");
		this.seenTours.add("input_tricks");
	}

	public runBlindEntryBetsTour() {
		if (this.seenTours.has("blindentry_bets")) return;
		if (!this.isElementVisible("#input")) return;
		if (!this.isElementVisible("#players")) return;
		if (this.isTourActive) return;

		const steps = [
			{
				popover: {
					title: "Blind Entry Bets",
					description:
						"In this mode, bets are entered one by one so no one can see the others.",
				},
			},
			{
				element: "#players",
				popover: {
					title: "Sequential Input",
					description:
						"Only one player can enter at a time. Others stay in waiting state until it is their turn.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "[id^='blind_entry_unlock_btn_']",
				popover: {
					title: "Unlock, Then Enter",
					description:
						"The active player taps Unlock, sets a bet, and locks it to pass control to the next player.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#nav_button",
				popover: {
					title: "Confirm After All Locked",
					description:
						"This button only proceeds once all players have locked their bets.",
					side: "top",
					align: "center",
				},
			},
		];

		this.isTourActive = true;
		this.driver.setSteps(steps);
		this.driver.drive();

		localStorage.setItem("tour_blindentry_bets", "true");
		this.seenTours.add("blindentry_bets");
	}

	public runBlindEntryTricksTour() {
		if (this.seenTours.has("blindentry_tricks")) return;
		if (!this.isElementVisible("#input")) return;
		if (!this.isElementVisible("#players")) return;
		if (this.isTourActive) return;

		const steps = [
			{
				popover: {
					title: "Blind Entry Tricks",
					description:
						"Enter tricks as usual. In FullBlind, the first confirm reveals bets and locks the entered tricks.",
				},
			},
			{
				element: "#players",
				popover: {
					title: "Trick Input",
					description:
						"Set each player's trick count. Once revealed in FullBlind, bet markers become visible.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#nav_button",
				popover: {
					title: "Continue",
					description:
						"First click reveal the players bets. Click Continue to proceed to the score view.",
						"The first click reveals the players' bets. Click Continue to proceed to the score view.",
					align: "center",
				},
			},
		];

		this.isTourActive = true;
		this.driver.setSteps(steps);
		this.driver.drive();

		localStorage.setItem("tour_blindentry_tricks", "true");
		this.seenTours.add("blindentry_tricks");
	}

	public runGraphTour() {
		if (this.seenTours.has("graph")) return;

		const tabContainer = document.getElementById("tab_navigation");
		if (!tabContainer || !this.isElementVisible("#tab_navigation")) return;

		// Ensure graph tab is actually visible/unlocked before running
		const graphTab = document.getElementById("tab_chart");
		if (!graphTab || graphTab.classList.contains("hidden")) return;

		if (this.isTourActive) return;

		// Reset to top view to ensure consistent starting point
		const tabTop = document.getElementById("tab_top");
		if (tabTop) {
			this.allowClick = true;
			tabTop.click();
			this.allowClick = false;
		}

		const steps = [
			{
				popover: {
					title: "New Views Unlocked!",
					description:
						"You have played enough rounds to see more statistics about the game.",
				},
			},
			{
				element: "#tab_chart",
				popover: {
					title: "Chart View",
					description:
						"Click the the chart icon to see how the scores developed over the game.",
					side: "bottom",
					align: "center",
					onNextClick: () => {
						const btn = document.getElementById("tab_chart");
						if (btn) {
							this.allowClick = true;
							btn.click();
							this.allowClick = false;
						}
						this.driver.moveNext();
					},
				},
			},
			{
				element: "#chart_container",
				popover: {
					title: "Score History",
					description: "This chart shows the score progression.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#tab_analytics",
				popover: {
					title: "Analytics View",
					description:
						"Click here to dive deeper into game statistics.",
					side: "bottom",
					align: "center",
					onNextClick: () => {
						const btn = document.getElementById("tab_analytics");
						if (btn) {
							this.allowClick = true;
							btn.click();
							this.allowClick = false;
						}
						this.driver.moveNext();
					},
				},
			},
			{
				element: "#analytics",
				popover: {
					title: "Detailed Stats",
					description:
						"Explore detailed analytics about every player!.",
					side: "top",
					align: "center",
				},
			},
			{
				element: "#tab_top",
				popover: {
					title: "Back to Overview",
					description:
						"Click here to return to the player leaderboard.",
					side: "bottom",
					align: "center",
					onNextClick: () => {
						const btn = document.getElementById("tab_top");
						if (btn) {
							this.allowClick = true;
							btn.click();
							this.allowClick = false;
						}
						this.driver.moveNext();
					},
				},
			},
			{
				element: "#top_players_0",
				popover: {
					title: "Detailed Player View",
					description:
						"Click on a player to see more detailed stats about them.",
					side: "top",
					align: "center",
				},
			},
		];

		this.isTourActive = true;
		this.driver.setSteps(steps);
		this.driver.drive();

		localStorage.setItem("tour_graph", "true");
		this.seenTours.add("graph");
	}

	public runBetDisplayTour() {
		if (this.seenTours.has("bet_display")) return;

		if (!this.isElementVisible("#bet_display_container")) return;
		if (this.isTourActive) return;

		const steps = [
			{
				element: "#bet_display_container",
				popover: {
					title: "Step 3: Bet Overview",
					description:
						"Now that the bets are set, this element shows the number of bets made above or below the total tricks available in this round.",
					side: "bottom",
					align: "start",
				},
			},
		];

		this.isTourActive = true;
		this.driver.setSteps(steps);
		this.driver.drive();

		localStorage.setItem("tour_bet_display", "true");
		this.seenTours.add("bet_display");
	}
}
