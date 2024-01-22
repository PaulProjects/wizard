//Score
window.score_switch_view = function score_switch_view(x, game) {
    let edit = window.editmode;
    if (edit == null) {
        var editmode = false;
    }
    if (edit == true) {
        //reload page
        location.reload();
    }
    if (game != null) {
        game.score_display = x;
    }
    localStorage.setItem("game", JSON.stringify(game));
    if (x == "1") {
        $("#graph").removeClass("hidden");
        $("#table").addClass("hidden");
        $("#top_players").addClass("hidden");
        $("#celebration").addClass("hidden");
        $("#bar_graph").addClass("hidden");

        $("#icon_chart").addClass("icon_underline");
        $("#icon_table").removeClass("icon_underline");
        $("#icon_top").removeClass("icon_underline");
        $("#icon_celeb").removeClass("icon_underline");
        $("#icon_bar").removeClass("icon_underline");
    } else if (x == "2") {
        $("#table").removeClass("hidden");
        $("#graph").addClass("hidden");
        $("#top_players").addClass("hidden");
        $("#celebration").addClass("hidden");
        $("#bar_graph").addClass("hidden");

        $("#icon_chart").removeClass("icon_underline");
        $("#icon_table").addClass("icon_underline");
        $("#icon_top").removeClass("icon_underline");
        $("#icon_celeb").removeClass("icon_underline");
        $("#icon_bar").removeClass("icon_underline");
    } else if (x == "3") {
        $("#table").addClass("hidden");
        $("#graph").addClass("hidden");
        $("#top_players").removeClass("hidden");
        $("#celebration").addClass("hidden");
        $("#bar_graph").addClass("hidden");

        $("#icon_chart").removeClass("icon_underline");
        $("#icon_table").removeClass("icon_underline");
        $("#icon_top").addClass("icon_underline");
        $("#icon_celeb").removeClass("icon_underline");
        $("#icon_bar").removeClass("icon_underline");
    } else if (x == "4") {
        $("#table").addClass("hidden");
        $("#graph").addClass("hidden");
        $("#top_players").addClass("hidden");
        $("#celebration").removeClass("hidden");
        $("#bar_graph").addClass("hidden");

        $("#icon_chart").removeClass("icon_underline");
        $("#icon_table").removeClass("icon_underline");
        $("#icon_top").removeClass("icon_underline");
        $("#icon_celeb").addClass("icon_underline");
        $("#icon_bar").removeClass("icon_underline");
    } else if (x == 5) {
        $("#table").addClass("hidden");
        $("#graph").addClass("hidden");
        $("#top_players").addClass("hidden");
        $("#celebration").addClass("hidden");
        $("#bar_graph").removeClass("hidden");

        $("#icon_chart").removeClass("icon_underline");
        $("#icon_table").removeClass("icon_underline");
        $("#icon_top").removeClass("icon_underline");
        $("#icon_celeb").removeClass("icon_underline");
        $("#icon_bar").addClass("icon_underline");
    }
}

