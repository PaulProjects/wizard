import Sortable from "sortablejs";

// Global state
let crowd_chaos = false;
let valid_1 = false;
let valid_2 = true;

// Cached DOM selectors
const playerlist = document.getElementById("playerlist") as HTMLElement;
const showmodal = document.getElementById("showmodal") as HTMLButtonElement;
const startButton = document.getElementById("start_button") as HTMLButtonElement;
const alertPlayers = document.getElementById("alert_players") as HTMLElement;
const alertInvalidPlayers = document.getElementById("alert_invalidplayers") as HTMLElement;
const rangeContainer = document.getElementById("range_container") as HTMLElement;

// Initialize
alertInvalidPlayers.style.display = "none";
Sortable.create(document.getElementById("playerlist"));

if (!localStorage.getItem("playerlist")) {
	localStorage.setItem("playerlist", JSON.stringify([]));
}

// Initialize range container visibility
const roundsAuto = document.getElementById("rounds_auto") as HTMLInputElement;
if (roundsAuto?.checked) {
	rangeContainer.style.display = "none";
	rangeContainer.classList.add("opacity-0");
}

// Event handlers
document.getElementById("showmodal").addEventListener("click", function () {
	document.getElementById("input_playername").focus();
	populateRecentPlayers();
});

function populateRecentPlayers() {
	const recent_players = JSON.parse(localStorage.getItem("playerlist")) || [];
	const recentPlayersContainer = document.getElementById("recent_players");
	recentPlayersContainer.innerHTML = "";

	recent_players.slice(0, 10).forEach((player, i) => {
		const playerInputs = Array.from(playerlist.querySelectorAll<HTMLInputElement>(".player-name"));
		const playerExists = playerInputs.some(input => input.value === player);

		if (!playerExists) {
			const button = document.createElement("button");
			button.className = "btn btn-sm btn-secondary m-1";
			button.textContent = player;
			button.addEventListener("click", () => addPlayer(player));
			recentPlayersContainer.appendChild(button);
		}
	});
}

const ruleCrowdChaos = document.getElementById("rule_crowdchaos") as HTMLInputElement;
ruleCrowdChaos.addEventListener("click", function () {
	crowd_chaos = this.checked;
	const alertPlayersText = document.getElementById("alert_players_text");
	alertPlayersText.textContent = `Please add at least ${crowd_chaos ? 2 : 3} players`;

	if (crowd_chaos) {
		showmodal.disabled = false;
		showmodal.textContent = "New Player";
	}
	checkPlayers();
});

//function user presses enter
document.addEventListener("keyup", function (event) {
	if (event.which === 13) {
		const inputPlayername = document.getElementById("input_playername") as HTMLInputElement;
		addPlayer(inputPlayername.value);
		//open the modal again and focus the input field
		(
			document.getElementById("modal_addplayer") as HTMLDialogElement
		).showModal();
		inputPlayername.focus();
	}
});

//method to add a new player
document.getElementById("addPlayer").addEventListener("click", function () {
	const inputPlayername = document.getElementById("input_playername") as HTMLInputElement;
	addPlayer(inputPlayername.value);
});

document.addEventListener("click", function(event) {
	if ((event.target as HTMLElement).id === "ok_invalidplayer") {
		(
			document.getElementById("modal_addplayer") as HTMLDialogElement
		).showModal();
	}
});

//validate the playername on edit of the input field with the class player-name
document.addEventListener("input", function(event) {
	const target = event.target as HTMLInputElement;
	if (target.classList.contains("player-name")) {
		const playerName = target.value.trim();
		const parentDiv = target.parentElement;
		const isValid = validatename(playerName);

		alertInvalidPlayers.style.display = isValid ? "none" : "block";
		valid_2 = isValid;
		checkValid();

		// Apply styling based on validation
		if (isValid) {
			parentDiv.classList.remove("input-error");
			parentDiv.classList.add("input-secondary");
		} else {
			parentDiv.classList.add("input-error");
			parentDiv.classList.remove("input-secondary");
		}
	}
});

//method when player clicks any checkbox with the class dealer-checkbox
document.addEventListener("click", function(event) {
	const target = event.target as HTMLInputElement;
	if (target.classList.contains("dealer-checkbox")) {
		//uncheck all other checkboxes
		const allDealerCheckboxes = document.querySelectorAll<HTMLInputElement>(".dealer-checkbox");
		allDealerCheckboxes.forEach(checkbox => {
			if (checkbox !== target) {
				checkbox.checked = false;
			}
		});
		//check if the checkbox itself got unchecked and if so prevent that
		if (!target.checked) {
			target.checked = true;
		}
	}
});

