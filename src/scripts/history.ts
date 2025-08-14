import { updatescore, score_switch_view } from "./score.ts";
import { GameData as gamedata } from "./game/gamedata.ts";

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
let skippedGames: any[] = [];

for (let i = 0; i < past_games.length; i++) {
  try {
    const game = gamedata.fromJson(past_games[i]);

    //check if it has a id else try to upload it
    if (!game.hasID()) {
      console.log("No id found, trying to upload");
      console.log(game);
      $.post(
        "https://s.paulbertram.de/wizardshare.php",
        { game: JSON.stringify(game) },
        function (data: string) {
          //add id info to the game
          game.setId(data);
          past_games[i] = game;
          localStorage.setItem("recent_games", JSON.stringify(past_games));
          console.log("Success uploading");
        }
      ).fail(function (jqXHR, textStatus, errorThrown) {
        // Fehlerbehandlung hier
        console.error("Error: " + textStatus, errorThrown);
      });
    }

    // Only add successfully loaded games to the games array
    games.push(game);
    
    let players = game.getPlayers();

    let time_started = game.getTimeStarted();
    let time_ended = game.getTimeEnded();
    let time_diff = time_ended - time_started;
    let time_diff_minutes = Math.floor(time_diff / 60000);

    //Extract date from time_ended
    let date = new Date(time_started);
    let day = date.getDate();
    //write month as string
    let month = date.toLocaleString("default", { month: "short" });
    let year = date.getFullYear();
    let date_string = `${day}.${month}.${year}`;

    // Use the game index in the games array (not the original past_games index)
    const gameIndex = games.length - 1;

    // Create game card using safe DOM manipulation
    const card = $(`<div class="card mt-10 bg-base-200 w-full" id="card${gameIndex}">
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
                    <tbody  id="table${gameIndex}">
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
            <div class="card--hover">
                <a id="more${gameIndex}">Find out more</a>
            </div>
          </div>`);
    
    // Safely set the text content
    card.find('.inline-block').text(date_string);
    card.find('.float-right').text(time_diff_minutes + ' Minutes');
    
    $("#past_games").append(card);

    //add event listener to the more button
    $(`#more${gameIndex}`).on("click", function () {
      clicked_more(gameIndex);
    });

    $(`#card${gameIndex}`).on("click", function () {
      clicked_more(gameIndex);
    });

    let score = game.getScore();
      //extract last row of score
    let last_row = score[score.length - 1];
    //create a new array with the players and their points
    let p_s = [];
    for (let j = 0; j < players.length; j++) {
      p_s.push({ name: players[j], points: last_row[j], position: 1 });
    }

    //sort the array by points descending
    p_s.sort((a, b) => b.points - a.points);

    // Determine positions (handling ties)
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
      $(`#table${gameIndex}`).append(row);
    }

    //add class="bg-base-200 to the first row"
    $(`#table${gameIndex} tr:first-child`).addClass("bg-info");
    
  } catch (error) {
    console.error(`Failed to load game at index ${i}:`, {
      error: error.message,
      gameData: past_games[i],
      gameId: past_games[i]?.id || 'unknown',
      gameMetadata: {
        id: past_games[i]?.id,
        players: past_games[i]?.players,
        timeStarted: past_games[i]?.time_started,
        round: past_games[i]?.round
      }
    });
    
    // Store the broken game for potential recovery
    skippedGames.push({
      index: i,
      data: past_games[i],
      error: error.message
    });
    
    // Continue with next game instead of breaking the entire page
    continue;
  }
}

// Log information about skipped games
if (skippedGames.length > 0) {
  console.warn(`Skipped ${skippedGames.length} corrupted games:`, skippedGames);
  
  // Optional: Show user notification about skipped games
  const notification = $(`
    <div class="alert alert-warning mt-4">
      <div>
        <svg xmlns="http://www.w3.org/2000/svg" class="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-2.186-.833-2.956 0L3.858 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
        <span>Warning: ${skippedGames.length} corrupted game(s) were skipped and not displayed. Check the console for details.</span>
      </div>
    </div>
  `);
  $("#past_games").prepend(notification);
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
  updatescore(players, Lgame as any);
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
  // Find the game in the successfully loaded games array
  for (let i = 0; i < games.length; i++) {
    if (games[i].getID() === myParam) {
      clicked_more(i);
      break;
    }
  }
}
