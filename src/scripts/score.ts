import type { gamedata } from "./gamedata";
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

import confetti from 'canvas-confetti';

var sections = [
    "graph",
    "table",
    "top_players",
    "celebration",
    "bar_graph",
    "analytics",
];
var icons = [
    "icon_chart",
    "icon_table",
    "icon_top",
    "icon_celeb",
    "icon_bar",
    "icon_analytics",
];
export function score_switch_view(x: number): void {
    let edit = window.editmode;
    if (edit == null) var editmode = false;
    if (edit == true) location.reload();
    for (var i = 0; i < sections.length; i++) {
        if (i == x - 1) {
            $("#" + sections[i]).removeClass("hidden");
            $("#" + icons[i]).addClass("icon_underline");
        } else {
            $("#" + sections[i]).addClass("hidden");
            $("#" + icons[i]).removeClass("icon_underline");
        }
    }
};

export function updatescore(players: any, game: gamedata) {
    // Data
    const bets = [...game.getBets()];
    const gameScore = [...game.getScore()];
    let playerlist = [];
    let sorted_playerlist = [];
    // Array Structure
    // 0 -> Name
    // 1 -> Score
    // 2 -> Bet
    // 3 -> Place
    // 4 -> Dealer?
    // 5 -> Name without decoration

    //sorting the players by score
    //Give the players a crown if they are first
    if (game.getRound() > 1) {
        for (let i = 0; i < players.length; i++) {
            playerlist[i] = [players[i], gameScore[gameScore.length - 1][i]];
            sorted_playerlist[i] = [
                players[i],
                gameScore[gameScore.length - 1][i],
                bets[bets.length - 1][i],
                ,
                ,
                players[i],
            ];
        }
        for (let i = 0; i < playerlist.length; i++) {
            if (i == game.getDealer()) {
                playerlist[i][2] = 1;
                sorted_playerlist[i][4] = 1;
            } else {
                playerlist[i][2] = 0;
                sorted_playerlist[i][4] = 0;
            }
        }
        sorted_playerlist.sort(function (a, b) {
            return b[1] - a[1];
        });
    } else {
        for (let i = 0; i < players.length; i++) {
            playerlist[i] = [players[i], 0];
            if (bets.length == 0) {
                sorted_playerlist[i] = [players[i], 0, 0, , , players[i]];
            } else {
                sorted_playerlist[i] = [players[i], 0, bets[bets.length - 1][i], , , players[i]];
            }
            if (i == game.getDealer()) {
                playerlist[i][2] = 1;
                sorted_playerlist[i][4] = 1;
            } else {
                playerlist[i][2] = 0;
                sorted_playerlist[i][4] = 0;
            }
        }
    }
    let max = sorted_playerlist[0][1];
    let currentPlace = 1;
    let lastScore = sorted_playerlist[0][1];
    for (let i = 0; i < sorted_playerlist.length; i++) {
        if (sorted_playerlist[i][1] == max)
            sorted_playerlist[i][0] = sorted_playerlist[i][0] + " 👑";
        if (sorted_playerlist[i][1] != lastScore) currentPlace = i + 1;
        sorted_playerlist[i][0] = currentPlace + ". " + sorted_playerlist[i][0];
        sorted_playerlist[i][3] = currentPlace;
        lastScore = sorted_playerlist[i][1];
    }
    for (let i = 0; i < playerlist.length; i++) {
        if (playerlist[i][1] == max) playerlist[i][0] = playerlist[i][0] + " 👑";
    }

    //Views
    $("#top_players").empty();
    $("#names").empty();
    $("#rows").empty();

    //Top Players list
    for (let i = 0; i < sorted_playerlist.length; i++) {
        $("#top_players").append(
            /*html*/`<div class="min-w-72 w-screen max-w-full bg-neutral rounded-md p-4 mx-4 transition-all border-2 border-neutral duration-300 hover:-translate-y-2 hover:border-secondary relative" id="top_players_${i}">
                <div class="w-full justify-between items-center gap-16 inline-flex">
                    <h1 class="text-4xl font-medium ${sorted_playerlist[i][4] == 1 ? "text-secondary" : ""}" id="top_players_${i}">${sorted_playerlist[i][0]}</h1>
                </div>
                <div class="w-full h-9 justify-between items-center inline-flex mb-4 mt-3">
                    <div class="w-10 self-stretch">
                            <h3 class="text-2xl">${sorted_playerlist[i][1]}</h3>
                            <p class="font-light text-sm">Score<p>
                    </div>
                    ${game.getStep() === 2 ?
            /*html*/`<div class="w-10 self-stretch">
                        <h3 class="text-2xl">${sorted_playerlist[i][2]}</h3>
                        <p class="font-light text-sm">Bet<p>
                    </div>`
                : ""}  
                </div>
            </div>`
        );
    }
    $("#names").append(`<th>Round</th>`);
    for (let index = 0; index < playerlist.length; index++) {
        if (playerlist[index][2] == 1)
            $("#names").append(
                `<th> <span class="badge badge-secondary" id="n_${index}">${playerlist[index][0]}</span></th><th>   </th>`,
            );
        else
            $("#names").append(
                `<th id="n_${index}">${playerlist[index][0]}</th><th>   </th>`,
            );
    }
    for (let i = 0; i < game.getRound(); i++) {
        $("#rows").append(`<tr id="row${i}"></tr>`);
        $(`#row${i}`).append(`<td id="row${i}num">${i + 1}</td>`);
        if (game.getColor() != null) if (game.getColor()[i + 1] != null) $("#row" + i + "num").addClass(game.getColor()[i + 1] + "_tag");
        for (let j = 0; j < playerlist.length; j++) {
            try {
                $(`#row${i}`).append(`<td id="std${i}${j}" round="${i}" player="${j}">${gameScore[i][j]}</td>`);
            } catch {
                $(`#row${i}`).append(`<td></td>`);
            }
            try {
                $(`#row${i}`).append(`<td id="btd${i}${j}" round="${i}" player="${j}">${bets[i][j]}</td>`);
            } catch {
                $(`#row${i}`).append(`<td></td>`);
            }
        }
    }
    $("#rows tr:last-child").addClass("bg-base-200");

    if (game.getRound() == 1 || game.getRound() == 2) {
        $("#icon_chart").addClass("hidden");
        $("#icon_bar").addClass("hidden");
        $("#icon_analytics").addClass("hidden");
    } else {
        //Graph
        let score_chart;

        $("#icon_chart").removeClass("hidden");
        $("#chart").remove();
        $("#chart_container").append('<canvas id="chart"></canvas>');
        let ctx: CanvasRenderingContext2D = (document.getElementById("chart") as HTMLCanvasElement).getContext("2d");
        score_chart?.destroy();

        let graph_score = [...game.getScore()];
        let zero_line: number[] = [];
        for (let i = 0; i < players.length; i++) {
            zero_line.push(0);
        }
        graph_score.unshift(zero_line);

        //chartjs config that displays the rounds on the x axis and the scores on the y axis while having a own line for each playe
        score_chart = new Chart(ctx, {
            type: "line",
            data: {
                labels: graph_score.map((graph_score, index) => index + 1),
                datasets: players.map((pplayer, index) => ({
                    label: pplayer,
                    data: graph_score.map((graph_score) => graph_score[index]),
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
        ctx = (document.getElementById("barchart") as HTMLCanvasElement).getContext("2d");
        score_bar?.destroy();
        let round = game.getRound() - 1;
        score_bar = new Chart(ctx, {
            type: "bar",
            data: {
                labels: players,
                datasets: [
                    {
                        label: "Score",
                        data: graph_score[round],
                        borderWidth: 1,
                        backgroundColor: [
                            'rgba(88.069, 198.45, 243.57, 0.1)',
                        ],
                        borderColor: [
                            '#58C6F4',
                        ],
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

        //Analytics
        $("#icon_analytics").removeClass("hidden");
        //analyze the score_change and save the highest and lowest score
        let score_change = game.getScoreChange();
        let score_change_max_points = 0;
        let score_change_max_round = 0;
        let score_change_max_index = 0;
        let score_change_max_bet;
        let score_change_max_tricks;
        let score_change_min_points = 1000;
        let score_change_min_round = 1000;
        let score_change_min_index = 1000;
        let score_change_min_bet;
        let score_change_min_tricks;

        for (let i = 0; i < score_change.length; i++) {
            for (let j = 0; j < score_change[i].length; j++) {
                if (score_change[i][j] > score_change_max_points) {
                    score_change_max_points = score_change[i][j];
                    score_change_max_round = i;
                    score_change_max_index = j;
                }
                if (score_change[i][j] < score_change_min_points) {
                    score_change_min_points = score_change[i][j];
                    score_change_min_round = i;
                    score_change_min_index = j;
                }
            }
        }
        //get the bets and tricks
        let tricks = game.getTricks();
        let bets = game.getBets();
        //get the highest and lowest bet and tricks
        score_change_max_bet =
            bets[score_change_max_round][score_change_max_index];
        score_change_max_tricks =
            tricks[score_change_max_round][score_change_max_index];
        score_change_min_bet =
            bets[score_change_min_round][score_change_min_index];
        score_change_min_tricks =
            tricks[score_change_min_round][score_change_min_index];

        //remove the minus sign from the lowest score
        score_change_min_points = score_change_min_points * -1;

        //display the highest and lowest score in the analytics
        $("#best_bet_name").text(players[score_change_max_index]);
        $("#best_bet_desc").text(
            "Made " +
            score_change_max_points +
            " points in round " +
            (score_change_max_round + 1) +
            " with a bet of " +
            score_change_max_bet +
            " and " +
            score_change_max_tricks +
            " tricks",
        );
        $("#worst_bet_name").text(players[score_change_min_index]);
        $("#worst_bet_desc").text(
            "Lost " +
            score_change_min_points +
            " points in round " +
            (score_change_min_round + 1) +
            " with a bet of " +
            score_change_min_bet +
            " and " +
            score_change_min_tricks +
            " tricks",
        );

        //loop over players
        $("#player_stats").empty();
        for (let i = 0; i < playerlist.length; i++) {
            //calculate the bet accuracy
            let bet_accuracy = 0;
            let bet_accuracy_rounds = 0;
            let total_bet_difference = 0; // total difference between bets and actual results
            let average_bet = 0;
            let average_bet_rounds = 0;
            for (let j = 0; j < bets.length; j++) {
                average_bet = Number(average_bet) + Number(bets[j][i]);
                average_bet_rounds++;
                if (tricks.length > j) {
                    if (bets[j][i] == tricks[j][i]) {
                        bet_accuracy++;
                    }
                    bet_accuracy_rounds++;
                    total_bet_difference += bets[j][i] - tricks[j][i]; // calculate the difference for each round
                }
            }
            bet_accuracy = (bet_accuracy / bet_accuracy_rounds) * 100;
            bet_accuracy = Math.round(bet_accuracy);

            //calculate the average bet difference
            let average_bet_difference = total_bet_difference / bet_accuracy_rounds;
            //round the average bet difference to 2 decimals
            average_bet_difference = Math.round(average_bet_difference * 100) / 100;

            let average_difference_value;
            let average_difference_desc;
            //text for the average bet difference
            if (average_bet_difference > 0) {
                average_difference_value = "too high";
                average_difference_desc =
                    "bets on average " + average_bet_difference + " too high";
            } else if (average_bet_difference < 0) {
                average_difference_value = "too low";
                average_difference_desc =
                    "bets on average " + average_bet_difference * -1 + " too low";
            } else {
                average_difference_value = "correct";
                average_difference_desc = "bets on average correct";
            }

            //average bet
            average_bet = average_bet / bets.length;
            //round the average bet to 2 decimals
            average_bet = Math.round(average_bet * 100) / 100;

            $("#player_stats").append(`
      <div class="pb-5">
        <h2 class="pt-10 text-3xl">${playerlist[i][0]}</h2>
      </div>
      <div class="stats stats-vertical sm:stats-horizontal shadow w-full">
        <div class="stat mx-auto w-60">
          <div class="stat-figure text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="white"
              viewBox="0 0 24 24"
              class="inline-block w-8 h-8"
              ><path
                d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12C22,10.84 21.79,9.69 21.39,8.61L19.79,10.21C19.93,10.8 20,11.4 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4C12.6,4 13.2,4.07 13.79,4.21L15.4,2.6C14.31,2.21 13.16,2 12,2M19,2L15,6V7.5L12.45,10.05C12.3,10 12.15,10 12,10A2,2 0 0,0 10,12A2,2 0 0,0 12,14A2,2 0 0,0 14,12C14,11.85 14,11.7 13.95,11.55L16.5,9H18L22,5H19V2M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12H16A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8V6Z"
              ></path></svg
            >
          </div>
          <div class="stat-value">${bet_accuracy}%</div>
          <div class="stat-title">Bet accuarcy</div>
        </div>
        
        <div class="stat mx-auto w-60">
          <div class="stat-figure text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="#d97fbe"
              viewBox="0 0 24 24"
              class="inline-block w-8 h-8 fill-current"
              ><path
                d="M12,14A2,2 0 0,1 14,16A2,2 0 0,1 12,18A2,2 0 0,1 10,16A2,2 0 0,1 12,14M23.46,8.86L21.87,15.75L15,14.16L18.8,11.78C17.39,9.5 14.87,8 12,8C8.05,8 4.77,10.86 4.12,14.63L2.15,14.28C2.96,9.58 7.06,6 12,6C15.58,6 18.73,7.89 20.5,10.72L23.46,8.86Z"
              ></path></svg
            >
          </div>
          <div class="stat-value text-primary" style="color:#d97fbe;">${average_difference_value}</div>
          <div class="stat-desc">${average_difference_desc}</div>
        </div>
        
        <div class="stat mx-auto w-60">
          <div class="stat-figure text-secondary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="#76c4ee"
              class="inline-block w-8 h-8 fill-current"
              ><path
                d="M18.5,3.5L3.5,18.5L5.5,20.5L20.5,5.5M7,4A3,3 0 0,0 4,7A3,3 0 0,0 7,10A3,3 0 0,0 10,7A3,3 0 0,0 7,4M17,14A3,3 0 0,0 14,17A3,3 0 0,0 17,20A3,3 0 0,0 20,17A3,3 0 0,0 17,14Z"
              ></path></svg
            >
          </div>
          <div class="stat-value text-secondary">${average_bet}</div>
          <div class="stat-desc">Average Bet</div>
        </div>
        </div>
        </div>`);
        }
    }

    if (game.getStep() == 3) {
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
};

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
        $("#bar_" + i).css(
            "width",
            (sorted_playerlist[i][1] / sorted_playerlist[2][1]) * 100 + "%",
        );
        setTimeout(function () {
            $("#item_" + i).addClass("is-visible");
        }, celebtime);
    }
}

function add_podium(sorted_playerlist) {
    $("#scoreboard_podium").empty();
    append_graph(
        sorted_playerlist[1][3],
        sorted_playerlist[1][0],
        sorted_playerlist[1][1],
    );
    if (sorted_playerlist.length == 1) return;
    append_graph(
        sorted_playerlist[0][3],
        sorted_playerlist[0][0],
        sorted_playerlist[0][1],
    );
    if (sorted_playerlist.length == 2) return;
    append_graph(
        sorted_playerlist[2][3],
        sorted_playerlist[2][0],
        sorted_playerlist[2][1],
    );
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