//when user clicks on the remove button
document.addEventListener("click", function(event) {
	const target = event.target as HTMLElement;
	if (target.classList.contains("remove-player")) {
		const parent = target.parentElement;
		const dealerCheckbox = parent.querySelector<HTMLInputElement>(".dealer-checkbox");
		const wasDealer = dealerCheckbox?.checked || false;

		parent.remove();

		// If removed player was dealer, make first remaining player dealer
		const remainingPlayers = playerlist.children;
		if (wasDealer && remainingPlayers.length > 0) {
			const firstPlayerDealer = remainingPlayers[0].querySelector<HTMLInputElement>(".dealer-checkbox");
			if (firstPlayerDealer) {
				firstPlayerDealer.checked = true;
			}
		}

		// Re-enable add button if under limit
		if (remainingPlayers.length < 6) {
			showmodal.disabled = false;
			showmodal.textContent = "New Player";
		}
		checkPlayers();
	}
});
//if Checkbox with id Random_Dealer is active hide all checkboxes with the class dealer-checkbox
const ruleRandomDealer = document.getElementById("rule_random_dealer") as HTMLInputElement;
ruleRandomDealer.addEventListener("click", function () {
	const dealerCheckboxes = document.querySelectorAll<HTMLInputElement>(".dealer-checkbox");
	dealerCheckboxes.forEach(checkbox => {
		checkbox.style.display = this.checked ? "none" : "";
	});
});

//listen for click on all divs with the class optionbox
document.addEventListener("click", function(event) {
	const target = event.target as HTMLElement;
	if (target.classList.contains("optionbox")) {
		//check if the user clicked on the checkbox itself
		if ((event.target as HTMLElement).tagName === "INPUT" && (event.target as HTMLInputElement).type === "checkbox") {
			return;
		}
		//get the checkbox inside the div
		let checkbox = target.querySelector<HTMLInputElement>("input[type='checkbox']");
		//trigger a click on the checkbox
		checkbox?.click();
	}
});

