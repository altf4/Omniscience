// Represents a single player in an event, (can be a "bye" player, doensn't have to be a person)
export class Player {
    wins: number;
    losses: number;
    draws: number;
    matchPoints: number;
    gameWinPercent: number;
    gameWins: number;
    gameLosses: number;
    // These two have to be derived once all matches have finished for the round
    opponentGameWinPercent: number;
    opponentMatchWinPercent: number;
    opponents: string[]; // Array of personaId's for this player's opponents
    rank: number;
    firstName: string;
    lastName: string;
    personaId: string;
    isBye: boolean;

    constructor() {
        this.wins = 0;
        this.losses = 0;
        this.draws = 0;
        this.matchPoints = 0;
        this.gameWinPercent = 0;
        this.gameWins = 0;
        this.gameLosses = 0;
        this.opponentGameWinPercent = 0;
        this.opponentMatchWinPercent = 0;
        this.opponents = [];
        this.rank = 0;
        this.firstName = "";
        this.lastName = "";
        this.personaId = "";
        this.isBye = false;
    }

    // Serializes the object to JSON format
    toJSON(): string {
        return JSON.stringify(
            {
                wins: this.wins,
                losses: this.losses,
                draws: this.draws,
                matchPoints: this.matchPoints,
                gameWinPercent: this.gameWinPercent,
                gameWins: this.gameWins,
                gameLosses: this.gameLosses,
                opponentGameWinPercent: this.opponentGameWinPercent,
                opponentMatchWinPercent: this.opponentMatchWinPercent,
                opponents: this.opponents,
                rank: this.rank,
                firstName: this.firstName,
                lastName: this.lastName,
                personaId: this.personaId,
                isBye: this.isBye,
            }
        )
    }

    // Deserializes the object from JSON, clobbering any existing state
    fromJSON(jsonBlob: string) {
        let jsonObject = JSON.parse(jsonBlob);
        this.wins = jsonObject.wins;
        this.losses = jsonObject.losses;
        this.draws = jsonObject.draws;
        this.matchPoints = jsonObject.matchPoints;
        this.gameWinPercent = jsonObject.gameWinPercent;
        this.gameWins = jsonObject.gameWins;
        this.gameLosses = jsonObject.gameLosses;
        this.opponentGameWinPercent = jsonObject.opponentGameWinPercent;
        this.opponentMatchWinPercent = jsonObject.opponentMatchWinPercent;
        this.opponents = jsonObject.opponents;
        this.rank = jsonObject.rank;
        this.firstName = jsonObject.firstName;
        this.lastName = jsonObject.lastName;
        this.personaId = jsonObject.personaId;
        this.isBye = jsonObject.isBye;
    }
}

// Represents a snapshot of the current state of an event, including player standings and pairings for the current round
export class GameState {
    players: {[personaId: string] : Player}
    pairings: string[][]
    currentRound: number
    minRound: number
    roundHistory: any[]

    toJSON(): string {
        var jsonstring = JSON.stringify(
            {
                players: this.players,
                pairings: this.pairings,
                minRound: this.minRound,
                currentRound: this.currentRound,
                roundHistory: this.roundHistory,
            }
        );

        return jsonstring;
    }

    fromJSON(jsonBlob: string) {
        let jsonObject = JSON.parse(jsonBlob);
        
        for (let key in jsonObject.players) {
            this.players[key] = JSON.parse(jsonObject.players[key])
        }
            
        this.pairings = jsonObject.pairings;
        this.minRound = jsonObject.minRound;
        this.currentRound = jsonObject.currentRound;
        this.roundHistory = jsonObject.roundHistory;
    }

    // Make thick copy of the gamestate
    copy(): GameState {
        var newGamestate: GameState = new GameState();
        for (let player in this.players) {
            newGamestate.players[player] = {...this.players[player]};
        }
        for (let pairing of this.pairings) {
            newGamestate.pairings.push([pairing[0], pairing[1]]);
        }
        newGamestate.currentRound = this.currentRound;
        newGamestate.minRound = this.minRound;
        newGamestate.roundHistory = this.roundHistory;
        return newGamestate;
    }

    constructor() {
        this.players = {};
        this.pairings = [];
        this.currentRound = 0;
        this.minRound = 1;
        this.roundHistory = [];
    }

