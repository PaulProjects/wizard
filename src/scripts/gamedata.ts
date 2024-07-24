export class gamedata {
    /** The Current Dealer */
    private dealer: number;
    /** if the +- 1 Rule is active */
    private rule_1: boolean;
    /** if a random dealer should be picked at the start */
    private rule_random_dealer: boolean;
    /** if the expansion is active -> sum of tricks dont have to match sum of bets */
    private rule_expansion: boolean;
    /** if the number of rounds is set custom */
    private rule_custom_rounds: boolean;
    /** if crowdchaos is active -> No limit on the amount of players */
    private rule_crowdchaos: boolean;
    /** The current round */
    private round: number;
    /** The maximum number of rounds */
    private max_rounds: number;
    /** The player names, order is essential*/
    private players: string[];
    /** The bets of the players */
    private bets: number[][];
    /** The tricks of the players */
    private tricks: number[][];
    /** The scores of the players */
    private score: number[][];
    /** The change in score of the players */
    private score_change: number[][];
    /** The color of the rounds */
    private color: {};
    /** 1 enter bets | 2 enter tricks - deleted after game finished*/
    private step?: number;
    /** 1 score overview | 2 bets/tricks | 3 celebration view - deleted after game finished*/
    private display?: number;
    /** selected view of the score overview - deleted after game finished*/
    private score_display?: number;
    /** The time the game was started */
    private time_started: number;
    //optional
    /** The time the game was ended */
    private time_ended?: number;
    /** game id on the server*/
    private id?: string;

    constructor(dealer: number, rule_1: boolean, rule_random_dealer: boolean, rule_expansion: boolean, rule_custom_rounds: boolean, rule_crowdchaos: boolean, round: number, max_rounds: number, players: [], bets: number[][], tricks: number[][], score: number[][], score_change: number[][], color: {}, step: number, display: number, score_display: number, time_started: number, time_ended?: number, id?: string) {
        this.dealer = dealer;
        this.rule_1 = rule_1;
        this.rule_random_dealer = rule_random_dealer;
        this.rule_expansion = rule_expansion;
        this.rule_custom_rounds = rule_custom_rounds;
        this.rule_crowdchaos = rule_crowdchaos;
        this.round = round;
        this.max_rounds = max_rounds;
        this.players = players;
        this.bets = bets;
        this.tricks = tricks;
        this.score = score;
        this.score_change = score_change;
        this.color = color;
        this.step = step;
        this.display = display;
        this.score_display = score_display;
        this.time_started = time_started;

        if (typeof time_ended !== 'undefined' && typeof id !== 'undefined') {
            this.time_ended = time_ended;
            this.id = id;
        }
    }

    static load(): gamedata {
        let json = localStorage.getItem('gamedata');
        return gamedata.fromJSONstring(json);
    }

    static fromJSONstring(jsonstring: string): gamedata {
        let json;
        try {
            json = JSON.parse(jsonstring);
        }
        catch (e) {
            throw new Error('invalid json');
        }
        return this.fromJson(json);
    }

    //constructor taking json
    static fromJson(json): gamedata {
        //validate json
        if (typeof json.dealer !== 'number') {
            throw new Error('invalid dealer');
        }
        if (typeof json.rule_1 !== 'boolean') {
            throw new Error('invalid rule_1');
        }
        if (typeof json.rule_random_dealer !== 'boolean') {
            throw new Error('invalid rule_random_dealer');
        }
        if (typeof json.rule_expansion !== 'boolean') {
            throw new Error('invalid rule_expansion');
        }
        if (typeof json.rule_custom_rounds !== 'boolean') {
            throw new Error('invalid rule_custom_rounds');
        }
        if (typeof json.rule_crowdchaos !== 'boolean') {
            throw new Error('invalid rule_crowdchaos');
        }
        if (typeof json.round !== 'number') {
            throw new Error('invalid round');
        }
        if (typeof json.max_rounds !== 'number') {
            throw new Error('invalid max_rounds');
        }
        if (!Array.isArray(json.players)) {
            throw new Error('invalid players');
        }
        if (!Array.isArray(json.bets)) {
            throw new Error('invalid bets');
        }
        if (!Array.isArray(json.tricks)) {
            throw new Error('invalid tricks');
        }
        if (!Array.isArray(json.score)) {
            throw new Error('invalid score');
        }
        if (!Array.isArray(json.score_change)) {
            throw new Error('invalid score_change');
        }
        if (typeof json.color !== 'object') {
            throw new Error('invalid color');
        }
        if (typeof json.step !== 'number') {
            //legacy stuff
            if (typeof json.time_ended !== 'undefined') {
                json.step = 0;
            } else {
                throw new Error('invalid step');
            }
        }
        if (typeof json.display !== 'number') {
            if (typeof json.time_ended !== 'undefined') {
                json.display = 0;
            } else {
                throw new Error('invalid display');
            }
        }
        if (typeof json.score_display !== 'number') {
            if (typeof json.time_ended !== 'undefined') {
                json.score_display = 0;
            } else {
                throw new Error('invalid score_display');
            }
        }
        if (typeof json.time_started !== 'number') {
            throw new Error('invalid time_started');
        }

        if (typeof json.time_ended === 'undefined' && typeof json.id === 'undefined') {
            return new gamedata(json.dealer, json.rule_1, json.rule_random_dealer, json.rule_expansion, json.rule_custom_rounds, json.rule_crowdchaos, json.round, json.max_rounds, json.players, json.bets, json.tricks, json.score, json.score_change, json.color, json.step, json.display, json.score_display, json.time_started);
        }
        else {
            return new gamedata(json.dealer, json.rule_1, json.rule_random_dealer, json.rule_expansion, json.rule_custom_rounds, json.rule_crowdchaos, json.round, json.max_rounds, json.players, json.bets, json.tricks, json.score, json.score_change, json.color, json.step, json.display, json.score_display, json.time_started, json.time_ended, json.id);
        }
    }

    //return json
    static toJson(gamedata: gamedata): string {
        return JSON.stringify({
            dealer: gamedata.dealer,
            rule_1: gamedata.rule_1,
            rule_random_dealer: gamedata.rule_random_dealer,
            rule_expansion: gamedata.rule_expansion,
            rule_custom_rounds: gamedata.rule_custom_rounds,
            rule_crowdchaos: gamedata.rule_crowdchaos,
            round: gamedata.round,
            max_rounds: gamedata.max_rounds,
            players: gamedata.players,
            bets: gamedata.bets,
            tricks: gamedata.tricks,
            score: gamedata.score,
            score_change: gamedata.score_change,
            color: gamedata.color,
            step: gamedata.step,
            display: gamedata.display,
            score_display: gamedata.score_display,
            time_started: gamedata.time_started,
        });
    }

    public save(): void {
        let gamestring = gamedata.toJson(this);
        localStorage.setItem('game', gamestring);
    }

    //special getter / setter

    public removeColor(round): void {
        delete this.color[round];
    }

    public setColor(round, color): void {
        this.color[round] = color;
    }

    public setRoundBets(bets: number[]): void {
        this.bets[this.round - 1] = bets;
    }

    public setRoundTricks(tricks: number[]): void {
        this.tricks[this.round - 1] = tricks;
    }

    public addScore(score: number[]): void {
        this.score[this.round - 1] = score;
    }

    public setRoundScore(score: number[]): void {
        this.score[this.round - 1] = score;
    }

    public setRoundScoreChange(scoreChange: number[]): void {
        this.score_change[this.round - 1] = scoreChange;
    }

    public addScoreChange(scoreChange: number[]): void {
        this.score_change[this.round - 1] = scoreChange;
    }

    /** Adds 1 to the number of Rounds */
    public nextRound(): void {
        this.round++;
    }

    public renamePlayer(index: number, newName: string): void {
        this.players[index] = newName;
    }
    //Boilerplate

    // Getters
    public getDealer(): number {
        return this.dealer;
    }

    public getRule_1(): boolean {
        return this.rule_1;
    }

    public getRuleRandomDealer(): boolean {
        return this.rule_random_dealer;
    }

    public getRuleExpansion(): boolean {
        return this.rule_expansion;
    }

    public getRuleCustomRounds(): boolean {
        return this.rule_custom_rounds;
    }

    public getRuleCrowdchaos(): boolean {
        return this.rule_crowdchaos;
    }

    public getRound(): number {
        return this.round;
    }

    public getMaxRounds(): number {
        return this.max_rounds;
    }

    public getPlayers(): string[] {
        return this.players;
    }

    public getBets(): number[][] {
        return this.bets;
    }

    public getTricks(): number[][] {
        return this.tricks;
    }

    public getScore(): number[][] {
        return this.score;
    }

    public getScoreChange(): number[][] {
        return this.score_change;
    }

    public getColor(): {} {
        return this.color;
    }

    public getStep(): number {
        return this.step;
    }

    public getDisplay(): number {
        return this.display;
    }

    public getScoreDisplay(): number {
        return this.score_display;
    }

    public getTimeStarted(): number {
        return this.time_started;
    }

    public getTimeEnded(): number {
        return this.time_ended;
    }

    public hasID(): boolean {
        return typeof this.id === 'string';    
    }
    
    public getID(): string {
        return this.id;
    }

    // Setters
    public setDealer(dealer: number): void {
        this.dealer = dealer;
    }

    public setRule_1(rule_1: boolean): void {
        this.rule_1 = rule_1;
    }

    public setRuleRandomDealer(ruleRandomDealer: boolean): void {
        this.rule_random_dealer = ruleRandomDealer;
    }

    public setRuleExpansion(ruleExpansion: boolean): void {
        this.rule_expansion = ruleExpansion;
    }

    public setRuleCustomRounds(ruleCustomRounds: boolean): void {
        this.rule_custom_rounds = ruleCustomRounds;
    }

    public setRuleCrowdchaos(ruleCrowdchaos: boolean): void {
        this.rule_crowdchaos = ruleCrowdchaos;
    }

    public setRound(round: number): void {
        this.round = round;
    }

    public setMaxRounds(maxRounds: number): void {
        this.max_rounds = maxRounds;
    }

    public setPlayers(players: string[]): void {
        this.players = players;
    }

    public setBets(bets: number[][]): void {
        this.bets = bets;
    }

    public setTricks(tricks: number[][]): void {
        this.tricks = tricks;
    }

    public setScore(score: number[][]): void {
        this.score = score;
    }

    public setScoreChange(scoreChange: number[][]): void {
        this.score_change = scoreChange;
    }

    public setStep(step: number): void {
        this.step = step;
    }

    public setDisplay(display: number): void {
        this.display = display;
    }

    public setScoreDisplay(scoreDisplay: number): void {
        this.score_display = scoreDisplay;
    }

    public setTimeStarted(timeStarted: number): void {
        this.time_started = timeStarted;
    }

    public setTimeEnded(time_ended: number): void {
        this.time_ended = time_ended;
    }

    public setId(id: string): void {
        this.id = id;
    }
}