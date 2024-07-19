import Sortable from "sortablejs";

let crowd_chaos = false;

$("#alert_invalidplayers").hide();

//make the list sortable
let el = document.getElementById("playerlist");
let sortable = Sortable.create(el);

//boolean that checks if the settings are valid
let valid_1 = false;
let valid_2 = true;

if (localStorage.getItem("playerlist") == null) {
    localStorage.setItem("playerlist", JSON.stringify([]));
}

//onclick on button with id showmodal
document.getElementById("showmodal").addEventListener("click", function () {
    document.getElementById("input_playername").focus();

    //fill recent_players with players that are in localstorage playerlist but not in the playerlist
    let recent_players = JSON.parse(localStorage.getItem("playerlist"));
    $("#recent_players").empty();
    //loop over max 10 recent players
    let max = recent_players.length;
    if (max > 10) {
        max = 10;
    }
    for (let i = 0; i < max; i++) {
        if (
            !$("#playerlist")
                .children()
                .toArray()
                .some((e) => {
                    return $(e).find("input[type='text']").val() == recent_players[i];
                })
        ) {
            //append small badges with the names
            $("#recent_players").append(
                `<button class='btn btn-sm btn-secondary m-1' id='recent_player${i}'>${recent_players[i]}</button>`,
            );

            document.getElementById("recent_player" + i).addEventListener("click", function () {
                console.log("clicked on " + recent_players[i]);
                addPlayer(recent_players[i]);
            });
        }
    }
});


$("#rule_crowdchaos").on("click", function () {
    if ($(this).prop("checked") == true) {
        crowd_chaos = true;
        $("#alert_players_text").text("Please add at least 2 players");
    } else {
        crowd_chaos = false;
        $("#alert_players_text").text("Please add at least 3 players");
    }
    checkPlayers();
});


//function user presses enter
$(document).keyup(function (event) {
    if (event.which === 13) {
        addPlayer($("#input_playername").val().toString());
    }
});

//method to add a new player
document.getElementById("addPlayer").addEventListener("click", function () {
    addPlayer($("#input_playername").val().toString());
});

$(document).on("click", "#ok_invalidplayer", function () {
    (document.getElementById("modal_addplayer") as HTMLDialogElement).showModal();
});


//call checkempty on edit of the input field with the id input_playername
$(document.body).on("input", "#player", function () {
    if (checkEmpty()) {
        $("#alert_invalidplayers").show();
        //exchange input-secondary with input-error
        valid_2 = false;
        checkValid();
    } else {
        $("#alert_invalidplayers").hide();
        valid_2 = true;
        checkValid();
    }
});

//method when player clicks a any checkbox with the id dealer
$(document).on("click", "#dealer", function () {
    //uncheck all other checkboxes
    $('input[id="dealer"]').not(this).prop("checked", false);
    //check if the checkbox itself got unchecked and if so prevent that
    if ($(this).prop("checked") == false) {
        $(this).prop("checked", true);
    }
});

//when user clicks on the remove button
$(document).on("click", "#remove", function () {
    //store if the checkbox is checked
    let checked = $(this)
        .parent()
        .find("input[type='checkbox']")
        .prop("checked");
    //remove the parent div
    $(this).parent().remove();
    //if the checkbox was checked, check the first checkbox
    if (checked) {
        $("#playerlist")
            .children()
            .first()
            .find("input[type='checkbox']")
            .prop("checked", true);
    }
    //if the amount of players is less then 6, enable the button
    if ($("#playerlist").children().length < 6) {
        $("#showmodal").prop("disabled", false);
        //change text to new player
        $("#showmodal").text("New Player");
    }
    checkPlayers();
});
//if Checkbox with id Random_Dealer is active add disabled to all checkboxes with the id dealer
$("#rule_random_dealer").on("click", function () {
    if ($(this).prop("checked") == true) {
        $('input[id="dealer"]').prop("disabled", true);
    } else {
        $('input[id="dealer"]').prop("disabled", false);
    }
});

//listen for click on all divs with the class optionbox
$(".optionbox").on("click", function () {
    //check if the user clicked on the checkbox itself
    if ($(event.target).is("input[type='checkbox']")) {
        return;
    }
    //get the checkbox inside the div
    let checkbox = $(this).find("input[type='checkbox']");
    //trigger a click on the checkbox
    checkbox.trigger("click");
});


