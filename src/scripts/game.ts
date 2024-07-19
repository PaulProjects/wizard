import { updatescore, score_switch_view } from "../scripts/score.ts";
import { gamedata } from "../scripts/gamedata.ts";

//if game is null then redirect to index
if (localStorage.getItem("game") == null) {
    window.location.href = "/";
}

//get the game json from localstorage
let game: gamedata;
try {
    game = gamedata.fromJSONstring(localStorage.getItem("game"));
} catch (error) {
    console.error(error);
    window.location.href = "/";
}
//get the players 
const players = game.getPlayers();

window.editmode = false;

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
        s_round.innerHTML = `${game.getRound()}/∞`;
    }
    else {
        s_round.innerHTML = `${game.getRound()}/${game.getMaxRounds()}`;
    }
    s_round.className = "";
    s_round.classList.add("text-3xl");
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
    game.save();
    roundinfo();
    updatescore(players, game);
});
$("#color_red").on("click", () => {
    game.setColor(game.getRound(), "red");
    game.save();
    roundinfo();
    updatescore(players, game);
});
$("#color_green").on("click", () => {
    game.setColor(game.getRound(), "green");
    game.save();
    roundinfo();
    updatescore(players, game);
});

$("#color_yellow").on("click", () => {
    game.setColor(game.getRound(), "yellow");
    game.save();
    roundinfo();
    updatescore(players, game);
});
$("#color_none").on("click", () => {
    game.removeColor(game.getRound());
    //game.setColor(game.getRound(), null);
    game.save();
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
    (document.getElementById("modal_randomcolor") as HTMLDialogElement).showModal();
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

        game.save();
        roundinfo();
        $("#random_close_button").removeClass("btn-disabled");
        updatescore(players, game);
    }, 2000);
});

function update() {
    if (game.getDisplay() == 1) {
        //add class="hidden" to input and remove it from score
        document.getElementById("input").classList.add("hidden");
        document.getElementById("score").classList.remove("hidden");
        hidegraphicon();

        roundinfo();

        $("#names").append("<th>Round</th>");

        if (game.getStep() == 1) {
            $("#navtext").text("Place Bets");
        } else if (game.getStep() == 2) {
            $("#navtext").text("Enter Tricks");
        }

        if (game.getStep() == 3) {
            navblue();
            score_switch_view(4);
            $("#icon_celeb").removeClass("hidden");
            $("#endgame").addClass("hidden");
            $("#savequit").addClass("hidden");
            $("#continuegame").removeClass("hidden");
            $("#rules").addClass("hidden");
        } else {
            score_switch_view(game.getScoreDisplay());
            $("#icon_celeb").addClass("hidden");
        }

        updatescore(players, game);
    } else if (game.getDisplay() == 2) {
        //add class="hidden" to score and remove it from input
        document.getElementById("score").classList.add("hidden");
        document.getElementById("input").classList.remove("hidden");
        showgraphicon();
        updateInput();
    }
}
//add a listener to the nav_button
$("#nav_button").on("click", () => {
    freezebutton();
    if (editmode == true) {
        //reload page
        location.reload();
    } else if (game.getStep() == 3) {
        finish_game();
    } else if (game.getDisplay() == 1) {
        game.setDisplay(2);
        game.save();
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
        game.save();
        update();
    }
});