    // Generates new pairings of the players, chosen at random
    generateRandomPairings() {
        const playersArray = this.getSortedPlayers();
        var alreadyPaired: string[] = [];
        this.pairings = [];
    
        //TODO const isFinalRound = When it's the final round, pairings don't happen randomly, they happen in rank order

        // For each player, find a match. Starting with the top.
        for (let player of playersArray) {
            // Shortcut out if this player is already paired.
            if(!alreadyPaired.includes(player.personaId)) {
                var matchPoints: number = player.matchPoints;
                for (var i = matchPoints; i >= 0; i--) {
                    var potentialOpponents: string[] = this.getPlayersWithPoints(i);
                    var notOpponents: string[] = []; // same as above, but with all previous opponents removed 
                    for (let opponent of potentialOpponents) {
                        // remove anyone this player has already played against, and anyone in the alreadyPaired list
                        if (!player.opponents.includes(opponent) && !alreadyPaired.includes(opponent)) {
                            // Don't pair against yourself
                            if (opponent !== player.personaId) {
                                notOpponents.push(opponent);
                            }
                        }
                    }
                    if (notOpponents.length > 0) {
                        // Pick a random player in the list and pair them up
                        const randomPlayer: string = notOpponents[Math.floor(Math.random() * notOpponents.length)];
                        this.pairings.push([randomPlayer, player.personaId])
                        // Mark both players as having been paired
                        alreadyPaired.push(player.personaId);
                        alreadyPaired.push(randomPlayer);
                        break;
                    } else if (matchPoints === 0) {
                        // If there's nobody else to pair against and we've gone through every match point value, then pair up against bye
                        this.pairings.push(["bye", player.personaId])
                        alreadyPaired.push(player.personaId);
                    }
                }
            }
        } 
    }

    // Returns an array of all personaId's with exactly the number of match points specified
    getPlayersWithPoints(matchPoints: number): string[] {
        var playersArray: string[] = [];
        for (let player in this.players) {
            if (this.players[player].matchPoints == matchPoints) {
                playersArray.push(player);
            }
        }
        return playersArray;
    }

    // Get players as a sorted (by rank) array
    getSortedPlayers(): Player[] {
        // Flatten players map into array
        var playersArray: Player[] = [];
        for (let player in this.players) {
            playersArray.push(this.players[player]);
        }
        // Sort the players by breakers
        function playerSort(a: Player, b: Player) {
            if (a.matchPoints === b.matchPoints){
                // First breaker: Opponent Match Win Percent
                if(a.opponentMatchWinPercent === b.opponentMatchWinPercent) {
                    // Second breaker: Game win percent
                    if(a.gameWinPercent === b.gameWinPercent) {
                        // Third breaker: Opponent game win percent
                        return a.opponentGameWinPercent > b.opponentGameWinPercent ? -1 : 1;
                        // What to do if this is STILL tied? Unclear. But it ought to be pretty rare
                    } else {
                        return a.gameWinPercent > b.gameWinPercent ? -1 : 1;
                    }
                } else {
                    return a.opponentMatchWinPercent > b.opponentMatchWinPercent ? -1 : 1;
                }
            } else {
                return a.matchPoints > b.matchPoints ? -1 : 1;
            }
            
        }
        playersArray.sort(playerSort);
        return playersArray;
    }
}

