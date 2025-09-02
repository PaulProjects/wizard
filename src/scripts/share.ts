import { GameData as gamedata } from "./game/gamedata.ts";
import QRCode from "qrcode";
import { Logger } from "./logger.ts";

function error(error: any) {
	document.getElementById("loading").classList.add("hidden");
	document.getElementById("start").classList.add("hidden");
	document.getElementById("error").classList.remove("hidden");
	document.getElementById("errorcode").textContent = error;
}
function success(msg: string) {
	document.getElementById("loading").classList.add("hidden");
	document.getElementById("start").classList.add("hidden");
	document.getElementById("success_message").textContent =
		msg || "The game has been imported successfully.";
	document.getElementById("success").classList.remove("hidden");
}

function savegame(save_game: gamedata) {
	let gameid = save_game.getID();
	let found = false;
	//check if the game is already in the recent games
	for (let i = 0; i < recent_games.length; i++) {
		if (recent_games[i].id === gameid) {
			found = true;
			break;
		}
	}
	if (found) {
		Logger.info("Game already in recent games", { id: gameid });
		return;
	}
	recent_games.push(gamedata.toJsonObject(save_game));
	localStorage.setItem("recent_games", JSON.stringify(recent_games));
}

//read the game id from the url
const gameId = new URLSearchParams(window.location.search).get("id");

let recent_games = JSON.parse(localStorage.getItem("recent_games"));
if (recent_games === null) {
	recent_games = [];
}

if (gameId === null) {
	error("Not a valid link");
} else {
	const importIdElement = document.getElementById("import_id");
	if (importIdElement) {
		importIdElement.textContent = "Game id: " + gameId;
	}

	//import the game from this url: https://s.paulbertram.de/wizardshare.php?id=[gameid]
	const url = `https://s.paulbertram.de/wizardshare.php?id=${gameId}`;
	//use xml http request to import the game
	const xhr = new XMLHttpRequest();
	xhr.open("GET", url, true);
	xhr.onreadystatechange = function () {
		if (xhr.readyState === 4) {
			if (xhr.status === 210) {
				//loop over the response array and request the games and then add them to the recent games if they are not already in there
				let games = JSON.parse(xhr.responseText);
				Logger.info("Importing multiple games", {
					count: games.length,
				});
				for (let i = 0; i < games.length; i++) {
					let gameid = games[i];
					const url = `https://s.paulbertram.de/wizardshare.php?id=${gameid}`;
					const xhr = new XMLHttpRequest();
					xhr.open("GET", url, true);
					xhr.onreadystatechange = function () {
						if (xhr.readyState === 4) {
							if (xhr.status === 200) {
								Logger.info("Importing game", { id: gameid });
								//get the game from localstorage
								try {
									let imported_game = gamedata.fromJson(
										JSON.parse(xhr.responseText)
									);
									imported_game.setId(gameid);
									savegame(imported_game);
								} catch (error) {
									Logger.error("Failed to import game", {
										id: gameid,
										error: (error as Error)?.message,
										response: xhr.responseText,
									});
									//window.location.href = "/";
								}
							} else {
								error(xhr.status);
							}
						}
					};
					xhr.send();
				}
				success("All games have been imported successfully");
			} else if (xhr.status === 200) {
				const loadingElement = document.getElementById("loading");
				const startElement = document.getElementById("start");
				if (loadingElement) loadingElement.classList.add("hidden");
				if (startElement) startElement.classList.remove("hidden");
				try {
					let gamejson = JSON.parse(xhr.responseText);
					gamejson.id = gameId;
					let game = gamedata.fromJson(gamejson);

					Logger.debug("Imported game json", { game });

					let players = game.getPlayers();

					let time_started = game.getTimeStarted();
					Logger.debug("Game time started", { time_started });
					let time_ended = game.getTimeEnded();
					Logger.debug("Game time ended", { time_ended });
					let time_diff = time_ended - time_started;
					let time_diff_minutes = Math.floor(time_diff / 60000);

					//Extract date from time_ended
					let date = new Date(time_ended);
					let day = date.getDate();
					//write month as string
					let month = date.toLocaleString("default", {
						month: "short",
					});
					let year = date.getFullYear();
					let date_string = `${day}.${month}.${year}`;

					const dateElement = document.getElementById("date");
					const durationElement = document.getElementById("duration");
					if (dateElement) dateElement.textContent = date_string;
					if (durationElement)
						durationElement.textContent =
							time_diff_minutes + " Minutes";

					let score = game.getScore();
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
					const importTable = document.getElementById("import_table");
					for (let j = 0; j < p_s.length; j++) {
						const row = document.createElement("tr");

						const positionCell = document.createElement("th");
						positionCell.textContent = p_s[j].position.toString();
						row.appendChild(positionCell);

						const nameCell = document.createElement("td");
						nameCell.textContent = p_s[j].name;
						row.appendChild(nameCell);

						const pointsCell = document.createElement("td");
						pointsCell.textContent = p_s[j].points.toString();
						row.appendChild(pointsCell);

						if (importTable) importTable.appendChild(row);
					}

					//add class="bg-info" to the first row
					if (importTable) {
						const firstRow =
							importTable.querySelector("tr:first-child");
						if (firstRow) firstRow.classList.add("bg-info");
					}

					const importGameButton =
						document.getElementById("import-game");
					if (importGameButton) {
						importGameButton.addEventListener("click", function () {
							savegame(game);

							const viewGameLink = document.getElementById(
								"view_game"
							) as HTMLAnchorElement;
							if (viewGameLink)
								viewGameLink.href = "/history?id=" + gameId;
							success("The game has been imported successfully");
						});
					}
				} catch (e) {
					error("Invalid game data" + e);
				}
			} else {
				error(xhr.status);
			}
		}
	};
	xhr.send();

	QRCode.toCanvas(document.getElementById("qr_canvas"), window.location.href)
		.then((url) => {
			Logger.debug("QR generated");
		})
		.catch((err) => {
			Logger.error("QR generation failed", { error: err?.message });
		});

	document.getElementById("copy-url").addEventListener("click", function () {
		navigator.clipboard.writeText(window.location.href);
	});
}