window.updatescore = function updatescore(players, game) {
    /*
      Data
    */

    //bets and tricks arrays using json parse from localstorage
    const bets = JSON.parse(game.bets);
    const score = JSON.parse(game.score);

    //playerlist sorted by score and a unsorted playerlist
    let playerlist = [];
    let sorted_playerlist = [];

    if (game.round > 1) {
        for (let i = 0; i < players.length; i++) {
            playerlist[i] = [players[i], score[score.length - 1][i]];
            sorted_playerlist[i] = [players[i], score[score.length - 1][i], bets[bets.length - 1][i]];
        }
        //sort the playerlist
        sorted_playerlist.sort(function (a, b) {
            return b[1] - a[1];
        });
    }
    else {
        for (let i = 0; i < players.length; i++) {
            playerlist[i] = [players[i], 0];
            if (bets.length == 0) {
                sorted_playerlist[i] = [players[i], 0, 0];
            }
            else {
                sorted_playerlist[i] = [players[i], 0, bets[bets.length - 1][i]];
            }
        }
    }

    //get the highest score
    let max = sorted_playerlist[0][1];
    //get the lowest score
    let min = sorted_playerlist[sorted_playerlist.length - 1][1];

    let currentPlace = 1;
    let lastScore = sorted_playerlist[0][1];
    
    for (let i = 0; i < sorted_playerlist.length; i++) {
        if (sorted_playerlist[i][1] == max) {
            sorted_playerlist[i][0] = sorted_playerlist[i][0] + " 👑";
        }
        //check if the player is the dealer and if so add a 1 in the array else a 0
        if (i == game.dealer) {
            sorted_playerlist[i][4] = 1;
        } else {
            sorted_playerlist[i][4] = 0;
        }
        //add the place to the player and give players with the same score the same place
        if (sorted_playerlist[i][1] != lastScore) {
            currentPlace = i + 1;
        }

        sorted_playerlist[i][0] = currentPlace + ". " + sorted_playerlist[i][0];
        sorted_playerlist[i][3] = currentPlace;

        lastScore = sorted_playerlist[i][1];
    }
    for (let i = 0; i < playerlist.length; i++) {
        if (playerlist[i][1] == max) {
            playerlist[i][0] = playerlist[i][0] + " 👑";
        }
    }

    /*
        Views
    */
    $("#top_players").empty();
    $("#names").empty();
    $("#rows").empty();

    //Top Players list
    for (let i = 0; i < sorted_playerlist.length; i++) {
        $("#top_players").append(
            `<div class="w-full bg-base-100 shadow-xl">
                    <div class="card-body">
                        <h2 class="card-title text-3xl lg:text-5xl ${sorted_playerlist[i][4] == 1 ? 'text-secondary' : ''}" id="top_players_${i}">
                            ${sorted_playerlist[i][0]}
                        </h2>
              
                        <p id="top_players_p${i}"> ${sorted_playerlist[i][1]} Points</p>
                        <p id="top_players_b${i}"></p>
                    </div>
                </div>`,
        );
        //if step is 2 then add the bets
        if (game.step == "2") {
            document.getElementById("top_players_b" + i).innerHTML =
                `Bet: ${sorted_playerlist[i][2]}`;
        }
    }


    //fill the table
    //get the names from the game json and place them in the table
    $("#names").append(`<th>Round</th>`);
    for (let index = 0; index < playerlist.length; index++) {
        if (index === game.dealer)
            $("#names").append(
                `<th> <span class="badge badge-secondary" id="n_${index}">${playerlist[index][0]}</span></th><th>   </th>`,
            );
        else $("#names").append(`<th id="n_${index}">${playerlist[index][0]}</th><th>   </th>`);
    };
    for (let i = 0; i < game.round; i++) {
        //create a new row
        $("#rows").append(`<tr id="row${i}"></tr>`);
        //add the round number to the row
        $(`#row${i}`).append(`<td>${i + 1}</td>`);
        //add the bets to the row
        for (let j = 0; j < playerlist.length; j++) {
            try {
                $(`#row${i}`).append(`<td id="std${i}${j}">${score[i][j]}</td>`);
            } catch {
                $(`#row${i}`).append(`<td></td>`);
            }
            try {
                $(`#row${i}`).append(`<td id="btd${i}${j}">${bets[i][j]}</td>`);
            } catch {
                $(`#row${i}`).append(`<td></td>`);
            }
        }
    }

    //add the class bg-base-200 to the last element in the table with the rows
    $("#rows tr:last-child").addClass("bg-base-200");


    if (game.round == 1 || game.round == "2") {
        $("#icon_chart").addClass("hidden");
        $("#icon_bar").addClass("hidden");
    } else {

        //Graph
        let score_chart;
        let chart_players = players;
        //add a round 0 with points 0 to the score array
        for (let i = 0; i < players.length; i++) {
            score[0].push(0);
        }

        $("#icon_chart").removeClass("hidden");
        $("#chart").remove();
        $("#chart_container").append('<canvas id="chart"></canvas>');
        let ctx = document.getElementById("chart").getContext("2d");
        //destroy the chart
        score_chart?.destroy();
        const scores = JSON.parse(game.score);
        //add a round 0 with points 0 to the beginning of the score array
        let zero_line = [];
        for (let i = 0; i < players.length; i++) {
            zero_line.push(0);
        }
        scores.unshift(zero_line);

        //chartjs config that displays the rounds on the x axis and the scores on the y axis while having a own line for each playe
        score_chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: scores.map((score, index) => index + 1),
                datasets: players.map((pplayer, index) => ({
                    label: pplayer,
                    data: scores.map((score) => score[index]),
                    borderColor: `hsl(${(index * 360) / players.length}, 100%, 50%)`,
                    fill: false,
                    cubicInterpolationMode: "monotone",
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    x: {
                        display: true,
                        title: {
                            display: true,
                            text: "Round",
                        },
                    },
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: "Points",
                        },
                    },
                },
                plugins: {
                    legend: {
                        labels: {
                            usePointStyle: true,
                        },
                    },
                },
            },
        });


        //Bar Graph
        let score_bar;
        $("#icon_bar").removeClass("hidden");
        $("#barchart").remove();
        $("#barchartcontainer").append('<canvas id="barchart"></canvas>');
        ctx = document.getElementById("barchart").getContext("2d");
        //destroy the chart
        score_bar?.destroy();

        //display the current round in the bar graph
        let round = game.round - 1;

        //get players
        //chartjs config that displays the rounds on the x axis and the scores on the y axis while having a own line for each playe
        score_bar = new Chart(ctx, {
            type: "bar",
            data: {
                labels: players,
                datasets: [
                    {
                        label: "Score",
                        data: scores[round - 1],
                        borderWidth: 1,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        display: true,
                        title: {
                            display: true,
                            text: "Points",
                        },
                        beginAtZero: true,
                    },
                },
            },
        });
    }

    if (game.step == "3") {
        $("#navtext").text("Save and Quit");

        podium(sorted_playerlist);
        confettilauncher();
        //bind onclick to launch confetti
        $("#questionbutton").on("click", () => {
            confettilauncher();
        });
        //remove onclick attribute
        $("#questionbutton").removeAttr("onclick");
        //change ? to an confetti emoji
        $("#questionbutton").text("🎉");
    }
}

