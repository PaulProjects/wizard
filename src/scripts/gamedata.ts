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
    /** if the altcount rule is active -> display the alternative counting system */
    private rule_altcount: boolean;
    /** The current round */
    private round: number;
    /** The maximum number of rounds */
    private max_rounds: number;
    /** The player names, order is essential*/
    private players: Array<string>;
    /** The bets of the players */
    private bets: number[][];
    /** The tricks of the players */
    private tricks: number[][];
    /** The scores of the players */
    private score: number[][];
    /** The change in score of the players */
    private score_change: number[][];
    /** The score of the players calculated with an alternative method */
    private alt_score: number[][];
    /** The change in alternative score of the players of the alternative method*/
    private alt_score_change: number[][];
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

    constructor(dealer: number, rule_1: boolean, rule_random_dealer: boolean, rule_expansion: boolean, rule_custom_rounds: boolean, rule_crowdchaos: boolean, rule_altcount: boolean, round: number, max_rounds: number, players: Array<string>, bets: number[][], tricks: number[][], score: number[][], score_change: number[][], alt_score: number[][], alt_score_change: number[][], color: {}, step: number, display: number, score_display: number, time_started: number, time_ended?: number, id?: string) {
        this.dealer = dealer;
        this.rule_1 = rule_1;
        this.rule_random_dealer = rule_random_dealer;
        this.rule_expansion = rule_expansion;
        this.rule_custom_rounds = rule_custom_rounds;
        this.rule_crowdchaos = rule_crowdchaos;
        this.rule_altcount = rule_altcount;
        this.round = round;
        this.max_rounds = max_rounds;
        this.players = players;
        this.bets = bets;
        this.tricks = tricks;
        this.score = score;
        this.score_change = score_change;
        this.alt_score = alt_score;
        this.alt_score_change = alt_score_change;
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
        if (typeof json.rule_altcount !== 'boolean') {
            //backwards compatibility
            console.log('invalid rule_altcount');
            json.rule_altcount = false;
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

        if (!Array.isArray(json.alt_score)) {
            //backwards compatibility
            console.log('invalid alt_score');
            json.alt_score = json.score;
        }

        if (!Array.isArray(json.alt_score_change)) {
            //backwards compatibility
            console.log('invalid alt_score_change');
            json.alt_score_change = json.score_change;
        }

        if (typeof json.color !== 'object') {
            throw new Error('invalid color');
        }
        if (typeof json.step !== 'number') {
            //backwards compatibility
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
            return new gamedata(json.dealer, json.rule_1, json.rule_random_dealer, json.rule_expansion, json.rule_custom_rounds, json.rule_crowdchaos, json.rule_altcount, json.round, json.max_rounds, json.players, json.bets, json.tricks, json.score, json.score_change, json.alt_score, json.alt_score_change, json.color, json.step, json.display, json.score_display, json.time_started);
        }
        else {
            return new gamedata(json.dealer, json.rule_1, json.rule_random_dealer, json.rule_expansion, json.rule_custom_rounds, json.rule_crowdchaos, json.rule_altcount, json.round, json.max_rounds, json.players, json.bets, json.tricks, json.score, json.score_change, json.alt_score, json.alt_score_change, json.color, json.step, json.display, json.score_display, json.time_started, json.time_ended, json.id);
        }
    }

    //return json
    static toJsonString(gamedata: gamedata): string {
        return JSON.stringify(this.toJsonObject(gamedata));
    }

    static toJsonStringEnd(gamedata: gamedata): string {
        let json = this.toJsonObject(gamedata);
        delete json.step;
        delete json.display;
        delete json.score_display;
        return JSON.stringify(json);
    }

    static toJsonObjectEnd(gamedata: gamedata): any {
        let json = this.toJsonObject(gamedata);
        delete json.step;
        delete json.display;
        delete json.score_display;
        return json;
    }

    static toJsonObject(gamedata: gamedata): any {
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
            players: gamedata.players,
            bets: gamedata.bets,
            tricks: gamedata.tricks,
            score: gamedata.score,
            score_change: gamedata.score_change,
            alt_score: gamedata.alt_score,
            alt_score_change: gamedata.alt_score_change,
            color: gamedata.color,
            step: gamedata.step,
            display: gamedata.display,
            score_display: gamedata.score_display,
            time_started: gamedata.time_started,
            time_ended: gamedata.time_ended,
            id: gamedata.id,
        }
    }

    static demo(view: number): gamedata {
        return new gamedata(
            2,
            true,
            false,
            false,
            false,
            false,
            false,
            8,
            12,
            ["Darth Maul", "Rey", "Han Solo", "Andor"],
            [[0, 0, 1, 0, 0], [1, 1, 0, 0, 1], [0, 1, 2, 0, 1], [0, 1, 0, 1, 1], [2, 0, 1, 0, 3], [0, 4, 1, 0, 2], [2, 1, 1, 0, 2]],
            [[0, 0, 1, 0, 0], [1, 0, 0, 0, 1], [0, 0, 2, 1, 0], [1, 1, 0, 1, 1], [0, 1, 1, 0, 3], [1, 4, 1, 0, 0], [2, 1, 1, 0, 3]],
            [[20, 20, 30, 20, 20], [50, 10, 50, 40, 50], [70, 0, 90, 30, 40], [60, 30, 110, 60, 70], [40, 20, 140, 80, 120], [30, 80, 170, 100, 100], [70, 110, 200, 120, 90]],
            [[20, 20, 30, 20, 20], [30, -10, 20, 20, 30], [20, -10, 40, -10, -10], [-10, 30, 20, 30, 30], [-20, -10, 30, 20, 50], [-10, 60, 30, 20, -20], [40, 30, 30, 20, -10]],
            [[20, 20, 30, 20, 20], [50, 10, 50, 40, 50], [70, 0, 90, 30, 40], [60, 30, 110, 60, 70], [40, 20, 140, 80, 120], [30, 80, 170, 100, 100], [70, 110, 200, 120, 90]],
            [[20, 20, 30, 20, 20], [30, -10, 20, 20, 30], [20, -10, 40, -10, -10], [-10, 30, 20, 30, 30], [-20, -10, 30, 20, 50], [-10, 60, 30, 20, -20], [40, 30, 30, 20, -10]],
            {},
            1,
            1,
            view,
            1722771652130
        ) //ToDo: fix altscores
    }

    public save(): void {
        let gamestring = gamedata.toJsonString(this);
        localStorage.setItem('game', gamestring);
    }

    //special getter / setter

    public removeColor(round: number): void {
        delete this.color[round];
    }

    public setColor(round: number, color: string): void {
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

    public addAltScore(altScore: number[]): void {
        this.alt_score[this.round - 1] = altScore;
    }

    public setRoundAltScore(altScore: number[]): void {
        this.alt_score[this.round - 1] = altScore;
    }

    public setRoundAltScoreChange(altScoreChange: number[]): void {
        this.alt_score_change[this.round - 1] = altScoreChange;
    }

    public addAltScoreChange(altScoreChange: number[]): void {
        this.alt_score_change[this.round - 1] = altScoreChange;
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

    public getRuleAltcount(): boolean {
        return this.rule_altcount;
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

    public getAltScore(): number[][] {
        return this.alt_score;
    }

    public getAltScoreChange(): number[][] {
        return this.alt_score_change;
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

    public setRuleAltcount(ruleAltcount: boolean): void {
        this.rule_altcount = ruleAltcount;
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

    public setAltScore(altScore: number[][]): void {
        this.alt_score = altScore;
    }

    public setAltScoreChange(altScoreChange: number[][]): void {
        this.alt_score_change = altScoreChange;
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
