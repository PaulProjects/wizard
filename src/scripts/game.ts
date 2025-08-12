import { updatescore, score_switch_view } from "../scripts/score.ts";
import { gamedata } from "../scripts/gamedata.ts";

declare var editmode: boolean;

let game: gamedata;

//check url params for demo mode and view instructions
const urlParams = new URLSearchParams(window.location.search);
const demomode = urlParams.has("demo");
if (demomode) {
	let view = 3; // Default to top_players view (table view removed)
	if (urlParams.has("view")) {
		view = parseInt(urlParams.get("view"));
	}

	game = gamedata.demo(view);

	$("#endgame").hide();
	$("#savequit").text("Exit Demo Mode");
} else {
	//if game is null then redirect to startpage
	if (localStorage.getItem("game") == null) {
		window.location.href = "/";
	}

	//get the game from localstorage
	try {
		game = gamedata.fromJSONstring(localStorage.getItem("game"));
	} catch (error) {
		console.error(error);
		window.location.href = "/";
	}
}

//get the players
const players = game.getPlayers();

// Make game object globally accessible for tab handlers
(globalThis as any).game = game;

globalThis.editmode = false;

let input_block_reload = false;

function navblue() {
	$("#chart_nav").removeClass("btn-primary").addClass("btn-secondary");
	$("#nav_button").removeClass("btn-primary").addClass("btn-secondary");
	$("#chart_nav_right").removeClass("btn-primary").addClass("btn-secondary");
}

function navred() {
	$("#chart_nav").removeClass("btn-secondary").addClass("btn-primary");
	$("#nav_button").removeClass("btn-secondary").addClass("btn-primary");
	$("#chart_nav_right").removeClass("btn-secondary").addClass("btn-primary");
}

//listen for click on all divs with the class optionbox
$(".optionbox").on("click", function () {
	//check if the user clicked on the checkbox itself
	if ($(event.target).is("input[type='checkbox']")) {
		return;
	}
	//get the checkbox inside the div
	var checkbox = $(this).find("input[type='checkbox']");
	//trigger a click on the checkbox
	checkbox.trigger("click");
});

function showgraphicon() {
	$("#chart_nav_icon").removeClass("hidden");
	$("#nav_button").addClass("join-item");
	$(".nav_graph").removeClass("hidden");
}

function hidegraphicon() {
	$("#chart_nav_icon").addClass("hidden");
	$("#nav_button").removeClass("join-item");
	$(".nav_graph").addClass("hidden");
}

let s_round = document.getElementById("s_round");

function roundinfo() {
	if (game.getMaxRounds() == Number.MAX_SAFE_INTEGER) {
		s_round.textContent = `${game.getRound()}/∞`;
	} else {
		s_round.textContent = `${game.getRound()}/${game.getMaxRounds()}`;
	}
	s_round.className = "";
	s_round.classList.add("text-4xl");
	s_round.classList.add("h-full");
	if (game.getColor()[game.getRound()] != null) {
		s_round.classList.add(game.getColor()[game.getRound()] + "_tag");
	}
}

$("#s_round").on("click", () => {
	(document.getElementById("modal_color") as HTMLDialogElement).showModal();
});

//color picker modal
$("#color_blue").on("click", () => {
	game.setColor(game.getRound(), "blue");
	if (!demomode) game.save();
	roundinfo();
	updatescore(players, game);
});
$("#color_red").on("click", () => {
	game.setColor(game.getRound(), "red");
	if (!demomode) game.save();
	roundinfo();
	updatescore(players, game);
});
$("#color_green").on("click", () => {
	game.setColor(game.getRound(), "green");
	if (!demomode) game.save();
	roundinfo();
	updatescore(players, game);
});

$("#color_yellow").on("click", () => {
	game.setColor(game.getRound(), "yellow");
	if (!demomode) game.save();
	roundinfo();
	updatescore(players, game);
});
$("#color_none").on("click", () => {
	game.removeColor(game.getRound());
	//game.setColor(game.getRound(), null);
	if (!demomode) game.save();
	roundinfo();
	updatescore(players, game);
});