// Simulates one round of results in the given GameState, returning a new GameState representing those results
//  gamestate - GameState object to start from.
//  targetPlayer - personaId of the player to simulate for
//  result - One of "win", "draw", or "loss"
export async function SimulateRound(gamestate: GameState, targetPlayer: string, result: string): Promise<GameState> {
    // Make a copy of the players dict since we're going to be mutating it
    var players: {[personaId: string] : Player} = {};
    for (let player in gamestate.players) {
        players[player] = {...gamestate.players[player]};
    }

    // Generate pairings if it doesn't exist already yet
    if (gamestate.pairings.length === 0) {
        gamestate.generateRandomPairings()
    }

    for (let pairing in gamestate.pairings) {
        var playerA: Player = players[gamestate.pairings[pairing][0]];
        var playerB: Player = players[gamestate.pairings[pairing][1]];

        var dieroll = Math.random();
        var randomdraw = Math.random();
        var isBye: boolean = false;

        if (playerA === undefined){
            // console.log(players)
            // console.log(gamestate.pairings)
            // console.log(gamestate.pairings[pairing])
            console.log(gamestate.toJSON())
        }

        // Use the prescripted result if this is the target user
        if (targetPlayer === playerA.personaId || targetPlayer === playerB.personaId) {
            // reset the players so Player A is the target
            playerA = players[targetPlayer];
            if (gamestate.pairings[pairing][0] === targetPlayer){
                playerB = players[gamestate.pairings[pairing][1]];
            } else {
                playerB = players[gamestate.pairings[pairing][0]];
            }
            if (result === "win") {
                // Assume worst case win (2-1)
                dieroll = 0.6;
                randomdraw = 1;
            }
            else if (result === "loss") {
                // Assume worse case loss (0-2)
                dieroll = 0.1;
                randomdraw = 1;
            } 
            else if (result === "draw") {
                randomdraw = 0;
            } else {
                throw TypeError();
            }

        } else {
            // If both players are trivially able to draw in, then always make them do that
            //  It's called a trivial draw in if both players are three more match points or greater above the current 8th place holder
            var eighthPlace: string = "";
            for (let player in players) {
                if (players[player].rank === 8){
                    eighthPlace = player;
                    break;
                }
            }
            const cutoffScore: number = players[eighthPlace].matchPoints;
            if (playerA.matchPoints - 2 > cutoffScore && playerB.matchPoints - 2 > cutoffScore) {
                playerA.draws += 1;
                playerB.draws += 1;
                isBye = true; // Not technically a bye, I guess. But makes us skip the random results logic below
            }
        }
        
        // If one of the players is "bye", then handle that separately
        if ("bye" === playerA.personaId || "bye" === playerB.personaId) {
            // Set playerA to the non-bye player
            if ("bye" === gamestate.pairings[pairing][0]){
                playerA = players[gamestate.pairings[pairing][1]];
            } else {
                playerA = players[gamestate.pairings[pairing][0]];
            }
            isBye = true;
            // Byes are considered 2-0 wins, count it now
            playerA.wins += 1
            playerA.gameWins += 2
        }

        // Non-bye round
        if (isBye === false) {
            // First, chance of unintentional draw (result assumed to be 1-1)
            // TODO: Configurable draw rate
            if (randomdraw < 0.01) {
                playerA.draws += 1;
                playerB.draws += 1;
                playerA.gameWins += 1;
                playerB.gameWins += 1;
            }
            // 4 possible equally likely scenarios:
            //   0 - 2
            //   1 - 2
            //   2 - 1
            //   2 - 0
            else if(dieroll < 0.25) {
                playerA.wins += 0
                playerB.wins += 1
                playerA.losses += 1
                playerB.losses += 0
                playerA.gameWins += 0
                playerB.gameWins += 2
                playerA.gameLosses += 2
                playerB.gameLosses += 0
            }
            else if (0.25 <= dieroll && dieroll < 0.50) {
                playerA.wins += 0
                playerB.wins += 1
                playerA.losses += 1
                playerB.losses += 0
                playerA.gameWins += 1
                playerB.gameWins += 2
                playerA.gameLosses += 2
                playerB.gameLosses += 1
            }
            else if (0.50 <= dieroll && dieroll < 0.75  ){
                playerA.wins += 1
                playerB.wins += 0
                playerA.losses += 0
                playerB.losses += 1
                playerA.gameWins += 2
                playerB.gameWins += 1
                playerA.gameLosses += 1
                playerB.gameLosses += 2
            }
            else {
                playerA.wins += 1
                playerB.wins += 0
                playerA.losses += 0
                playerB.losses += 1
                playerA.gameWins += 2
                playerB.gameWins += 0
                playerA.gameLosses += 0
                playerB.gameLosses += 2
            }
        }
        // Add each other to their respective opponents list
        playerA.opponents.push(playerB.personaId);
        playerB.opponents.push(playerA.personaId);
    }
    // Recalculate breakers now that the round has finished
    for (let playerId in players) {
        // Don't bother for the bye player
        if (playerId !== "bye") {
            var player: Player = players[playerId];
            var matchscores: number[] = [];
            var gamescores: number[] = [];
            for (let opponent of player.opponents) {
                // Again, don't recalculate for bye players
                if (opponent !== "bye") {
                    // Match and game winrate has a floor of 1/3, per https://blogs.magicjudges.org/rules/mtr-appendix-c/
                    const matchWinRate: number = players[opponent].wins / (players[opponent].wins+players[opponent].losses);
                    matchscores.push(Math.max(1/3, matchWinRate));
                    const gameWinRate: number = players[opponent].gameWins / (players[opponent].gameWins+players[opponent].gameLosses);
                    gamescores.push(Math.max(1/3, gameWinRate));
                }
            }
            // Average out the match and game scores
            matchscores.forEach((element) => {
                player.opponentMatchWinPercent += element;
            });
            player.opponentMatchWinPercent /= matchscores.length;
            gamescores.forEach((element) => {
                player.opponentGameWinPercent += element;
            });
            player.opponentGameWinPercent /= gamescores.length;
            player.gameWinPercent = Math.max(1/3, player.gameWins / (player.gameWins+player.gameLosses));
            player.matchPoints = (player.wins * 3) + player.draws;
        }
    }

    var returnState: GameState = new GameState();
    returnState.players = players;

    // Recalculate rank
    const playersArray = returnState.getSortedPlayers();
    var rank = 1;
    for (let player of playersArray) {
        returnState.players[player.personaId].rank = rank;
        rank += 1;
    }
    returnState.pairings = []
    returnState.currentRound = gamestate.currentRound + 1;
    returnState.minRound = gamestate.minRound;
    return returnState;
}