import Sortable from "sortablejs";

// Global state
let crowd_chaos = false;
let valid_1 = false;
let valid_2 = true;

// Cached jQuery selectors
const $playerlist = $("#playerlist");
const $showmodal = $("#showmodal");
const $startButton = $("#start_button");
const $alertPlayers = $("#alert_players");
const $alertInvalidPlayers = $("#alert_invalidplayers");
const $rangeContainer = $("#range_container");

// Initialize
$alertInvalidPlayers.hide();
Sortable.create(document.getElementById("playerlist"));

if (!localStorage.getItem("playerlist")) {
    localStorage.setItem("playerlist", JSON.stringify([]));
}

// Initialize range container visibility
if ($("#rounds_auto").prop("checked")) {
    $rangeContainer.hide().addClass("opacity-0");
}

// Event handlers
document.getElementById("showmodal").addEventListener("click", function () {
    document.getElementById("input_playername").focus();
    populateRecentPlayers();
});

function populateRecentPlayers() {
    const recent_players = JSON.parse(localStorage.getItem("playerlist")) || [];
    const $recentPlayers = $("#recent_players").empty();
    
    recent_players.slice(0, 10).forEach((player, i) => {
        const playerExists = $playerlist.children().toArray()
            .some(e => $(e).find(".player-name").val() === player);
            
        if (!playerExists) {
            $("<button>")
                .addClass("btn btn-sm btn-secondary m-1")
                .text(player)
                .on("click", () => addPlayer(player))
                .appendTo($recentPlayers);
        }
    });
}


$("#rule_crowdchaos").on("click", function () {
    crowd_chaos = $(this).prop("checked");
    $("#alert_players_text").text(`Please add at least ${crowd_chaos ? 2 : 3} players`);

    if (crowd_chaos) {
        $showmodal.prop("disabled", false).text("New Player");
    }
    checkPlayers();
});


//function user presses enter
$(document).on( "keyup", function(event) {
    if (event.which === 13) {
        addPlayer($("#input_playername").val().toString());
        //open the modal again and focus the input field
        (document.getElementById("modal_addplayer") as HTMLDialogElement).showModal();
        $("#input_playername").trigger("focus");
    }
});

//method to add a new player
document.getElementById("addPlayer").addEventListener("click", function () {
    addPlayer($("#input_playername").val().toString());
});

$(document).on("click", "#ok_invalidplayer", function () {
    (document.getElementById("modal_addplayer") as HTMLDialogElement).showModal();
});


//validate the playername on edit of the input field with the class player-name
$(document).on("input", ".player-name", function () {
    const playerInput = this as HTMLInputElement;
    const playerName = playerInput.value.trim();
    const $parentDiv = $(this).parent();
    const isValid = validatename(playerName);

    $alertInvalidPlayers.toggle(!isValid);
    valid_2 = isValid;
    checkValid();
    
    // Apply styling based on validation
    $parentDiv.toggleClass("input-error", !isValid)
        .toggleClass("input-secondary", isValid);
});

//method when player clicks any checkbox with the class dealer-checkbox
$(document).on("click", ".dealer-checkbox", function () {
    //uncheck all other checkboxes
    $('.dealer-checkbox').not(this).prop("checked", false);
    //check if the checkbox itself got unchecked and if so prevent that
    if (!$(this).prop("checked")) {
        $(this).prop("checked", true);
    }
});