let random_i = 0;
$("#color_random").on("click", () => {
	let colors = ["blue", "red", "green", "yellow"];
	let random_color = colors[Math.floor(Math.random() * colors.length)];

	//show modal
	$("#slot_text").text("");
	$("#random_close_button").addClass("btn-disabled");
	(
		document.getElementById("modal_randomcolor") as HTMLDialogElement
	).showModal();
	//interval to change the color
	let interval = setInterval(() => {
		random_i++;
		if (random_i >= colors.length) {
			random_i = 0;
		}
		$("#random_text_container").css("background-color", colors[random_i]);
	}, 150);
	//timeout to select the color
	setTimeout(() => {
		clearInterval(interval);
		$("#random_text_container").css("background-color", random_color);
		game.setColor(game.getRound(), random_color);
		$("#slot_text").text(random_color.toUpperCase());
		if (random_color == "yellow") {
			$("#slot_text").css("color", "black");
		} else {
			$("#slot_text").css("color", "white");
		}

		if (!demomode) game.save();
		roundinfo();
		$("#random_close_button").removeClass("btn-disabled");
		updatescore(players, game);
	}, 2000);
});

function update() {
	if (game.getDisplay() == 1) {
		//hide input and show score
		document.getElementById("input").classList.add("hidden");
		document.getElementById("score").classList.remove("hidden");
		hidegraphicon();

		roundinfo();

		$("#names").append("<th>Round</th>");

		if (game.getStep() == 1) {
			$("#navtext").text("Place Bets");
			document
				.getElementById("bet_display_container")
				.classList.add("hidden");
		} else if (game.getStep() == 2) {
			$("#navtext").text("Enter Tricks");
			document
				.getElementById("bet_display_container")
				.classList.remove("hidden");

			let total_bet = game
				.getBets()
				[game.getBets().length - 1].reduce((a, b) => a + b, 0);
			let currentRound = game.getRound();

			if (total_bet > currentRound) {
				// Too many bets - show "above" indicator
				document
					.getElementById("bet_above")
					?.classList.remove("hidden");
				document.getElementById("bet_below")?.classList.add("hidden");
				document.getElementById("bet_above_text").textContent = (
					total_bet - currentRound
				).toString();
			} else if (total_bet < currentRound) {
				// Too few bets - show "below" indicator
				document.getElementById("bet_above")?.classList.add("hidden");
				document
					.getElementById("bet_below")
					?.classList.remove("hidden");
				document.getElementById("bet_below_text").textContent = (
					currentRound - total_bet
				).toString();
			} else {
				// Perfect bet total - hide both indicators
				document.getElementById("bet_above")?.classList.add("hidden");
				document.getElementById("bet_below")?.classList.add("hidden");
			}
		}

		if (game.getStep() == 3) {
			navblue();
			score_switch_view(4);
			$("#tab_celeb").css("display", "");
			$("#endgame").addClass("hidden");
			$("#savequit").addClass("hidden");
			$("#continuegame").removeClass("hidden");
			$("#rules").addClass("hidden");
		} else {
			score_switch_view(game.getScoreDisplay());
			$("#tab_celeb").css("display", "none");
		}

		updatescore(players, game);
	} else if (game.getDisplay() == 2) {
		//add class="hidden" to score and remove it from input
		document.getElementById("score").classList.add("hidden");
		document.getElementById("input").classList.remove("hidden");
		document
			.getElementById("bet_display_container")
			.classList.add("hidden");
		showgraphicon();
		updateInput();
	}
}
//add a listener to the nav_button
$("#nav_button").on("click", () => {
	freezebutton();
	if (globalThis.editmode == true) {
		//reload page
		location.reload();
	} else if (game.getStep() == 3) {
		finish_game();
	} else if (game.getDisplay() == 1) {
		game.setDisplay(2);
		if (!demomode) game.save();
		update();
	} else {
		Input_confirm();
	}
});

$("#chart_nav").on("click", () => {
	navblue();
	input_block_reload = true;
	freezebutton();
	if (game.getDisplay() == 2) {
		game.setDisplay(1);
		if (!demomode) game.save();
		update();
	}
});

