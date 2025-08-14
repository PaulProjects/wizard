/**
 * Game Controller - Main game logic
 * Coordinates between modules and manages game state
 */

import type { DemoConfig, SaveGameResponse } from './types.js';
import { GameStep, GameDisplay, ScoreView, RoundColor } from './types.js';
import { GameData } from './gamedata.js';
import { UIStateManager } from './ui-state-manager.js';
import { InputHandler } from './input-handler.js';
import { ColorManager } from './color-manager.js';
import { scoreCalculator } from './score-calculator.js';
import { updatescore, score_switch_view } from '../score.js';

export class GameController {
  private game: GameData;
  private uiManager: UIStateManager;
  private inputHandler: InputHandler;
  private colorManager: ColorManager;
  private players: string[];
  private isDemoMode: boolean;

  constructor() {
    // Initialize the game
    this.isDemoMode = this.checkDemoMode();
    this.game = this.initializeGame();
    this.players = this.game.getPlayers();
    
    // Initialize managers
    this.uiManager = new UIStateManager();
    this.inputHandler = new InputHandler(this.game as any, this.players);
    this.colorManager = new ColorManager(this.game as any, this.isDemoMode);

    // Setup callbacks
    this.setupCallbacks();
    
    this.setupGlobalAccess();
    
    // Initialize event listeners
    this.initializeEventListeners();
    
    // Initial update
    this.update();
  }

  private checkDemoMode(): boolean {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has("demo");
  }

  private initializeGame(): GameData {
    if (this.isDemoMode) {
      const urlParams = new URLSearchParams(window.location.search);
      let view = ScoreView.TOP_PLAYERS; // Default view
      if (urlParams.has("view")) {
        const viewParam = parseInt(urlParams.get("view") || "3");
        view = viewParam as ScoreView;
      }

      const demoGame = GameData.demo(view);
      
      // Hide/show demo-specific elements
      this.uiManager.hideElement("endgame");
      this.uiManager.setElementText("savequit", "Exit Demo Mode");
      
      return demoGame;
    } else {
      // Check if game exists in localStorage
      if (!localStorage.getItem("game")) {
        window.location.href = "/";
        throw new Error("No game found");
      }

      try {
        return GameData.load();
      } catch (error) {
        console.error("Error loading game:", error);
        window.location.href = "/";
        throw error;
      }
    }
  }

  private setupCallbacks(): void {
    // Input handler callbacks
    this.inputHandler.setOnTotalUpdate((total: number, isValid: boolean) => {
      this.handleTotalUpdate(total, isValid);
    });

    this.inputHandler.setOnInputChange((playerIndex: number, value: number) => {
      // Update any real-time displays if needed
    });

    // Color manager callbacks
    this.colorManager.setOnColorChange((round: number, color: RoundColor | null) => {
      this.handleColorChange(round, color);
    });
  }

  private setupGlobalAccess(): void {
    (globalThis as any).game = this.game;
    this.uiManager.setEditMode(false);
  }

  private initializeEventListeners(): void {
    this.setupNavigationListeners();
    this.setupGameActionListeners();
    this.setupRuleListeners();
    this.setupModalListeners();
  }

  private setupNavigationListeners(): void {
    // Main navigation button
    const navButton = document.getElementById('nav_button');
    if (navButton) {
      navButton.addEventListener('click', () => {
        this.handleNavigationClick();
      });
    }

    // Chart navigation
    const chartNav = document.getElementById('chart_nav');
    if (chartNav) {
      chartNav.addEventListener('click', () => {
        this.handleChartNavClick();
      });
    }
  }

  private setupGameActionListeners(): void {
    // Continue game after celebration
    const continueButton = document.getElementById('continuegame');
    if (continueButton) {
      continueButton.addEventListener('click', () => {
        this.handleContinueGame();
      });
    }

    // End game
    const endGameButton = document.getElementById('endgame');
    if (endGameButton) {
      endGameButton.addEventListener('click', () => {
        this.uiManager.closeModal('modal_settings');
        this.uiManager.showModal('modal_confirmend');
      });
    }

    // Confirm end game
    const confirmEndButton = document.getElementById('rendgame');
    if (confirmEndButton) {
      confirmEndButton.addEventListener('click', () => {
        this.handleEndGame();
      });
    }

    // Edit dealer
    const editDealerButton = document.getElementById('editdealer');
    if (editDealerButton) {
      editDealerButton.addEventListener('click', () => {
        this.handleEditDealer();
      });
    }

    // Save dealer selection
    const saveDealerButton = document.getElementById('select_dealer_save');
    if (saveDealerButton) {
      saveDealerButton.addEventListener('click', () => {
        this.handleSaveDealer();
      });
    }
  }