//start button with id start_button
$("#start_button").on("click", function () {
    $("#start_button").addClass("loading");
    $("#start_button").addClass("loading-spinner");

    let players = [];
    $("#playerlist")
        .children()
        .each(function () {
            players.push($(this).find("input[type='text']").val());
        });

    //push the playerlist to localstorage
    let playerlist = JSON.parse(localStorage.getItem("playerlist"));
    playerlist.push(...players);
    //remove any duplicates
    playerlist = [...new Set(playerlist)];
    localStorage.setItem("playerlist", JSON.stringify(playerlist));

    let dealer = 0;
    //find out which player is the dealer
    if ($("#rule_random_dealer").prop("checked")) {
        dealer = Math.floor(Math.random() * players.length);
    } else {
        $("#playerlist")
            .children()
            .each(function () {
                if ($(this).find("input[type='checkbox']").prop("checked")) {
                    return false;
                }
                dealer++;
            });
    }

    let round_amount;
    if ($("#rounds_custom").prop("checked")) {
        round_amount = $("#rounds_custom_range").val();
    } else {
        round_amount = amountofrounds(players.length);
    }
    //create a json array with the game settings
    let game = {
        dealer: dealer,
        rule_1: $("#rule_1").prop("checked"),
        rule_random_dealer: $("#rule_random_dealer").prop("checked"),
        rule_expansion: $("#rule_expansion").prop("checked"),
        rule_custom_rounds: $("#rounds_custom").prop("checked"),
        rule_crowdchaos: $("#rule_crowdchaos").prop("checked"),
        round: 1,
        max_rounds: round_amount,
        players: players,
        bets: [],
        tricks: [],
        score: [],
        score_change: [],
        color: {},
        step: 1,
        display: 1,
        score_display: 3,
        time_started: Date.now(),
    };
    //check if player is onmobile
    if (window.innerWidth < 768) {
        game.score_display = 3;
    }

    localStorage.setItem("game", JSON.stringify(game));
    location.href = "/game/";
});

$("#tlbtn").on("click", function () {
    location.href = "/";
});


let modal_edit = document.getElementById("modal_edit") as HTMLDialogElement;
//get the presets from localstorage
let past_games = JSON.parse(localStorage.getItem("recent_games"));

//check if presets is null or the array is empty
if (past_games == null || past_games.length == 0) {
    //add a disabled "no presets yet" button to the presets div
    $("#presets").append(
        `<button class='btn btn-block btn-disabled m-2' id='preset0'>no past games found</button>`,
    );
} else {
    //reverse the array so the newest games are on top
    past_games.reverse();
    for (let i = 0; i < past_games.length; i++) {
        try {
            let game = past_games[i];
            let players = game.players;
            let rule_1 = game.rule_1;
            let rule_random_dealer = game.rule_random_dealer;
            let rule_expansion = game.rule_expansion;
            let rule_crowdchaos = game.rule_crowdchaos;
            let rule_custom_rounds = game.rule_custom_rounds;
            let max_rounds = game.max_rounds;

            //add a div containing the date and underneath the list of players and the rules
            $("#presets").append(
                `<div id='preset${i}' class='flex flex-col p-5 border-2 rounded border-white w-full hover:bg-sky-700'>
          <span>${new Date(game.time_started).toLocaleString()}</span>
          <div class='flex flex-col w-full'>
            <div class='flex flex-row w-full'>
              <div class='flex flex-col w-full'>
                <div class='flex flex-row w-full overflow-auto' style='white-space: nowrap;'>${players.map((player: string) => {
                    return `<span class="mr-1 ml-1">${player}</span>`;
                })
                    .join("&")}</div>
              </div>
            </div>
          </div>
        </div>`,
            );

            //add a click event to the button that loads the preset
            $("#preset" + i).on("click", function () {
                //clear playerlist and add the preset players
                $("#playerlist").empty();

                //loop over players and add them
                for (let i = 0; i < players.length; i++) {
                    addPlayer(players[i]);
                }
                if (rule_1 == true) {
                    $("#rule_1").prop("checked", true);
                } else {
                    $("#rule_1").prop("checked", false);
                }
                if (rule_random_dealer == true) {
                    $("#rule_random_dealer").prop("checked", true);
                } else {
                    $("#rule_random_dealer").prop("checked", false);
                }
                if (rule_expansion == true) {
                    $("#rule_expansion").prop("checked", true);
                } else {
                    $("#rule_expansion").prop("checked", false);
                }
                if (rule_crowdchaos == true) {
                    $("#rule_crowdchaos").prop("checked", true);
                } else {
                    $("#rule_crowdchaos").prop("checked", false);
                }
                if (rule_custom_rounds == true) {
                    $("#rounds_custom").prop("checked", true);
                    $("#rounds_auto").prop("checked", false);
                    $("#range_container").show();
                    $("#range_container").removeClass("opacity-0");
                    $("#rounds_custom_range").val(max_rounds);
                    $("#range_val").text(max_rounds);
                } else {
                    $("#rounds_custom").prop("checked", false);
                    $("#rounds_auto").prop("checked", true);
                    $("#range_container").hide();
                }
                //close modal
                modal_edit.close();
            });
        } catch (e) {
            console.log(e);
        }
    }
}

document.getElementById("test-preset").addEventListener("click", function () {
    $("#playerlist").empty();
    addPlayer("Anakin");
    addPlayer("Obi-Wan");
    addPlayer("Yoda");
    addPlayer("Mace Windu");
    
    $("#rule_1").prop("checked", true);
    $("#rule_random_dealer").prop("checked", false);
    $("#rule_expansion").prop("checked", false);
    $("#rule_crowdchaos").prop("checked", false);
});