function finish_game() {
	//saving thing:
	$("#navtext").text("Saving...");
	//put a time_ended timestamp
	game.setTimeEnded(Date.now());
	game.save();

	$.post(
		"https://s.paulbertram.de/wizardshare.php",
		{ game: gamedata.toJsonStringEnd(game) },
		function (data) {
			//add id info to the game
			game.setId(data);
			console.log("Success: " + data);
		}
	)
		.fail(function (jqXHR, textStatus, errorThrown) {
			// Fehlerbehandlung hier
			console.error("Error: " + textStatus, errorThrown);
		})
		.always(function () {
			// Wird immer ausgeführt
			let recent_games = JSON.parse(localStorage.getItem("recent_games"));
			if (recent_games === null) {
				recent_games = [];
			}
			recent_games.push(gamedata.toJsonObjectEnd(game));
			//delete game from localstorage
			localStorage.removeItem("game");
			//set recent_games in localstorage
			localStorage.setItem("recent_games", JSON.stringify(recent_games));
			location.href = "/";
		});
}

function freezebutton() {
	//disable nav_button for 1.5 seconds
	$("#nav_button").addClass("btn-disabled");
	$(".nav_graph").addClass("btn-disabled");
	setTimeout(function () {
		$("#nav_button").removeClass("btn-disabled");
		$(".nav_graph").removeClass("btn-disabled");
	}, 500);
}

//Switch to graph

function switch_view(view: number) {
	score_switch_view(view);
	game.setScoreDisplay(view);
	game.save();
}

// Tab switching is now handled in score.ts

//Input
let valid = true;

//an array to store the scores
let scores: number[] = [];

//helper methods
function updatetotal() {
	if (game.getStep() == 1) {
		let total = scores.reduce((a, b) => +a + +b, 0);
		$("#total").text(`Total: ${total}`);
		if (game.getRound() !== 1 && game.getRule_1() == true) {
			if (total === game.getRound()) {
				valid = false;
				navred();
			} else {
				valid = true;
				navblue();
			}
			let insets = document.querySelectorAll(
				"#input_insets_" + last_player_index + " span"
			);

			let last_player_range = $(
				"#input_range_" + last_player_index
			).val() as string;
			let adjusted_total = total - parseInt(last_player_range);
			insets.forEach((inset) => {
				let number = parseInt(inset.textContent);
				if (number + adjusted_total == game.getRound()) {
					inset.classList.add("range_number_impossible");
				} else {
					inset.classList.remove("range_number_impossible");
				}
			});
		} else {
			valid = true;
			navblue();
		}
	} else {
		$("#total").text(
			`Total: ${scores.reduce((a, b) => +a + +b, 0)}/${game.getRound()}`
		);
		if (scores.reduce((a, b) => +a + +b, 0) === game.getRound()) {
			valid = true;
			navblue();
		} else {
			if (game.getRuleExpansion() == false) {
				valid = false;
				navred();
			}
		}
	}
}

function scorecalc(bet: number, trick: number) {
	if (bet == trick) {
		return 20 + bet * 10;
	} else {
		return Math.abs(bet - trick) * -10;
	}
}

/* https://de.wikipedia.org/wiki/Wizard_(Spiel)
  Für die richtige Prognose erhält der Spieler 10 Bonuspunkte pro ausgeteilte Karte, also in der ersten Runde zehn Punkte, in der zweiten zwanzig usw. bis hin zu hundert Punkten in der zehnten Runde usw. 10 Punkte gibt es nur für jeden angesagten Stich. Für jede Abweichung gibt es sukzessive zehn Strafpunkte mehr, also für die erste Abweichung 10 Punkte, die zweite 20 (also insgesamt 30), die dritte 30 (also 10 + 20 + 30 = 60 Minuspunkte) usw. – Beispiele für Runde 8:
  3 Stiche prognostiziert und diese auch bekommen: 3·10 + 8⋅10 = 110 Punkte.
  2 Stiche prognostiziert, aber 3 bekommen: 2·10 − 1⋅10 = 10 Punkte.
  4 Stiche prognostiziert, aber 2 bekommen: 2·10 − (10 + 20) = −10 Punkte.
*/
function altscorecalc(bet: number, trick: number, round: number) {
	if (bet === trick) {
		// trick points + 10 points per card in the round
		return bet * 10 + round * 10;
	} else {
		// Wrong prediction: trick points minus penalty
		const deviation = Math.abs(bet - trick);
		return bet * 10 - 10 * ((deviation * (deviation + 1)) / 2);
	}
}

let last_player_index = 0;

