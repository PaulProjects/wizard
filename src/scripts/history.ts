import { updatescore, score_switch_view } from "../scripts/score.ts";
import { gamedata } from "../scripts/gamedata.ts";

import confetti from "canvas-confetti";

let view = 0; //0 = overview ; 1 = details
// check if past_games exists in local storage if not return
let past_games = JSON.parse(localStorage.getItem("recent_games"));
if (past_games === null || past_games.length === 0) {
  location.href = "/";
}

//newest game first - time_started for backwards compatibility
past_games.sort((a, b) => {
  return b.time_started - a.time_started;
});

//create game objects from the games
let games: gamedata[] = [];
for (let i = 0; i < past_games.length; i++) {
  games[i] = gamedata.fromJson(past_games[i]);

  //check if it has a id else try to upload it
  if (!games[i].hasID()) {
    console.log("No id found, trying to upload");
    console.log(games[i]);
    /*
    $.post(
      "https://s.paulbertram.de/wizardshare.php",
      { game: JSON.stringify(games[i]) },
      function (data: string) {
        //add id info to the game
        games[i].setId(data);
        past_games[i] = games[i];
        localStorage.setItem("recent_games", JSON.stringify(past_games));
        console.log("Success uploading");
      }
    ).fail(function (jqXHR, textStatus, errorThrown) {
      // Fehlerbehandlung hier
      console.error("Error: " + textStatus, errorThrown);
    });
    */
  }

  let players = games[i].getPlayers();

  console.log("Game " + i + " " + games[i].getTimeStarted() + " " + games[i].getTimeEnded());
  let time_started = games[i].getTimeStarted();
  let time_ended = games[i].getTimeEnded();
  let time_diff = time_ended - time_started;
  let time_diff_minutes = Math.floor(time_diff / 60000);

  //Extract date from time_ended
  let date = new Date(time_started);
  let day = date.getDate();
  //write month as string
  let month = date.toLocaleString("default", { month: "short" });
  let year = date.getFullYear();
  let date_string = `${day}.${month}.${year}`;

  // Create game card using safe DOM manipulation
  const card = $(`<div class="card mt-10 bg-base-200 w-full" id="card${i}">
          <div class="w-full h-full">
            <span class="inline-block pl-3 pt-3"></span>
            <span class="float-right pr-3 pt-3"></span>
            <div class="card-body">
              <div class="overflow-x-auto">
                <table class="table">
                  <!-- head -->
                  <thead>
                    <tr>
                      <th>Position</th>
                      <th>Name</th>
                      <th>Points</th>
                    </tr>
                  </thead>
                  <tbody  id="table${i}">
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div class="card--hover">
              <a id="more${i}">Find out more</a>
          </div>
        </div>`);
  
  // Safely set the text content
  card.find('.inline-block').text(date_string);
  card.find('.float-right').text(time_diff_minutes + ' Minutes');
  
  $("#past_games").append(card);

  //add event listener to the more button
  $(`#more${i}`).on("click", function () {
    clicked_more(i);
  });

  $(`#card${i}`).on("click", function () {
    clicked_more(i);
  });

  let score = games[i].getScore();
  //extract last row of score
  let last_row = score[score.length - 1];
  //create a new array with the players and their points
  let p_s = [];
  for (let j = 0; j < players.length; j++) {
    p_s.push({
      name: players[j],
      points: last_row[j],
    });
  }

  //sort by points
  p_s.sort((a, b) => {
    return b.points - a.points;
  });

  //give them a position number, two players with the same points will have the same position
  for (let j = 0; j < p_s.length; j++) {
    if (j > 0) {
      if (p_s[j].points === p_s[j - 1].points) {
        p_s[j].position = p_s[j - 1].position;
      } else {
        p_s[j].position = j + 1;
      }
    } else {
      p_s[j].position = j + 1;
    }
  }

  // loop through players and add them to the table
  for (let j = 0; j < p_s.length; j++) {
    const row = $("<tr>");
    row.append($("<th>").text(p_s[j].position));
    row.append($("<td>").text(p_s[j].name));
    row.append($("<td>").text(p_s[j].points));
    $(`#table${i}`).append(row);
  }

  //add class="bg-base-200 to the first row"
  $(`#table${i} tr:first-child`).addClass("bg-info");
}

let Lgame: gamedata;
function clicked_more(i: number) {
  document.getElementById("nav_container").classList.remove("hidden");
  score_switch_view(4);
  view = 1;
  //hide past_games and remove hidden from score
  $("#past_games").addClass("hidden");
  $("#score").removeClass("hidden");
  //remove hidden from del_game
  $("#del_game").removeClass("hidden");
  $("#share_game").removeClass("hidden");
  $("#s_round").addClass("hidden");
  //get the game and store it in Lgame
  Lgame = games[i];
  Lgame.setStep(3);
  //add the id to the url
  history.replaceState({}, "", `?id=${Lgame.getID()}`);
  let players = Lgame.getPlayers();
  updatescore(players, Lgame);
  $("#share_game").attr("href", `${location.origin}/share?id=${Lgame.getID()}`);
}

// Tab switching is now handled in score.ts

//#endregion

$("#tlbtn").on("click", () => {
  if (view == 1) {
    document.getElementById("nav_container").classList.add("hidden");
    $("#score").addClass("hidden");
    $("#past_games").removeClass("hidden");
    $("#del_game").addClass("hidden");
    view = 0;

    confetti.reset();
    //remove the id from the url
    history.pushState({}, "", "/history/");
  } else {
    location.href = "/";
  }
});

//advances modal
$("#title").on("click", () => {
  (document.getElementById("modal_settings") as HTMLDialogElement).open = true;
});

$("#del_game").on("click", () => {
  let id = Lgame.getID();
  //remove all onclick attributes
  $("#rremovedata").removeAttr("onclick");
  //show modal_delete
  (document.getElementById("modal_delete") as HTMLDialogElement).open = true;
  //change text
  document.getElementById("modal_del_text").textContent =
    "Do you really want to delete this game?";
  document.getElementById("modal_del_infotext").textContent =
    "This will remove all stored data about this game permanently!";
  //add onclick to the button
  $("#rremovedata").on("click", () => {
    //delete the game from the local storage
    let index = past_games.findIndex((game) => game.id === id);
    past_games.splice(index, 1);
    localStorage.setItem("recent_games", JSON.stringify(past_games));
    //delete the game on the server
    $.ajax({
      url: `https://s.paulbertram.de/wizardshare.php?id=${Lgame.getID()}`,
      type: "DELETE",
      success: function () {
        console.log("Success deleting");
      },
    })
      .fail(function (jqXHR, textStatus, errorThrown) {
        // Fehlerbehandlung hier
        console.error("Error: " + textStatus, errorThrown);
      })
      .always(function () {
        location.reload();
      });
  });
});

$("#del_all").on("click", () => {
  //remove all onclick attributes
  $("#rremovedata").removeAttr("onclick");
  //show modal_delete
  (document.getElementById("modal_delete") as HTMLDialogElement).open = true;
  //change text
  document.getElementById("modal_del_text").textContent =
    "Do you really want to delete all data?";
  document.getElementById("modal_del_infotext").textContent =
    "This will remove all locally stored data about current and past games permanently!";
  //add onclick to the button
  $("#rremovedata").on("click", () => {
    localStorage.clear();
    location.reload();
  });
});

//get url params
const urlParams = new URLSearchParams(window.location.search);
const myParam = urlParams.get("id");
//open the game with the id
if (myParam) {
  for (let i = 0; i < past_games.length; i++) {
    if (past_games[i].id === myParam) {
      clicked_more(i);
    }
  }
}