$("#title").on("click", function () {
    //show modal_edit modal
    modal_edit.showModal();
});

//if the playlist is empty, hide the button
if ($("#playerlist").children().length == 0) {
    $("#clearrecent").hide();
}

$("#clearrecent").on("click", function () {
    localStorage.setItem("playerlist", JSON.stringify([]));
    location.reload();
});

//range stuff
//check if the checkbox with id rounds_auto is checked and if so hide the range container
if ($("#rounds_auto").prop("checked")) {
    $("#range_container").hide();
    $("#range_container").addClass("opacity-0");
}

$("#rounds_auto_box").on("click", function () {
    $("#range_container").hide();
    $("#range_container").removeClass("opacity-100");
    $("#range_container").addClass("opacity-0");

    let val = amountofrounds($("#playerlist").children().length);
    $("#range_val").val(val);
    $("#rounds_custom_range").val(val);
    $("#rounds_auto").prop("checked", true);
});

$("#rounds_custom_box").on("click", function () {
    $("#range_container").show();
    $("#range_container").removeClass("opacity-0");
    $("#range_container").addClass("opacity-100");
    $("#rounds_custom").prop("checked", true);
});

$("#rounds_custom_range").on("input", function () {
    $("#range_val").val($(this).val());
});

document.onreadystatechange = function () {
    if (document.readyState === "complete") {
        document.getElementById("loading").classList.add("hidden");
    }
};




//function that checks if valid 1 and 2 are both true and if so enables the button with id start_button
function checkValid() {
    if (valid_1 && valid_2) {
        $("#start_button").removeClass("btn-disabled");
        $("#start_button").addClass("btn-secondary");
    } else {
        $("#start_button").removeClass("btn-secondary");
        $("#start_button").addClass("btn-disabled");
    }
}

//function that checks if the playerlist has at least 3 players and if not hide the div with the id alter_players and its children
function checkPlayers() {
    if (
        ($("#playerlist").children().length < 3 && crowd_chaos == false) ||
        ($("#playerlist").children().length < 2 && crowd_chaos == true)
    ) {
        $("#alert_players").show();
        valid_1 = false;
        checkValid();
    } else {
        $("#alert_players").hide();
        valid_1 = true;
        checkValid();
    }
}

const regex = /^[a-zA-Z0-9\- ]{2,12}$/;
function validatename(playername: string) {
    return regex.test(playername);
}

function addPlayer(playername: string) {
    //check if the input field with id input_playername is empty
    if (playername == null || playername.trim() == "") {
        return;
    }
    //validate the playername
    if (!validatename(playername)) {
        (document.getElementById("alert_invalidplayer") as HTMLDialogElement).showModal();
        console.log("invalid playername" + playername);
        return;
    }

    //check if the div does not contain more then 6 elements with the id player
    if ($("#playerlist").children().length > 5) {
        return;
    }
    
    //if the amount of player hits 6, disable the button
    if ($("#playerlist").children().length == 5) {
        $("#showmodal").prop("disabled", true);
        //change text to max players
        $("#showmodal").text("Max amount of players reached");
    }
    //insert
    $("#playerlist").append(
        `<div class='appear flex flex-row input input-bordered input-secondary w-full my-1 items-center new-box'>
        <input type='text' placeholder='Name' class='h-full w-full !outline-none bg-transparent' id='player' aria-label="playername">
        <input type='checkbox' class='checkbox h-2/4' id='dealer' aria-label="toggle dealer">
        <img src='/icon/trash.svg' class='inv h-2/4 pl-2' id='remove'/>
      </div>`,
    );
    //set the value of the input field to an empty string and place the text in the newly added input field
    $("#input_playername").val("");
    $("#playerlist")
        .children()
        .last()
        .find("input[type='text']")
        .val(playername);

    //if that was the first player check its checkbox
    if ($("#playerlist").children().length == 1) {
        $("#playerlist")
            .children()
            .first()
            .find("input[type='checkbox']")
            .prop("checked", true);
    }
    checkPlayers();
}

//check if an input with the id player is empty or just contains spaces
function checkEmpty() {
    let empty = false;
    $("#playerlist")
        .children()
        .each(function () {
            if ($(this).find("input[type='text']").val().trim() == "") {
                empty = true;
                //remove the class input-secondary and add input-error from the parent div
                $(this).removeClass("input-secondary");
                $(this).addClass("input-error");
            } else {
                $(this).removeClass("input-error");
                $(this).addClass("input-secondary");
            }
        });
    return empty;
}

function amountofrounds(players) {
    switch (players) {
        case 3:
            return 20;
        case 4:
            return 15;
        case 5:
            return 12;
        case 6:
            return 10;
        default:
            return 10;
    }
}