//when user clicks on the remove button
$(document).on("click", ".remove-player", function () {
    const $parent = $(this).parent();
    const wasDealer = $parent.find(".dealer-checkbox").prop("checked");
    
    $parent.remove();
    
    // If removed player was dealer, make first remaining player dealer
    if (wasDealer && $playerlist.children().length > 0) {
        $playerlist.children().first().find(".dealer-checkbox").prop("checked", true);
    }
    
    // Re-enable add button if under limit
    if ($playerlist.children().length < 6) {
        $showmodal.prop("disabled", false).text("New Player");
    }
    checkPlayers();
});
//if Checkbox with id Random_Dealer is active hide all checkboxes with the class dealer-checkbox
$("#rule_random_dealer").on("click", function () {
    $('.dealer-checkbox').toggle(!$(this).prop("checked"));
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
    $playerlist
        .children()
        .each(function () {
            players.push($(this).find(".player-name").val());
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
        $playerlist
            .children()
            .each(function () {
                if ($(this).find(".dealer-checkbox").prop("checked")) {
                    return false;
                }
                dealer++;
            });
    }

    let round_amount: number;
    if ($("#rounds_custom").prop("checked")) {
        round_amount = parseInt($("#rounds_custom_range").val() as string);
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
        rule_altcount: $("#calc_alt").prop("checked"),
        round: 1,
        max_rounds: round_amount,
        players: players,
        bets: [],
        tricks: [],
        score: [],
        score_change: [],
        alt_score: [],
        alt_score_change: [],
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
            let rule_altcount = game.rule_altcount;
            let max_rounds = game.max_rounds;

            //add a div containing the date and underneath the list of players and the rules
            const presetDiv = $(`<div id='preset${i}' class='flex flex-col p-5 border-2 rounded border-white w-full hover:bg-sky-700'>
          <span></span>
          <div class='flex flex-col w-full'>
            <div class='flex flex-row w-full'>
              <div class='flex flex-col w-full'>
                <div class='flex flex-row w-full overflow-auto' style='white-space: nowrap;'></div>
              </div>
            </div>
          </div>
        </div>`);
        
            // Safely set the date
            presetDiv.find('span').first().text(new Date(game.time_started).toLocaleString());
            
            // Safely add player names
            const playerContainer = presetDiv.find('.overflow-auto');
            players.forEach((player: string, index: number) => {
                const playerSpan = $('<span>').addClass('mr-1 ml-1').text(player);
                playerContainer.append(playerSpan);
                if (index < players.length - 1) {
                    playerContainer.append('&');
                }
            });
            
            $("#presets").append(presetDiv);

            //add a click event to the button that loads the preset
            $("#preset" + i).on("click", function () {
                //clear playerlist and add the preset players
                $("#playerlist").empty();

                //loop over players and add them
                players.forEach(player => addPlayer(player));
                
                // Set rule checkboxes using a more concise approach
                const ruleSettings = [
                    { selector: "#rule_1", value: rule_1 },
                    { selector: "#rule_random_dealer", value: rule_random_dealer },
                    { selector: "#rule_expansion", value: rule_expansion },
                    { selector: "#rule_crowdchaos", value: rule_crowdchaos },
                    { selector: rule_altcount ? "#calc_alt" : "#calc_classic", value: true }
                ];
                
                ruleSettings.forEach(({ selector, value }) => {
                    $(selector).prop("checked", value);
                });
                
                if (!rule_altcount) {
                    $("#calc_classic").prop("checked", true);
                }
                
                if (rule_custom_rounds) {
                    $("#rounds_custom").prop("checked", true);
                    $("#rounds_auto").prop("checked", false);
                    $rangeContainer.show().removeClass("opacity-0");
                    $("#rounds_custom_range").val(max_rounds);
                    $("#range_val").text(max_rounds);
                } else {
                    $("#rounds_custom").prop("checked", false);
                    $("#rounds_auto").prop("checked", true);
                    $rangeContainer.hide();
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
    $playerlist.empty();
    ["Anakin", "Obi-Wan", "Yoda", "Mace Windu"].forEach(name => addPlayer(name));
    
    const testSettings = [
        { selector: "#rule_1", value: true },
        { selector: "#rule_random_dealer", value: false },
        { selector: "#rule_expansion", value: false },
        { selector: "#rule_crowdchaos", value: false }
    ];
    
    testSettings.forEach(({ selector, value }) => {
        $(selector).prop("checked", value);
    });
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

// Range container handlers
const toggleRangeContainer = (show: boolean) => {
    $rangeContainer.toggle(show)
        .toggleClass("opacity-0", !show)
        .toggleClass("opacity-100", show);
};

$("#rounds_auto_box").on("click", function () {
    toggleRangeContainer(false);
    const val = amountofrounds($playerlist.children().length);
    $("#range_val").val(val);
    $("#rounds_custom_range").val(val);
    $("#rounds_auto").prop("checked", true);
});

$("#rounds_custom_box").on("click", function () {
    toggleRangeContainer(true);
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

//toggles radio for rule_altcount if user clicks anywhere in div
const handleCalcBoxClick = (targetId: string) => (event) => {
    if (!$(event.target).is(targetId)) {
        $(targetId).trigger("click");
    }
};

$("#calc_classic_box").on("click", handleCalcBoxClick("#calc_classic"));
$("#calc_alt_box").on("click", handleCalcBoxClick("#calc_alt"));

//function that checks if valid 1 and 2 are both true and if so enables the button with id start_button
function checkValid() {
    $startButton.toggleClass("btn-disabled", !(valid_1 && valid_2))
        .toggleClass("btn-secondary", valid_1 && valid_2);
}

//function that checks if the playerlist has at least 3 players and if not hide the div with the id alter_players and its children
function checkPlayers() {
    const playerCount = $playerlist.children().length;
    const minPlayers = crowd_chaos ? 2 : 3;
    const hasEnoughPlayers = playerCount >= minPlayers;
    
    $alertPlayers.toggle(!hasEnoughPlayers);
    valid_1 = hasEnoughPlayers;
    checkValid();
}

const regex = /^[a-zA-Z0-9\- ]{2,15}$/;
function validatename(playername: string) {
    return regex.test(playername);
}

function amountofrounds(players: number) {
    const roundsMap = { 3: 20, 4: 15, 5: 12, 6: 10 };
    return roundsMap[players] || 10;
}

function addPlayer(playername: string) {
    if (!playername?.trim()) return;
    
    if (!validatename(playername)) {
        (document.getElementById("alert_invalidplayer") as HTMLDialogElement).showModal();
        console.log("invalid playername" + playername);
        return;
    }

    const playerCount = $playerlist.children().length;
    if (playerCount > 5 && !crowd_chaos) return;
    
    if (playerCount === 5 && !crowd_chaos) {
        $showmodal.prop("disabled", true).text("Max amount of players reached");
    }
    
    $playerlist.append(
        `<div class='appear flex flex-row input input-bordered input-secondary w-full my-1 items-center new-box'>
        <input type='text' placeholder='Name' class='h-full w-full !outline-none bg-transparent player-name' aria-label="playername">
        <input type='checkbox' class='checkbox h-2/4 dealer-checkbox' aria-label="toggle dealer">
        <img src='/icon/trash.svg' class='inv h-2/4 pl-2 remove-player' />
      </div>`
    );
    
    $("#input_playername").val("");
    $playerlist.children().last().find(".player-name").val(playername);

    // Check if random dealer is enabled and hide the checkbox if it is
    if ($("#rule_random_dealer").prop("checked")) {
        $playerlist.children().last().find(".dealer-checkbox").hide();
    }

    if ($playerlist.children().length === 1) {
        $playerlist.children().first().find(".dealer-checkbox").prop("checked", true);
    }
    checkPlayers();
}