  private setupRuleListeners(): void {
    // Rule 1 checkbox
    this.setupRuleCheckbox('rule_1', 'box_1Rule', (checked: boolean) => {
      this.game.setRule_1(checked);
      this.saveGame();
      this.updateInputValidation();
    });

    // Alternative counting radio buttons
    this.setupRuleRadio('calc_classic', 'calc_classic_box', () => {
      this.game.setRuleAltcount(false);
      this.saveGame();
      updatescore(this.players, this.game as any);
    });

    this.setupRuleRadio('calc_alt', 'calc_alt_box', () => {
      this.game.setRuleAltcount(true);
      this.saveGame();
      updatescore(this.players, this.game as any);
    });

    // Initialize rule states
    this.initializeRuleStates();
  }

  private setupRuleCheckbox(checkboxId: string, containerId: string, callback: (checked: boolean) => void): void {
    const container = document.getElementById(containerId);
    const checkbox = document.getElementById(checkboxId) as HTMLInputElement;

    if (container && checkbox) {
      container.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).id !== checkboxId) {
          checkbox.click();
        }
      });

      checkbox.addEventListener('click', () => {
        callback(checkbox.checked);
      });
    }
  }

  private setupRuleRadio(radioId: string, containerId: string, callback: () => void): void {
    const container = document.getElementById(containerId);
    const radio = document.getElementById(radioId) as HTMLInputElement;

    if (container && radio) {
      container.addEventListener('click', (event) => {
        if ((event.target as HTMLElement).id !== radioId) {
          radio.click();
        }
      });

      radio.addEventListener('click', callback);
    }
  }

  private initializeRuleStates(): void {
    // Set rule 1 checkbox
    const rule1Checkbox = document.getElementById('rule_1') as HTMLInputElement;
    if (rule1Checkbox) {
      rule1Checkbox.checked = this.game.getRule_1();
    }

    // Set counting method radio buttons
    const classicRadio = document.getElementById('calc_classic') as HTMLInputElement;
    const altRadio = document.getElementById('calc_alt') as HTMLInputElement;
    
    if (this.game.getRuleAltcount()) {
      if (altRadio) altRadio.checked = true;
    } else {
      if (classicRadio) classicRadio.checked = true;
    }
  }

  private setupModalListeners(): void {
    // Setup option box click handlers
    const optionBoxes = document.querySelectorAll('.optionbox');
    optionBoxes.forEach(box => {
      box.addEventListener('click', (event) => {
        const target = event.target as HTMLElement;
        if (target.tagName.toLowerCase() !== 'input') {
          const checkbox = box.querySelector('input[type="checkbox"]') as HTMLInputElement;
          if (checkbox) {
            checkbox.click();
          }
        }
      });
    });
  }

  // Event handlers
  private handleNavigationClick(): void {
    this.uiManager.freezeNavigationButton();
    
    if (this.uiManager.isEditMode()) {
      location.reload();
      return;
    }

    const step = this.game.getStep();
    const display = this.game.getDisplay();

    if (step === GameStep.CELEBRATION) {
      this.finishGame();
    } else if (display === GameDisplay.SCORE_OVERVIEW) {
      this.game.setDisplay(GameDisplay.INPUT);
      this.saveGame();
      this.update();
    } else {
      this.confirmInput();
    }
  }

  private handleChartNavClick(): void {
    this.uiManager.updateNavigationStyle(true);
    this.uiManager.setInputBlocked(true);
    this.uiManager.freezeNavigationButton();
    
    if (this.game.getDisplay() === GameDisplay.INPUT) {
      this.game.setDisplay(GameDisplay.SCORE_OVERVIEW);
      this.saveGame();
      this.update();
    }
  }

  private handleTotalUpdate(total: number, isValid: boolean): void {
    this.uiManager.setValidInput(isValid);
    
    const step = this.game.getStep();
    const currentRound = this.game.getRound();
    
    if (step === GameStep.PLACE_BETS) {
      this.uiManager.setElementText('total', `Total: ${total}`);
    } else {
      this.uiManager.setElementText('total', `Total: ${total}/${currentRound}`);
    }
  }

  private handleColorChange(round: number, color: RoundColor | null): void {
    this.updateRoundInfo();
    updatescore(this.players, this.game as any);
  }

  private handleContinueGame(): void {
    if (this.game.getRound() >= this.game.getMaxRounds()) {
      this.game.setMaxRounds(Number.MAX_SAFE_INTEGER); // Infinite rounds
    }

    this.uiManager.showElement('endgame');
    this.uiManager.showElement('savequit');
    this.uiManager.hideElement('continuegame');
    this.uiManager.showElement('rules');

    this.game.setStep(GameStep.PLACE_BETS);
    this.game.setDisplay(GameDisplay.SCORE_OVERVIEW);
    score_switch_view(ScoreView.CHART);
    this.saveGame();
    this.update();
  }

  private handleEndGame(): void {
    if (this.game.getRound() === 1) {
      localStorage.removeItem("game");
      location.href = "/";
    } else {
      this.game.setStep(GameStep.CELEBRATION);
      this.game.setDisplay(GameDisplay.SCORE_OVERVIEW);
      this.uiManager.updateNavigationStyle(true);
      this.saveGame();
      this.update();
    }
  }

  private handleEditDealer(): void {
    const selectDealer = document.getElementById('select_dealer') as HTMLSelectElement;
    if (selectDealer) {
      selectDealer.innerHTML = '';
      
      this.players.forEach((player, index) => {
        const option = document.createElement('option');
        option.value = index.toString();
        option.textContent = player;
        selectDealer.appendChild(option);
      });
      
      selectDealer.value = this.game.getDealer().toString();
      this.uiManager.showModal('modal_dealer');
    }
  }

  private handleSaveDealer(): void {
    const selectDealer = document.getElementById('select_dealer') as HTMLSelectElement;
    if (selectDealer) {
      const dealerIndex = parseInt(selectDealer.value);
      this.game.setDealer(dealerIndex);
      this.saveGame();
      location.reload();
    }
  }

  // Core game logic
  private confirmInput(): void {
    if (!this.inputHandler.confirmInput()) {
      // Show appropriate error modal
      const step = this.game.getStep();
      const modalId = step === GameStep.PLACE_BETS ? 'alert_1' : 'alert_2';
      this.uiManager.showModal(modalId);
      return;
    }

    const scores = this.inputHandler.getScores();
    const step = this.game.getStep();

    if (step === GameStep.PLACE_BETS) {
      this.processBets(scores);
    } else {
      this.processTricks(scores);
    }

    this.game.setDisplay(GameDisplay.SCORE_OVERVIEW);
    this.saveGame();
    this.update();
  }

  private processBets(bets: number[]): void {
    this.game.setRoundBets(bets);
    this.game.setStep(GameStep.ENTER_TRICKS);
    this.saveGame();
  }

  private processTricks(tricks: number[]): void {
    this.game.setRoundTricks(tricks);
    
    // Calculate scores
    const currentRound = this.game.getRound();
    const bets = this.game.getBets()[currentRound - 1];
    const previousClassicScores = currentRound > 1 ? this.game.getScore()[currentRound - 2] : undefined;
    const previousAltScores = currentRound > 1 ? this.game.getAltScore()[currentRound - 2] : undefined;

    const scoreCalculation = scoreCalculator.round(
      bets,
      tricks,
      currentRound,
      previousClassicScores,
      previousAltScores
    );

    // Update game with calculated scores
    this.game.addScore(scoreCalculation.playerScores);
    this.game.addScoreChange(scoreCalculation.scoreChanges);
    this.game.addAltScore(scoreCalculation.altPlayerScores);
    this.game.addAltScoreChange(scoreCalculation.altScoreChanges);

    this.saveGame();

    // Check if game should end or continue
    if (this.game.getRound() >= this.game.getMaxRounds()) {
      this.game.setStep(GameStep.CELEBRATION);
    } else {
      // Advance to next round
      this.game.nextRound();
      this.game.setDealer((this.game.getDealer() + 1) % this.players.length);
      this.game.setStep(GameStep.PLACE_BETS);
      this.saveGame();
    }
  }

  private async finishGame(): Promise<void> {
    this.uiManager.setNavigationText("Saving...");
    this.game.setTimeEnded(Date.now());
    this.saveGame();

    try {
      const response = await this.saveGameToServer();
      if (response.success && response.gameId) {
        this.game.setId(response.gameId);
        console.log("Game saved successfully:", response.gameId);
      }
    } catch (error) {
      console.error("Error saving game to server:", error);
    } finally {
      this.saveToRecentGames();
      localStorage.removeItem("game");
      location.href = "/";
    }
  }

  private async saveGameToServer(): Promise<SaveGameResponse> {
    return new Promise((resolve, reject) => {
      const gameData = GameData.toJsonString(this.game);
      
      // Using jQuery for compatibility (can be replaced with fetch later)
      ($ as any).post(
        "https://s.paulbertram.de/wizardshare.php",
        { game: gameData },
        (data: string) => {
          resolve({ success: true, gameId: data });
        }
      ).fail((jqXHR: any, textStatus: string, errorThrown: string) => {
        reject(new Error(`Server error: ${textStatus} - ${errorThrown}`));
      });
    });
  }

  private saveToRecentGames(): void {
    let recentGames = JSON.parse(localStorage.getItem("recent_games") || "[]");
    const gameEnd = GameData.toJsonObject(this.game);
    recentGames.push(gameEnd);
    localStorage.setItem("recent_games", JSON.stringify(recentGames));
  }

  // UI update methods
  public update(): void {
    const display = this.game.getDisplay();
    
    if (display === GameDisplay.SCORE_OVERVIEW) {
      this.updateScoreView();
    } else if (display === GameDisplay.INPUT) {
      this.updateInputView();
    }
  }

  private updateScoreView(): void {
    this.uiManager.showScoreView();
    this.updateRoundInfo();
    
    // Add round header to names table
    const namesElement = document.getElementById('names');
    if (namesElement && !namesElement.querySelector('th:last-child')?.textContent?.includes('Round')) {
      const roundHeader = document.createElement('th');
      roundHeader.textContent = 'Round';
      namesElement.appendChild(roundHeader);
    }

    const step = this.game.getStep();
    this.uiManager.updateUIForStep(step!);

    if (step === GameStep.ENTER_TRICKS) {
      this.updateBetDisplay();
    }

    if (step === GameStep.CELEBRATION) {
      score_switch_view(ScoreView.CELEBRATION);
    } else {
      score_switch_view(this.game.getScoreDisplay() || ScoreView.CHART);
    }

    updatescore(this.players, this.game as any);
  }

  private updateInputView(): void {
    this.uiManager.showInputView();
    this.updateRoundHeader();
    this.inputHandler.updateInputView();
  }

  private updateRoundInfo(): void {
    const currentRound = this.game.getRound();
    const maxRounds = this.game.getMaxRounds();
    const colors = this.game.getColor();
    
    this.uiManager.updateRoundInfo(currentRound, maxRounds, colors);
  }

  private updateRoundHeader(): void {
    const currentRound = this.game.getRound();
    const maxRounds = this.game.getMaxRounds();
    const step = this.game.getStep()!;
    
    this.uiManager.updateRoundHeader(currentRound, maxRounds, step);
  }

  private updateBetDisplay(): void {
    const bets = this.game.getBets();
    const currentRound = this.game.getRound();
    
    if (bets.length > 0 && bets[currentRound - 1]) {
      const totalBets = bets[currentRound - 1].reduce((sum, bet) => sum + bet, 0);
      this.uiManager.updateBetDisplay(totalBets, currentRound);
    }
  }

  private updateInputValidation(): void {
    if (this.game.getDisplay() === GameDisplay.INPUT) {
      // Retrigger validation
      const total = this.inputHandler.getCurrentTotal();
      const validation = this.inputHandler.validateInput();
      this.handleTotalUpdate(total, validation.isValid);
    }
  }

  // Utility methods
  private saveGame(): void {
    if (!this.isDemoMode) {
      this.game.save();
    }
  }

  public getGame(): GameData {
    return this.game;
  }

  public getUIManager(): UIStateManager {
    return this.uiManager;
  }

  public getInputHandler(): InputHandler {
    return this.inputHandler;
  }

  public getColorManager(): ColorManager {
    return this.colorManager;
  }
}

// Initialize the game controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  try {
    const gameController = new GameController();
    
    (globalThis as any).gameController = gameController;
  } catch (error) {
    console.error('Failed to initialize game controller:', error);
    // Fallback to redirect if initialization fails
    if (!window.location.href.includes('demo')) {
      window.location.href = '/';
    }
  }
});