function addplayertoInput(index: number, max: number) {
	last_player_index = index;

	let player = players[index];

	// Create the card structure safely
	const card = $(`<div class="card w-full lg:w-2/3 bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title text-2xl"></h2>
                <input type="range" min="0" max="${max}" value="0" class="range" step="1" aria-label="Input" id="input_range_${index}"/>
                <div class="w-full flex justify-between text-xl range-lg insets pl-1 pr-1" id="input_insets_${index}">
                </div>
            </div>
        </div>
    </div>`);

	// Safely set the player name
	card.find(".card-title").text(player);

	$("#players").append(card);

	$(`#input_range_${index}`).on("input", function () {
		scores[index] = parseInt($(this).val() as string);
		//update the total
		updatetotal();
		//underline the inset that matches the value
		$(`#input_insets_${index} span`).removeClass("underline");
		$(`#input_insets_${index} span:eq(${scores[index]})`).addClass(
			"underline"
		);
	});

	//add insets as max
	for (let i = 0; i <= max; i++) {
		if (game.getStep() == 2) {
			//if i is equal to the bet hightlight it
			if (i == game.getBets()[game.getRound() - 1][index]) {
				$(`#input_insets_${index}`).append(
					`<span class="range_number_highlighted">${i}</span>`
				);
			} else {
				$(`#input_insets_${index}`).append(
					`<span class="range_number">${i}</span>`
				);
			}
		} else {
			$(`#input_insets_${index}`).append(
				`<span class="range_number">${i}</span>`
			);
		}
	}

	//if the round is over 10 then make the font smaller
	if (max > 10) {
		$(".range_number").addClass("range_number_small_font");
		$(".range_number_highlighted").addClass("range_number_small_font");
	}

	//add listener to the insets to update the range setting it to the value
	$(`#input_insets_${index} span`).on("click", function () {
		$(`#input_range_${index}`).val($(this).html());
		scores[index] = parseInt($(this).html());
		//update the total
		updatetotal();
		//underline the inset that matches the value
		$(`#input_insets_${index} span`).removeClass("underline");
		$(`#input_insets_${index} span:eq(${scores[index]})`).addClass(
			"underline"
		);
	});
}

function updateInput() {
	$("#navtext").text("Confirm");
	if (input_block_reload) {
		input_block_reload = false;
		updatetotal();
		return;
	}
	$("#players").empty();

	if (game.getStep() == 1) {
		document.getElementById("round").textContent =
			`${game.getRound()}/${game.getMaxRounds()} - Place Bets`;
	} else {
		document.getElementById("round").textContent =
			`${game.getRound()}/${game.getMaxRounds()} - Enter Tricks`;
	}

	const max = game.getRound();

	//clear scores
	scores = [];
	//fill it with 0 for each player
	for (let index = 0; index < players.length; index++) {
		scores[index] = 0;
	}

	//loop through players from the dealer to the end
	for (let i = game.getDealer() + 1; i < players.length; i++) {
		addplayertoInput(i, max);
	}

	// loop through players from the start to the dealer
	for (let i = 0; i <= game.getDealer(); i++) {
		addplayertoInput(i, max);
	}
	updatetotal();
}

//add event listener to confirm button
function Input_confirm() {
	if (valid) {
		if (game.getStep() == 1) {
			game.setRoundBets(scores);
			game.setStep(2);
			if (!demomode) game.save();
		} else {
			let tricks = game.getTricks();
			if (tricks === null) {
				tricks = [];
			}

			//push the scores array to the tricks
			game.setRoundTricks(scores);
			if (!demomode) game.save();

			//calculate the scores
			let score = game.getScore();
			let ps: number[] = [];
			let psc: number[] = [];

			let alt_score = game.getAltScore();
			let alt_ps: number[] = [];
			let alt_psc: number[] = [];

			const round = game.getRound();

			if (game.getRound() === 1) {
				score = [];

				alt_score = [];
			}
			for (let index = 0; index < players.length; index++) {
				psc[index] = scorecalc(
					game.getBets()[round - 1][index],
					game.getTricks()[round - 1][index]
				);

				alt_psc[index] = altscorecalc(
					game.getBets()[round - 1][index],
					game.getTricks()[round - 1][index],
					round
				);

				if (round === 1) {
					ps[index] = psc[index];
					alt_ps[index] = alt_psc[index];
				} else {
					ps[index] = score[round - 2][index] + psc[index];
					alt_ps[index] =
						alt_score[round - 2][index] + alt_psc[index];
				}
			}

			game.addScore(ps);
			game.addScoreChange(psc);

			game.addAltScore(alt_ps);
			game.addAltScoreChange(alt_psc);

			if (!demomode) game.save();

			if (game.getRound() >= game.getMaxRounds()) {
				game.setStep(3);
			} else {
				//update rounds
				game.nextRound();
				//shift dealer
				game.setDealer((game.getDealer() + 1) % players.length);
				game.setStep(1);
				if (!demomode) game.save();
			}
		}
		game.setDisplay(1);
		if (!demomode) game.save();
		update();
	} else {
		if (game.getStep() == 1) {
			(
				document.getElementById("alert_1") as HTMLDialogElement
			).showModal();
		} else {
			(
				document.getElementById("alert_2") as HTMLDialogElement
			).showModal();
		}
	}
}