//start button with id start_button
startButton.addEventListener("click", function () {
	startButton.classList.add("loading");
	startButton.classList.add("loading-spinner");

	let players = [];
	const playerElements = playerlist.children;
	for (let i = 0; i < playerElements.length; i++) {
		const playerNameInput = playerElements[i].querySelector<HTMLInputElement>(".player-name");
		if (playerNameInput) {
			players.push(playerNameInput.value);
		}
	}

	//push the playerlist to localstorage
	let playerlistStorage = JSON.parse(localStorage.getItem("playerlist"));
	playerlistStorage.push(...players);
	//remove any duplicates
	playerlistStorage = [...new Set(playerlistStorage)];
	localStorage.setItem("playerlist", JSON.stringify(playerlistStorage));

	let dealer = 0;
	//find out which player is the dealer
	const ruleRandomDealerEl = document.getElementById("rule_random_dealer") as HTMLInputElement;
	if (ruleRandomDealerEl.checked) {
		dealer = Math.floor(Math.random() * players.length);
	} else {
		for (let i = 0; i < playerElements.length; i++) {
			const dealerCheckbox = playerElements[i].querySelector<HTMLInputElement>(".dealer-checkbox");
			if (dealerCheckbox?.checked) {
				break;
			}
			dealer++;
		}
	}

	let round_amount: number;
	const roundsCustom = document.getElementById("rounds_custom") as HTMLInputElement;
	if (roundsCustom.checked) {
		const roundsCustomRange = document.getElementById("rounds_custom_range") as HTMLInputElement;
		round_amount = parseInt(roundsCustomRange.value);
	} else {
		round_amount = amountofrounds(players.length);
	}
	//create a json array with the game settings
	let game = {
		dealer: dealer,
		rule_1: (document.getElementById("rule_1") as HTMLInputElement).checked,
		rule_random_dealer: (document.getElementById("rule_random_dealer") as HTMLInputElement).checked,
		rule_expansion: (document.getElementById("rule_expansion") as HTMLInputElement).checked,
		rule_custom_rounds: (document.getElementById("rounds_custom") as HTMLInputElement).checked,
		rule_crowdchaos: (document.getElementById("rule_crowdchaos") as HTMLInputElement).checked,
		rule_altcount: (document.getElementById("calc_alt") as HTMLInputElement).checked,
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

const tlBtn = document.getElementById("tlbtn");
tlBtn.addEventListener("click", function () {
	location.href = "/";
});

let modal_edit = document.getElementById("modal_edit") as HTMLDialogElement;
//get the presets from localstorage
let past_games = JSON.parse(localStorage.getItem("recent_games"));

//check if presets is null or the array is empty
if (past_games == null || past_games.length == 0) {
	//add a disabled "no presets yet" button to the presets div
	const presetsContainer = document.getElementById("presets");
	presetsContainer.innerHTML = `<button class='btn btn-block btn-disabled m-2' id='preset0'>no past games found</button>`;
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
			const presetDiv = document.createElement("div");
			presetDiv.id = `preset${i}`;
			presetDiv.className = "flex flex-col p-5 border-2 rounded border-white w-full hover:bg-sky-700";
			presetDiv.innerHTML = `
          <span></span>
          <div class='flex flex-col w-full'>
            <div class='flex flex-row w-full'>
              <div class='flex flex-col w-full'>
                <div class='flex flex-row w-full overflow-auto' style='white-space: nowrap;'></div>
              </div>
            </div>
          </div>`;

			// Safely set the date
			const spanElement = presetDiv.querySelector("span");
			spanElement.textContent = new Date(game.time_started).toLocaleString();

			// Safely add player names
			const playerContainer = presetDiv.querySelector(".overflow-auto");
			players.forEach((player: string, index: number) => {
				const playerSpan = document.createElement("span");
				playerSpan.className = "mr-1 ml-1";
				playerSpan.textContent = player;
				playerContainer.appendChild(playerSpan);
				if (index < players.length - 1) {
					playerContainer.appendChild(document.createTextNode("&"));
				}
			});

			const presetsContainer = document.getElementById("presets");
			presetsContainer.appendChild(presetDiv);

			//add a click event to the button that loads the preset
			presetDiv.addEventListener("click", function () {
				//clear playerlist and add the preset players
				playerlist.innerHTML = "";

				//loop over players and add them
				players.forEach((player) => addPlayer(player));

				// Set rule checkboxes using a more concise approach
				const ruleSettings = [
					{ selector: "#rule_1", value: rule_1 },
					{
						selector: "#rule_random_dealer",
						value: rule_random_dealer,
					},
					{ selector: "#rule_expansion", value: rule_expansion },
					{ selector: "#rule_crowdchaos", value: rule_crowdchaos },
					{
						selector: rule_altcount ? "#calc_alt" : "#calc_classic",
						value: true,
					},
				];

				ruleSettings.forEach(({ selector, value }) => {
					const element = document.querySelector(selector) as HTMLInputElement;
					if (element) element.checked = value;
				});

				if (!rule_altcount) {
					const calcClassic = document.getElementById("calc_classic") as HTMLInputElement;
					calcClassic.checked = true;
				}

				if (rule_custom_rounds) {
					const roundsCustom = document.getElementById("rounds_custom") as HTMLInputElement;
					const roundsAuto = document.getElementById("rounds_auto") as HTMLInputElement;
					const roundsCustomRange = document.getElementById("rounds_custom_range") as HTMLInputElement;
					const rangeVal = document.getElementById("range_val") as HTMLInputElement;
					
					roundsCustom.checked = true;
					roundsAuto.checked = false;
					rangeContainer.style.display = "block";
					rangeContainer.classList.remove("opacity-0");
					roundsCustomRange.value = max_rounds.toString();
					rangeVal.textContent = max_rounds.toString();
				} else {
					const roundsCustom = document.getElementById("rounds_custom") as HTMLInputElement;
					const roundsAuto = document.getElementById("rounds_auto") as HTMLInputElement;
					
					roundsCustom.checked = false;
					roundsAuto.checked = true;
					rangeContainer.style.display = "none";
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
	playerlist.innerHTML = "";
	["Anakin", "Obi-Wan", "Yoda", "Mace Windu"].forEach((name) =>
		addPlayer(name)
	);

	const testSettings = [
		{ selector: "#rule_1", value: true },
		{ selector: "#rule_random_dealer", value: false },
		{ selector: "#rule_expansion", value: false },
		{ selector: "#rule_crowdchaos", value: false },
	];

	testSettings.forEach(({ selector, value }) => {
		const element = document.querySelector(selector) as HTMLInputElement;
		if (element) element.checked = value;
	});
});

const titleElement = document.getElementById("title");
titleElement.addEventListener("click", function () {
	//show modal_edit modal
	modal_edit.showModal();
});

//if the playlist is empty, hide the button
const clearRecentBtn = document.getElementById("clearrecent");
if (playerlist.children.length == 0) {
	clearRecentBtn.style.display = "none";
}

clearRecentBtn.addEventListener("click", function () {
	localStorage.setItem("playerlist", JSON.stringify([]));
	location.reload();
});

// Range container handlers
const toggleRangeContainer = (show: boolean) => {
	rangeContainer.style.display = show ? "block" : "none";
	if (show) {
		rangeContainer.classList.remove("opacity-0");
		rangeContainer.classList.add("opacity-100");
	} else {
		rangeContainer.classList.add("opacity-0");
		rangeContainer.classList.remove("opacity-100");
	}
};

const roundsAutoBox = document.getElementById("rounds_auto_box");
roundsAutoBox.addEventListener("click", function () {
	toggleRangeContainer(false);
	const val = amountofrounds(playerlist.children.length);
	const rangeVal = document.getElementById("range_val") as HTMLInputElement;
	const roundsCustomRange = document.getElementById("rounds_custom_range") as HTMLInputElement;
	const roundsAuto = document.getElementById("rounds_auto") as HTMLInputElement;
	rangeVal.value = val.toString();
	roundsCustomRange.value = val.toString();
	roundsAuto.checked = true;
});

const roundsCustomBox = document.getElementById("rounds_custom_box");
roundsCustomBox.addEventListener("click", function () {
	toggleRangeContainer(true);
	const roundsCustom = document.getElementById("rounds_custom") as HTMLInputElement;
	roundsCustom.checked = true;
});

const roundsCustomRange = document.getElementById("rounds_custom_range") as HTMLInputElement;
roundsCustomRange.addEventListener("input", function () {
	const rangeVal = document.getElementById("range_val") as HTMLInputElement;
	rangeVal.value = this.value;
});

document.onreadystatechange = function () {
	if (document.readyState === "complete") {
		document.getElementById("loading").classList.add("hidden");
	}
};

//toggles radio for rule_altcount if user clicks anywhere in div
const handleCalcBoxClick = (targetId: string) => (event) => {
	const target = event.target as HTMLElement;
	if (target.id !== targetId.replace("#", "")) {
		const targetElement = document.querySelector(targetId) as HTMLInputElement;
		targetElement?.click();
	}
};

const calcClassicBox = document.getElementById("calc_classic_box");
const calcAltBox = document.getElementById("calc_alt_box");
calcClassicBox.addEventListener("click", handleCalcBoxClick("#calc_classic"));
calcAltBox.addEventListener("click", handleCalcBoxClick("#calc_alt"));

//function that checks if valid 1 and 2 are both true and if so enables the button with id start_button
function checkValid() {
	const isValid = valid_1 && valid_2;
	if (isValid) {
		startButton.classList.remove("btn-disabled");
		startButton.classList.add("btn-secondary");
	} else {
		startButton.classList.add("btn-disabled");
		startButton.classList.remove("btn-secondary");
	}
}

//function that checks if the playerlist has at least 3 players and if not hide the div with the id alter_players and its children
function checkPlayers() {
	const playerCount = playerlist.children.length;
	const minPlayers = crowd_chaos ? 2 : 3;
	const hasEnoughPlayers = playerCount >= minPlayers;

	alertPlayers.style.display = hasEnoughPlayers ? "none" : "block";
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
		(
			document.getElementById("alert_invalidplayer") as HTMLDialogElement
		).showModal();
		console.log("invalid playername" + playername);
		return;
	}

	const playerCount = playerlist.children.length;
	if (playerCount > 5 && !crowd_chaos) return;

	if (playerCount === 5 && !crowd_chaos) {
		showmodal.disabled = true;
		showmodal.textContent = "Max amount of players reached";
	}

	const playerDiv = document.createElement("div");
	playerDiv.className = "appear flex flex-row input input-bordered input-secondary w-full my-1 items-center new-box";
	playerDiv.innerHTML = `
        <input type='text' placeholder='Name' class='h-full w-full !outline-none bg-transparent player-name' aria-label="playername">
        <div class='flex items-center gap-2 px-2'>
          <input type='checkbox' class='checkbox checkbox-sm dealer-checkbox' aria-label="select dealer">
          <span class='text-xs font-medium text-gray-400 whitespace-nowrap'>Dealer</span>
        </div>
        <img src='/icon/trash.svg' class='inv h-2/4 pl-2 remove-player' />`;
	
	playerlist.appendChild(playerDiv);

	const inputPlayername = document.getElementById("input_playername") as HTMLInputElement;
	inputPlayername.value = "";
	
	const lastPlayerInput = playerDiv.querySelector<HTMLInputElement>(".player-name");
	if (lastPlayerInput) {
		lastPlayerInput.value = playername;
	}

	// Check if random dealer is enabled and hide the checkbox if it is
	const ruleRandomDealerEl = document.getElementById("rule_random_dealer") as HTMLInputElement;
	if (ruleRandomDealerEl.checked) {
		const dealerCheckbox = playerDiv.querySelector<HTMLInputElement>(".dealer-checkbox");
		if (dealerCheckbox) {
			dealerCheckbox.style.display = "none";
		}
	}

	if (playerlist.children.length === 1) {
		const firstPlayerDealer = playerlist.children[0].querySelector<HTMLInputElement>(".dealer-checkbox");
		if (firstPlayerDealer) {
			firstPlayerDealer.checked = true;
		}
	}
	checkPlayers();
}