function finish_game() {
    //saving thing:
    $("#navtext").text("Saving...");
    //TODO: remove display, step and score_display
    //put a time_ended timestamp
    game.setTimeEnded(Date.now());

    $.post(
        "https://s.paulbertram.de/wizzardshare.php",
        { game: JSON.stringify(gamedata.toJson(game)) },
        function (data) {
            //add id info to the game
            game.setId(data);
            console.log("Success: " + data);
        },
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
            recent_games.push(gamedata.toJson(game));
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
$("#icon_chart").on("click", () => {
    score_switch_view(1);
});
$("#icon_table").on("click", () => {
    score_switch_view(2);
});
$("#icon_top").on("click", () => {
    score_switch_view(3);
});
$("#icon_celeb").on("click", () => {
    score_switch_view(4);
});
$("#icon_bar").on("click", () => {
    score_switch_view(5);
});
$("#icon_analytics").on("click", () => {
    score_switch_view(6);
});

//Input
let valid = true;

//an array to store the scores
let scores: number[] = [];

//helper methods
function updatetotal() {
    if (game.getStep() == 1) {
        let total = scores.reduce((a, b) => +a + +b, 0);
        $("#total").html(`Total: ${total}`);
        if (game.getRound() !== 1 && game.getRule_1() == true) {
            if (total === game.getRound()) {
                valid = false;
                navred();
            } else {
                valid = true;
                navblue();
            }
            let insets = document.querySelectorAll(
                "#input_insets_" + last_player_index + " span",
            );

            let last_player_range = $("#input_range_" + last_player_index).val() as string;
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
        $("#total").html(
            `Total: ${scores.reduce((a, b) => +a + +b, 0)}/${game.getRound()}`,
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

function scorecalc(bet, trick) {
    if (bet == trick) {
        return 20 + parseFloat(bet) * 10;
    } else {
        return Math.abs(bet - trick) * -10;
    }
}

let last_player_index = 0;

function addplayertoInput(index: number, max: number) {
    last_player_index = index;

    let player = players[index];
    $("#players").append(
        `<div class="card w-full lg:w-2/3 bg-base-100 shadow-xl">
            <div class="card-body">
                <h2 class="card-title text-2xl">${player}</h2>
                <input type="range" min="0" max="${max}" value="0" class="range" step="1" aria-label="Input" id="input_range_${index}"/>
                <div class="w-full flex justify-between text-xl range-lg insets pl-1 pr-1" id="input_insets_${index}">
                </div>
            </div>
        </div>
    </div>`,
    );

    $(`#input_range_${index}`).on("input", function () {
        scores[index] = parseInt($(this).val() as string);
        //update the total
        updatetotal();
        //underline the inset that matches the value
        $(`#input_insets_${index} span`).removeClass("underline");
        $(`#input_insets_${index} span:eq(${scores[index]})`).addClass("underline");
    });

    //add insets as max
    for (let i = 0; i <= max; i++) {
        if (game.getStep() == 2) {
            //if i is equal to the bet hightlight it
            if (i == game.getBets()[game.getRound() - 1][index]) {
                $(`#input_insets_${index}`).append(
                    `<span class="range_number_highlighted">${i}</span>`,
                );
            } else {
                $(`#input_insets_${index}`).append(
                    `<span class="range_number">${i}</span>`,
                );
            }
        } else {
            $(`#input_insets_${index}`).append(
                `<span class="range_number">${i}</span>`,
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
        $(`#input_insets_${index} span:eq(${scores[index]})`).addClass("underline");
    });
}

function updateInput() {
    if (input_block_reload) {
        input_block_reload = false;
        updatetotal();
        return;
    }
    $("#players").empty();

    $("#navtext").text("Confirm");

    if (game.getStep() == 1) {
        document.getElementById("round").innerHTML =
            `${game.getRound()}/${game.getMaxRounds()} - Place Bets`;
    } else {
        document.getElementById("round").innerHTML =
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
            game.save();
        } else {
            let tricks = game.getTricks();
            if (tricks === null) {
                tricks = [];
            }

            //push the scores array to the tricks
            game.setRoundTricks(scores);
            game.save();

            let score = game.getScore();
            //calculate the scores
            let score_change = game.getScoreChange();
            let psc: number[] = [];
            let ps: number[] = [];
            const round = game.getRound();

            if (game.getRound() === 1) {
                score_change = [];
                score = [];
            }
            for (let index = 0; index < players.length; index++) {
                psc[index] = scorecalc(
                    game.getBets()[round - 1][index],
                    game.getTricks()[round - 1][index],
                );

                if (round === 1) {
                    ps[index] = psc[index];
                } else {
                    ps[index] = score[round - 2][index] + psc[index];
                }
            }
            
            game.addScore(ps);
            game.addScoreChange(psc);

            game.save();

            if (game.getRound() >= game.getMaxRounds()) {
                game.setStep(3);
            } else {
                //update rounds
                game.nextRound();
                //shift dealer
                game.setDealer((game.getDealer() + 1) % players.length);
                game.setStep(1);
                game.save();
            }
        }
        game.setDisplay(1);
        game.save();
        update();
    } else {
        if (game.getStep() == 1) {
            (document.getElementById("alert_1") as HTMLDialogElement).showModal();
        } else {
            (document.getElementById("alert_2") as HTMLDialogElement).showModal();
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
    score_switch_view(2);
    game.save();
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
        game.save();
        //update the confirm button
    } else {
        game.setRule_1(false);
        game.save();
    }
    updatetotal();
});

$("#endgame").on("click", () => {
    (document.getElementById("modal_settings") as HTMLDialogElement).close();
    (document.getElementById("modal_confirmend") as HTMLDialogElement).open = true;
});

//TODO
$("#rendgame").on("click", () => {
    if (game.getRound() == 1) {
        localStorage.removeItem("game");
        location.href = "/";
    } else {
        game.setStep(3);
        game.setDisplay(1);
        navblue();
        localStorage.setItem("game", JSON.stringify(game));
        update();
    }
});

$("#editscore").on("click", () => {
    //change navtext to exit edit mode
    $("#navtext").text("Exit Edit Mode");
    score_switch_view(2);
    editmode = true;

    //players
    for (let index = 0; index < players.length; index++) {
        let player = players[index];
        $(`#n_${index}`).on("click", () => {
            (document.getElementById("modal_edit") as HTMLDialogElement).showModal();
            //set edit_name to the name of the player
            let old_name = $(`#n_${index}`).text();
            let had_crown = false;
            if (old_name.includes("👑")) {
                had_crown = true;
                old_name = old_name.replaceAll("👑", ""); //Just to be sure
            }
            old_name = old_name.trim();
            $("#edit_name").val(old_name);
            $("#edit_save").on("click", () => {
                $("#edit_save").off("click");
                //get the new name
                let new_name = $("#edit_name").val() as string;
                //TODO: validate the name
                if (had_crown) {
                    new_name = new_name + " 👑";
                }
                //rename the player
                game.renamePlayer(index, new_name);
                game.save();
                //update the name
                $(`#n_${index}`).text(new_name);
            });
        });
    }

    //score
    //bind click event to each td with id std
    $("td[id^='std']").on("click", function () {
        //TODO: crown thing

        let id = $(this).attr("id");
        let round = $(this).attr("round");
        let player = $(this).attr("player");
        let score = game.getScore()[round][player];
        (document.getElementById("modal_edit") as HTMLDialogElement).showModal();
        $("#edit_name").val(score);
        $("#edit_save").on("click", () => {
            $("#edit_save").off("click");
            let new_score = parseInt($("#edit_name").val() as string);
            let score_array = game.getScore();
            score_array[round][player] = new_score;
            game.setScore(score_array);
            game.save();
            $(`#std${round}${player}`).text(new_score);
        });
    });

    //bind click event to each td with id btd
    $("td[id^='btd']").on("click", function () {
        let id = $(this).attr("id");
        let round = $(this).attr("round");
        let player = $(this).attr("player");
        let bet = game.getBets()[round][player];
        (document.getElementById("modal_edit") as HTMLDialogElement).showModal();
        $("#edit_name").val(bet);
        $("#edit_save").on("click", () => {
            $("#edit_save").off("click");
            let new_bet = parseInt($("#edit_name").val() as string);
            //check if new_bet is a positive number else show info modal
            if (new_bet < 0 || new_bet % 1 != 0) {
                (document.getElementById("modal_attention") as HTMLDialogElement).showModal();
                $("#info_text").text("Please enter a positive number");
                return;
            }
            let bet_array = game.getBets();
            bet_array[round][player] = new_bet;
            game.setBets(bet_array);
            game.save();
            $(`#btd${round}${player}`).text(new_bet);
        });
    });
    //show info modal
    (document.getElementById("modal_attention") as HTMLDialogElement).showModal();
    $("#info_text").text("Click on a name, score or bet to edit it.");
});

$("#editdealer").on("click", () => {
    //set edit_name to the name of the player
    let old_name = players[game.getDealer()];
    let select_dealer = document.getElementById("select_dealer") as HTMLSelectElement;
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
    game.setDealer(parseInt((document.getElementById("select_dealer") as HTMLSelectElement).value));
    game.save();
    location.reload();
});
update();