$("#continuegame").on("click", () => {
	if (game.getRound() >= game.getMaxRounds()) {
		game.setMaxRounds(Number.MAX_SAFE_INTEGER); //means infinite
	}

	$("#endgame").removeClass("hidden");
	$("#savequit").removeClass("hidden");
	$("#continuegame").addClass("hidden");
	$("#rules").removeClass("hidden");

	game.setStep(1);
	game.setDisplay(1);
	score_switch_view(1);
	if (!demomode) game.save();
	update();
});

//toggles checkbox with id rule_1 if user clicks anywhere in div with id box_1Rule
$("#box_1Rule").on("click", (event) => {
	//check if the user clicked on the checkbox itself
	if ($(event.target).is("#rule_1")) {
		return;
	}
	$("#rule_1").trigger("click");
});

//if rule_1 is true then check the checkbox
if (game.getRule_1() == true) {
	$("#rule_1").prop("checked", true);
} else {
	$("#rule_1").prop("checked", false);
}
//add a listener to the checkbox with id rule_1
$("#rule_1").on("click", () => {
	//if the checkbox is checked
	if ($("#rule_1").is(":checked")) {
		game.setRule_1(true);
		//update the confirm button
	} else {
		game.setRule_1(false);
	}
	if (!demomode) game.save();
	updatetotal();
});

//toggles radio for rule_altcount if user clicks anywhere in div
$("#calc_classic_box").on("click", (event) => {
	//check if the user clicked on the radio itself
	if ($(event.target).is("#calc_classic")) {
		return;
	}
	$("#calc_classic").trigger("click");
});

$("#calc_alt_box").on("click", (event) => {
	//check if the user clicked on the radio itself
	if ($(event.target).is("#calc_alt")) {
		return;
	}
	$("#calc_alt").trigger("click");
});

//if rule_altcount is true then check the radio
if (game.getRuleAltcount()) {
	$("#calc_alt").prop("checked", true);
} else {
	$("#calc_classic").prop("checked", true);
}
//add a listener to the radio with id rule_altcount
$("#calc_alt").on("click", () => {
	game.setRuleAltcount(true);
	if (!demomode) game.save();
	updatescore(players, game);
});

$("#calc_classic").on("click", () => {
	game.setRuleAltcount(false);
	if (!demomode) game.save();
	updatescore(players, game);
});

$("#endgame").on("click", () => {
	(document.getElementById("modal_settings") as HTMLDialogElement).close();
	(document.getElementById("modal_confirmend") as HTMLDialogElement).open =
		true;
});

$("#rendgame").on("click", () => {
	if (game.getRound() == 1) {
		localStorage.removeItem("game");
		location.href = "/";
	} else {
		game.setStep(3);
		game.setDisplay(1);
		navblue();
		game.save();
		update();
	}
});

$("#editdealer").on("click", () => {
	//set edit_name to the name of the player
	let select_dealer = document.getElementById(
		"select_dealer"
	) as HTMLSelectElement;
	select_dealer.innerHTML = "";
	for (let index = 0; index < players.length; index++) {
		const player = players[index];
		let option = document.createElement("option");
		option.value = String(index);
		option.text = player;
		select_dealer.add(option);
	}
	select_dealer.value = String(game.getDealer());
	(document.getElementById("modal_dealer") as HTMLDialogElement).showModal();
});
$("#select_dealer_save").on("click", () => {
	game.setDealer(
		parseInt(
			(document.getElementById("select_dealer") as HTMLSelectElement)
				.value
		)
	);
	if (!demomode) game.save();
	location.reload();
});
update();