let celebtime = 250;
function podium(sorted_playerlist) {
    add_podium(sorted_playerlist);

    //animate podium
    $(".js-podium").each(function () {
        var t = $(this);
        setTimeout(function () {
            t.addClass("is-visible");
            var h = t.data("height");
            t.find(".scoreboard__podium-base")
                .css("height", h)
                .addClass("is-expanding");
        }, celebtime);
        celebtime += 250;
    });
    add_bottomlist(sorted_playerlist);
}

function add_bottomlist(sorted_playerlist) {
    $("#scoreboard_items").empty();
    for (let i = 3; i < sorted_playerlist.length; i++) {
        $("#scoreboard_items").append(`
        <li class="scoreboard__item" id="item_${i}">
            <div class="scoreboard__title">${sorted_playerlist[i][0]}</div>
            <div class="scoreboard__numbers">
              <span class="js-number">${sorted_playerlist[i][1]}</span>
            </div>
            <div class="scoreboard__bar js-bar">
              <div class="scoreboard__bar-bar" id="bar_${i}"></div>
            </div>
        </li>`);
        $("#bar_" + i).css("width", (sorted_playerlist[i][1] / sorted_playerlist[2][1]) * 100 + "%");
        setTimeout(function () {
            $("#item_" + i).addClass("is-visible");
        }, celebtime);
    }


}


function add_podium(sorted_playerlist) {
    $("#scoreboard_podium").empty();
    append_graph(sorted_playerlist[1][3], sorted_playerlist[1][0], sorted_playerlist[1][1]);
    if (sorted_playerlist.length == 1) return;
    append_graph(sorted_playerlist[0][3], sorted_playerlist[0][0], sorted_playerlist[0][1]);
    if (sorted_playerlist.length == 2) return;
    append_graph(sorted_playerlist[2][3], sorted_playerlist[2][0], sorted_playerlist[2][1]);
}

function append_graph(place, name, score) {
    switch (place) {
        case 1:
            $("#scoreboard_podium").append(`
                <div class="scoreboard__podium js-podium" data-height="250">
                  <div class="scoreboard__podium-base scoreboard__podium-base--first">
                    <div class="scoreboard__podium-rank">1</div>
                  </div>
                  <div class="scoreboard__podium-number">
                    <p class="scoreboard__text">${name}</p>
                    <small><span class="js-podium-data"">${score}</span></small>
                  </div>
                </div>`);
            break;
        case 2:
            $("#scoreboard_podium").append(`
                <div class="scoreboard__podium js-podium" data-height="200">
                  <div class="scoreboard__podium-base scoreboard__podium-base--second">
                    <div class="scoreboard__podium-rank">2</div>
                  </div>
                  <div class="scoreboard__podium-number">
                    <p class="scoreboard__text">${name}</p>
                    <small><span class="js-podium-data">${score}</span></small>
                  </div>
                </div>`);
            break;
        case 3:
            $("#scoreboard_podium").append(`
                 <div class="scoreboard__podium js-podium" data-height="150">
                   <div class="scoreboard__podium-base scoreboard__podium-base--third">
                     <div class="scoreboard__podium-rank">3</div>
                   </div>
                   <div class="scoreboard__podium-number">
                     <p class="scoreboard__text">${name}</p>
                     <small><span class="js-podium-data">${score}</span></small>
                   </div>
                 </div>
               </div>`);
            break;
    }
}

var duration;
var end;

function confettilauncher() {
    //if confetti is already running then set end to now
    if (Date.now() < end) {
        end = Date.now();
        return;
    }
    duration = 20 * 1000;
    end = Date.now() + duration;
    confetticannon();
}

function confetticannon() {
    // launch a few confetti from the left edge
    if (window.innerWidth < 768) {
        confetti({
            particleCount: 2,
            angle: 60,
            spread: 60,
            origin: { x: 0 },
        });
        // and launch a few from the right edge
        confetti({
            particleCount: 2,
            angle: 120,
            spread: 60,
            origin: { x: 1 },
        });
    } else {
        // launch a few confetti from the left edge
        confetti({
            particleCount: 5,
            angle: 60,
            spread: 60,
            origin: { x: 0 },
        });
        // and launch a few from the right edge
        confetti({
            particleCount: 5,
            angle: 120,
            spread: 60,
            origin: { x: 1 },
        });
    }

    // keep going until we are out of time
    if (Date.now() < end) {
        requestAnimationFrame(confetticannon);
    }
}