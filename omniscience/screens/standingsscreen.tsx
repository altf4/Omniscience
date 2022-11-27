import { Button, StyleSheet, Text, Pressable, RefreshControl, View, SafeAreaView, TouchableOpacity, FlatList, ViewStyle, TouchableHighlightBase} from 'react-native';
import React, {Component, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setStatusBarNetworkActivityIndicatorVisible, StatusBar } from 'expo-status-bar';
import * as Progress from 'react-native-progress';
import {GameState, Player, SimulateRound} from '../core/gamestate';

export function StandingsScreen({route, navigation}: {route: any, navigation: any}) {
    const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"
    const OAUTH_API = "https://api.platform.wizards.com/auth/oauth/token"

    const [predictionsData, setPredictionsData] = useState([]);
    const [standingsData, setStandingsData] = useState([]);
    const [selectedId, setSelectedId] = useState("");
    const [selectedName, setSelectedName] = useState("");
    const [currentRound, setCurrentRound] = useState(0);
    const [minRounds, setMinRounds] = useState(0);
    const [ourPersonaId, setOurPersonaId] = useState('');
    const [ourName, setOurName] = useState('');
    const [progress, setProgress] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    // "conversion" rates (ie: chance of top8'ing win win/draw/loss)
    const [ourConversionRateWin, setOurConversionRateWin] = useState(0);
    const [ourConversionRateDraw, setOurConversionRateDraw] = useState(0);
    const [ourConversionRateLoss, setOurConversionRateLoss] = useState(0);
    const [oppConversionRateWin, setOppConversionRateWin] = useState(0);
    const [oppConversionRateDraw, setOppConversionRateDraw] = useState(0);
    const [oppConversionRateLoss, setOppConversionRateLoss] = useState(0);
    const [winOutOdds, setWinOutOdds] = useState(0); // odds of making top 8 by winning out the rest of the event


    // Fetches a new access token from our current refresh token
    async function refreshAccess() {
        const value = await AsyncStorage.getItem("@refresh_token");
        if (value !== null) {
        const formdata = new URLSearchParams({
            "grant_type": "refresh_token", 
            "refresh_token": value,
        });
        const response = await fetch(OAUTH_API, {
            method: "POST",
            headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic V0pSWURITkdST0laSEw4QjpWNVZYSzZGTEcxWUkwR0QyWFkzSA=="
            },
            body: formdata.toString(),
        });
        const json = await response.json();
        if (response.status == 200) {
            await AsyncStorage.setItem("@access_token", json["access_token"]);
            return true
        } else {
            return false
        }      
        } else {
        return false
        }
    }

    // reset - should we reset the predictions?
    async function updateStandingsDisplay(gamestate: GameState, resetPredictions: boolean) {
        var standingsArray: any = [];
        var predictionsArray: any = [];
        // Update the display data structure
        for (let personaId in gamestate.players) {
            const player: Player = gamestate.players[personaId];
            if (player.isBye === false) {
                standingsArray.push({
                    "id": player.personaId, 
                    "title": player.firstName + " " + player.lastName,
                    "rank": player.rank,
                    "matchPoints": player.matchPoints,
                    "omw": Math.round(player.opponentMatchWinPercent * 1000) / 10, // round display value to 1 decimal point
                    "ogw": Math.round(player.opponentGameWinPercent * 1000) / 10, // round display value to 1 decimal point
                    "gwp": Math.round(player.gameWinPercent * 1000) / 10, // round display value to 1 decimal point
                    "personaId": player.personaId,
                }
                );
            }
        }
        setStandingsData(standingsArray);
        const personaId: any = await AsyncStorage.getItem("@selectedPersonaId");

        if (resetPredictions === true){
            for (var round of gamestate.roundHistory) {
                if (Number(round["number"]) < gamestate.roundHistory.length){
                    const matches: any[] = round["matches"];
                    for (var match of matches) {
                        if (match["isBye"] === false){
                            const personaA: string = match["teams"][0]["players"][0]["personaId"];
                            const personaB: string = match["teams"][1]["players"][0]["personaId"];
                            var personaIndex = -1;
                            if (personaA === personaId) {
                                personaIndex = 0;
                            } else if (personaB === personaId) {
                                personaIndex = 1;
                            }
                            if (personaIndex > -1) {
                                var team = match["teams"][personaIndex];
                                if (team["results"]){
                                    const wins = team["results"][0]["wins"];
                                    const losses = team["results"][0]["losses"];
                                    if (wins > losses) {
                                        predictionsArray.push("win");
                                    } else if (losses > wins) {
                                        predictionsArray.push("loss");
                                    } else {
                                        predictionsArray.push("draw");
                                    }
                                }
                            }
                        } else {
                            // This is a bye
                            const personaA: string = match["teams"][0]["players"][0]["personaId"]
                            if (personaA === personaId) {
                                predictionsArray.push("win");
                            }
                        }
                    }
                }
            }

            // Fill in remaining predictions with wins
            const roundsleft = gamestate.minRound - predictionsArray.length;
            for (let i = 0; i < roundsleft; i++){
                predictionsArray.push("win");
            }
            setPredictionsData(predictionsArray);
            AsyncStorage.setItem('@predictions', JSON.stringify(predictionsArray));
        }
    }

    // Synchronous function returns true if the target player is currently in the top 8 of the given GameState
    function isInTop8(gamestate: GameState, targetPlayer: string): boolean {
        // Flatten players map into array
        var playersArray: Player[] = gamestate.getSortedPlayers();     
        // Just get the top 8
        const top8: Player[] = playersArray.slice(0, 8)

        for (let index in top8) {
            const player: Player = playersArray[index];
            if (targetPlayer === player.personaId){
                return true;
            }
        }
        return false;
    }

    // Repeatedly calls SimulateRound to stochastically determine success odds of top 8'ing the event, given last round standings
    //  n - Number of simulations to run per scenario (total amount run will be 6n)
    //  players - map of personaId -> Player for every player in the event
    //  pairings - array of personaId pairs
    //  targetPlayer - Player we wish to simulate for
    async function SimulateLastRoundOfEvent(n: number, gamestate: GameState, targetPlayerId: string) {

        // Figure out who the target player's opponent is
        var opponentId: string = "";
        for (let pairing in gamestate.pairings) {
            if (gamestate.pairings[pairing][0] === targetPlayerId) {
                opponentId = gamestate.pairings[pairing][1];
            }
            if (gamestate.pairings[pairing][1] === targetPlayerId) {
                opponentId = gamestate.pairings[pairing][0];
            }

        }

        // Scenario 1: Match win
        var successes = 0;
        for (let i = 0; i < n; i++) { 
            const newGameState: GameState = await SimulateRound(gamestate, targetPlayerId, "win");
            successes += Number(isInTop8(newGameState, targetPlayerId));
        }
        console.log("With a win: " + successes);
        setOurConversionRateWin(Math.round(10000 * (successes / n))  / 100);
        setProgress(1/6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
        

        // Scenario 2: Draw
        successes = 0;
        for (let i = 0; i < n; i++) { 
            const newGameState: GameState = await SimulateRound(gamestate, targetPlayerId, "draw");
            successes += Number(isInTop8(newGameState, targetPlayerId));
            // console.log("score after draw: " + newGameState.players[targetPlayerId].matchPoints);
        }
        console.log("With a draw: " + successes);
        setOurConversionRateDraw(Math.round(10000 * (successes / n))  / 100);
        setProgress(2/6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Scenario 3: Match loss
        successes = 0;
        for (let i = 0; i < n; i++) { 
            const newGameState: GameState = await SimulateRound(gamestate, targetPlayerId, "loss");
            successes += Number(isInTop8(newGameState, targetPlayerId));
        }

        console.log("With a loss: " + successes);
        setOurConversionRateLoss(Math.round(10000 * (successes / n))  / 100);
        setProgress(3/6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Find our opponent. Calculate their results too

        // Scenario 1: Match win
        var successes = 0;
        for (let i = 0; i < n; i++) { 
            const newGameState: GameState = await SimulateRound(gamestate, opponentId, "win");
            successes += Number(isInTop8(newGameState, opponentId));
        }
        console.log("Opponent with a win: " + successes);
        setOppConversionRateWin(Math.round(10000 * (successes / n))  / 100);
        setProgress(4/6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Scenario 2: Draw
        successes = 0;
        for (let i = 0; i < n; i++) { 
            const newGameState: GameState = await SimulateRound(gamestate, opponentId, "draw");
            successes += Number(isInTop8(newGameState, opponentId));
        }
        console.log("Opponent with a draw: " + successes);
        setOppConversionRateDraw(Math.round(10000 * (successes / n))  / 100);
        setProgress(5/6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Scenario 3: Match loss
        successes = 0;
        for (let i = 0; i < n; i++) { 
            const newGameState: GameState = await SimulateRound(gamestate, opponentId, "loss");
            successes += Number(isInTop8(newGameState, opponentId));
        }
        console.log("Opponent with a loss: " + successes);
        setOppConversionRateLoss(Math.round(10000 * (successes / n))  / 100);
        setProgress(6/6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
    }

    // Assuming we're in the middle of an event, simulate target player's odds of top 8'ing
    // returns the number of successful top 8's (out of n)
    // gamestate - Starting gamestate
    // results - array of results ("win", "loss", "draw") for the entire event. (length minrounds)
    // targetPlayerId - string personaId of the player to simulate for
    async function SimulateRestOfEvent(n: number, gamestate: GameState, results: string[], targetPlayerId: string): Promise<number> {
        var successes: number = 0;
        if (results.length !== gamestate.minRound) {
            throw new RangeError(); 
        }

        for (let i = 0; i < n; i++) {
            var nextGamestate: GameState = gamestate.copy();
            while(nextGamestate.currentRound <= nextGamestate.minRound) {
                // Do we already have pairings for the next round? If so, use those. 
                if (nextGamestate.pairings.length === 0) {
                    nextGamestate.generateRandomPairings(false);
                }
                nextGamestate = await SimulateRound(nextGamestate, targetPlayerId, results[nextGamestate.currentRound-1]);
            }

            if (isInTop8(nextGamestate, targetPlayerId)) {
                successes += 1;
            }

            if (i % 100 === 0) {
                setProgress(i/n);
                await new Promise(f => setTimeout(f, 5)); // Sleep real quick to give the UI a chance to update
            }
        }
        return successes;
    }

    // Reach out to remote server and return a GameState object with the latest data
    async function fetchGameState (): Promise<GameState> {
        // Set our personaId to state
        const personaId: any = await AsyncStorage.getItem("@ourPersonaId");
        setOurPersonaId(personaId);
        // GameState that we will be returning later
        var gamestate: GameState = new GameState();

        // TODO: We refresh at the start here, which maybe is suboptimal. Perhaps we should only refresh on error. But that seems more complex for now
        if(await refreshAccess() === false) {
            console.log("Failed to refresh authentication");
            navigation.navigate("Login");                    
        }
        const access_token = await AsyncStorage.getItem("@access_token");
        const request: string = "query loadEvent($eventId: ID!) {event(id: $eventId) { ...Event __typename } } fragment Event on Event { __typename id venue { ...Venue __typename } title description format limitedSet rulesEnforcementLevel pairingType entryFee { __typename amount currency } scheduledStartTime actualStartTime estimatedEndTime actualEndTime status capacity numberOfPlayers shortCode tags latitude longitude address timeZone phoneNumber emailAddress startingTableNumber hasTop8 isAdHoc isOnline createdBy requiredTeamSize groupId cardSet { __typename id name releaseDate } eventFormat { ...EventFormat __typename } registeredPlayers { ...Registration __typename } gameState { ...GameState __typename } teams { ...TeamFields __typename } } fragment Venue on Venue { __typename id name latitude longitude address streetAddress city state country postalCode timeZone phoneNumber emailAddress googlePlaceId capacity notes isApproved } fragment EventFormat on EventFormat { __typename id name blurb requiresSetSelection includesDraft includesDeckbuilding wizardsOnly color } fragment Registration on Registration { __typename id status personaId displayName firstName lastName preferredTableNumber } fragment GameState on GameState { __typename id minRounds pods { ...Pod __typename } top8Pods { ...Pod __typename } draftTimerStartTime draftTimerExpirationTime draftEndTime top8DraftTimerStartTime top8DraftTimerExpirationTime top8DraftEndTime constructionTimerStartTime constructionTimerExpirationTime constructionTimeEndTime constructedSeats { ...Seats __typename } currentRoundNumber currentRound { ...Round __typename } rounds { ...Round __typename } standings { ...Standings __typename } drops { ...Drop __typename } nextRoundMeta { ...RoundMetaData __typename } podPairingType draftTimerID  constructDraftTimerID top8DraftTimerID gamesToWin } fragment Pod on Pod { __typename number seats { ...Seats __typename } } fragment Seats on Seat { __typename number personaId displayName firstName lastName team { ...Team __typename } } fragment Team on Team { __typename id cacheId name players { ...User __typename } results { ...Result __typename } } fragment User on User { __typename personaId displayName firstName lastName } fragment Result on TeamResult { __typename draws isPlayoffResult submitter isFinal isTO isBye wins losses teamId } fragment Round on Round { __typename id number isFinalRound isPlayoff isCertified actualStartTime actualEndTime roundTimerExpirationTime matches { ...Match __typename } pairingStrategy canRollback timerID } fragment Match on Match { __typename id cacheId isBye teams { ...Team __typename } leftTeamWins rightTeamWins isLeftTeamDropped isRightTeamDropped tableNumber } fragment Standings on TeamStanding { __typename team { ...Team __typename } rank wins losses draws byes matchPoints gameWinPercent opponentGameWinPercent opponentMatchWinPercent } fragment Drop on Drop { __typename teamId roundNumber } fragment RoundMetaData on RoundMetadata { __typename hasDraft hasDeckConstruction } fragment TeamFields on TeamPayload { __typename id eventId teamCode isLocked isRegistered registrations { ...Registration __typename } reservations { ...Reservation __typename } } fragment Reservation on Registration { __typename status personaId displayName firstName lastName preferredTableNumber }"
        const load_standings_payload = {
            "operationName": "loadEvent",
            "variables": {"eventId": Number(route.params.eventID)},
            "query": request
        }
        const response = await fetch(GRAPHQL_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + access_token
            },
            body: JSON.stringify(load_standings_payload),
        });
        const json = await response.json();
        if (response.status == 200) {
            var standingsArray: any = [];

            var players: {[personaId: string] : Player} = {};

            // Set the round data
            const min_rounds: number = Number(json["data"]["event"]["gameState"]["minRounds"]);
            const current_round: number = Number(json["data"]["event"]["gameState"]["currentRoundNumber"]);
            gamestate.currentRound = current_round;
            gamestate.minRound = min_rounds;

            if (current_round == 1) {
                var gamestate: GameState = new GameState();
                // On the first round, we don't have "standings" yet. So just list the players in no particular order instead
                //  There's still pairings to work with.
                const rounds: any[] = json["data"]["event"]["gameState"]["rounds"];
                for (let round of rounds) {
                    const matches: any[] = round["matches"];
                    var rank: number = 1;
                    for (let match of matches) {
                        for (let team of match["teams"]) {
                            var player = new Player();
                            player.personaId = team["players"][0]["personaId"];
                            player.firstName = team["players"][0]["firstName"];
                            player.lastName = team["players"][0]["lastName"];
                            player.rank = rank;
                            rank += 1;
                            gamestate.players[player.personaId] = player;
                        }
                    }
                }
                return gamestate;
            } else {
                // Build initial players array
                for (let team of json["data"]["event"]["gameState"]["standings"]) {
                    var player = new Player();
                    player.wins = Number(team["wins"]);
                    player.losses = Number(team["losses"]);
                    player.draws = Number(team["draws"]);
                    player.matchPoints = Number(team["matchPoints"]);
                    player.gameWinPercent = Number(team["gameWinPercent"]);
                    player.opponentGameWinPercent = Number(team["opponentGameWinPercent"]);
                    player.opponentMatchWinPercent = Number(team["opponentMatchWinPercent"]);
                    player.rank = Number(team["rank"]);
                    player.firstName = team["team"]["players"][0]["firstName"];
                    player.lastName = team["team"]["players"][0]["lastName"];
                    player.personaId = team["team"]["players"][0]["personaId"];
                    players[player.personaId] = player;
                }

                // Add a bye player. (We may need even with an even number of entrants, due to drops)
                var bye = new Player();
                bye.isBye = true;
                bye.personaId = "bye"
                players["bye"] = bye;

                // Go through all past results and calculate game win/loss counts
                //      This information is present here in the match history, but not given to us explicitly
                const rounds: any[] = json["data"]["event"]["gameState"]["rounds"];
                gamestate.roundHistory = rounds;
                for (var round of rounds) {
                    if (Number(round["number"]) < rounds.length){
                        const matches: any[] = round["matches"];
                        for (var match of matches) {
                            if (match["isBye"] === false){
                                const personaA: string = match["teams"][0]["players"][0]["personaId"];
                                const personaB: string = match["teams"][1]["players"][0]["personaId"];
                                // Add each other to the opponent list
                                players[personaA].opponents.push(personaB);
                                players[personaB].opponents.push(personaA);
                                for (var team of match["teams"]){
                                    if (team["results"]){
                                        players[team["players"][0]["personaId"]].gameWins += team["results"][0]["wins"]
                                        players[team["players"][0]["personaId"]].gameLosses += team["results"][0]["losses"]
                                    }
                                }
                            } else {
                                // This is a bye
                                const personaA: string = match["teams"][0]["players"][0]["personaId"]
                                players[personaA].gameWins += 2
                            }
                        }
                    }
                }    
            
                // Gather the pairings in a nice structure (array of personaId string pairs)
                var pairings: any = [];
                for (var match of json["data"]["event"]["gameState"]["currentRound"]["matches"]) {
                    if (match["isBye"]) {
                        const personaA: string = match["teams"][0]["players"][0]["personaId"]
                        pairings.push([personaA, "bye"])
                    } else{
                        const personaA: string = match["teams"][0]["players"][0]["personaId"]
                        const personaB: string = match["teams"][1]["players"][0]["personaId"]
                        pairings.push([personaA, personaB])
                    }
                }
                // Add each new pairing to the others' list of opponents
                for (let pairing in pairings) {
                    players[pairings[pairing][0]].opponents.push(pairings[pairing][1])
                    players[pairings[pairing][1]].opponents.push(pairings[pairing][0])
                }

                gamestate.players = players;
                gamestate.pairings = pairings;

                // Pull out "our" title and set it globally
                for (let playerId in players) {
                    if (playerId === personaId){
                        const name = players[playerId].firstName + " " + players[playerId].lastName;
                        await AsyncStorage.setItem("@ourName", name);
                    }
                }
                return gamestate;
            }

        } else {
            console.log("Error fetching GameState")
            throw new Error("Failed to fetch GameState");
        }
        throw new Error("We shouldn't be able to get here.");
    }

    // "OnLoad"
    useEffect(() => {
        async function doSimulations() {
            var gamestate: GameState = await fetchGameState();
            await updateStandingsDisplay(gamestate, true);
            await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
            const personaId: any = await AsyncStorage.getItem("@ourPersonaId");
            const name: any = await AsyncStorage.getItem("@ourName");
            AsyncStorage.setItem("@selectedPersonaId", personaId);
            setSelectedId(personaId);
            setSelectedName(name);            
            // Run the simulations
            setCurrentRound(gamestate.currentRound);
            setMinRounds(gamestate.minRound);
            console.log("Round " + gamestate.currentRound +" of "+ gamestate.minRound);
            if (gamestate.currentRound > 0 && gamestate.currentRound === gamestate.minRound) {
                SimulateLastRoundOfEvent(1000, gamestate, personaId);
            } else {
                const predictions: string[] = JSON.parse(await AsyncStorage.getItem('@predictions'))
                const n: number = 1000;
                const successes = await SimulateRestOfEvent(n, gamestate, predictions, personaId);
                setWinOutOdds(100* (successes / n));
            }
            setProgress(1);
        }

        doSimulations();

    }, []);

    const styles = StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#ffffff',
          alignItems: 'center',
        },
        simulationsResultsAreaContainer: {
            flex: 4,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            flexDirection: "row",
        },        
        winLossAreaContainer: {
            flex: .8,
            backgroundColor: '#ffffff',
            alignItems: 'center',
        },
        standingsAreaContainer: {
            flex: 3,
            backgroundColor: '#9999ff',
            alignItems: 'center',
        },
        standingsContainer: {
            flex: 1,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            flexDirection: "row",
        },        
        simulationsResultsContainer: {
            flex: 1,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            flexDirection: "row",
        },
        simulationBoxContainerWin: {
            flex: 1,
            backgroundColor: '#3aa832',
            alignItems: 'center',
            flexDirection: "column",
        },
        simulationBoxContainerDraw: {
            flex: 1,
            backgroundColor: '#ab7e24',
            alignItems: 'center',
            flexDirection: "column",
        },
        simulationBoxContainerLoss: {
            flex: 1,
            backgroundColor: '#cf2727',
            alignItems: 'center',
            flexDirection: "column",
        },
        itemContainer: {
            flex: 1,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            flexDirection: "row",
        },
        ourItemContainer: {
            flex: 1,
            backgroundColor: '#dddddd',
            alignItems: 'center',
            flexDirection: "row",
        },
        winLossSelectorContainer: {
            flex: 1,
            backgroundColor: '#ffffff',
            alignItems: 'center',
            flexDirection: "row",
        },        
        selectedItemContainer: {
            flex: 1,
            backgroundColor: '#cccccc',
            alignItems: 'center',
            flexDirection: "row",
        },
        lossSelectionContainer: {
            flex: 1,
            backgroundColor: '#cc0000',
            alignItems: 'center',
        },
        winSelectionContainer: {
            flex: 1,
            backgroundColor: '#00cc00',
            alignItems: 'center',
        },        
        drawSelectionContainer: {
            flex: 1,
            backgroundColor: '#f5d442',
            alignItems: 'center',
        },        
        titleLabel: {
          flex: 0,
          fontSize: 20,
          fontWeight: 'bold',
        },
        resultLabel: {
            flex: 0,
            fontSize: 48,
            fontWeight: 'bold',
        },
        winlossLabels: {
            flex: 0.5,
            fontSize: 30,
            fontWeight: 'bold',
        },
        winLossRoundCountLabel: {
            flex: 1,
            fontSize: 20,
        },        
        headerItem: {
            fontSize: 16,
            fontWeight: 'bold',
            flex: 1,
        },        
        item: {
            flex: 1,
            fontSize: 20,
        },
    });

    const Item = ({ personaId, rank, title, matchPoints, omw, gwp, ogw, onPress, backgroundColor, textColor }: {personaId: string, rank: number, title: string, matchPoints: number, omw: number, gwp: number, ogw: number, onPress: any, backgroundColor: any, textColor: any}) => (
        <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
            <View style={personaId === ourPersonaId ? styles.ourItemContainer : (personaId === selectedId ? styles.selectedItemContainer : styles.itemContainer)}>
                <Text style={[styles.item, textColor]}>{rank}</Text>
                <Text style={[styles.item, textColor]}>{title}</Text>
                <Text style={[styles.item, textColor]}>{matchPoints}</Text>
                <Text style={[styles.item, textColor]}>{omw}</Text>
                <Text style={[styles.item, textColor]}>{gwp}</Text>
                <Text style={[styles.item, textColor]}>{ogw}</Text>
            </View>
        </TouchableOpacity>
    );

    async function onPressPlayer(id: string) {
        setRefreshing(true);
        setProgress(0);
        var gamestate: GameState = await fetchGameState();
        await updateStandingsDisplay(gamestate, true);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
        // Run the simulations if it's the last round
        if (gamestate.currentRound === gamestate.minRound)  {
            SimulateLastRoundOfEvent(1000, gamestate, id);            
        }
        else {
            const predictions: string[] = JSON.parse(await AsyncStorage.getItem('@predictions'))
            const n: number = 1000;
            const successes = await SimulateRestOfEvent(n, gamestate, predictions, id);
            setWinOutOdds(100* (successes / n));
        }
        setProgress(1);
        setRefreshing(false);
    }

    const renderItem = ({ item }: {item: any}) => (
        <Item 
            rank={item.rank}
            title={item.title}
            matchPoints={item.matchPoints}
            omw={item.omw}
            gwp={item.gwp}
            ogw={item.ogw}
            onPress={() => {
                AsyncStorage.setItem("@selectedPersonaId", item.id);
                setSelectedId(item.id);
                setSelectedName(item.title);
                onPressPlayer(item.id);
                console.log("selecting player: ", item.id)
            }}
            backgroundColor={"#6e3b6e"}
            textColor={"black"}
            personaId={item.personaId}
        />
    );

    const headerItem = ({ item }: {item: any}) => (
        <View style={[styles.container, {
            flexDirection: "row"}]}>
            <Text style={[styles.headerItem]}>Place</Text>
            <Text style={[styles.headerItem]}>Name</Text>
            <Text style={[styles.headerItem]}>Points</Text>
            <Text style={[styles.headerItem]}>OMW%</Text>
            <Text style={[styles.headerItem]}>GW%</Text>
            <Text style={[styles.headerItem]}>OGW%</Text>
        </View>
    );
    
    const wait = (timeout: number) => {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }

    // Clear out any state and start over
    async function onRefresh() {
        const personaId: any = await AsyncStorage.getItem("@ourPersonaId");
        const name: any = await AsyncStorage.getItem("@ourName");
        AsyncStorage.setItem("@selectedPersonaId", personaId);
        setSelectedId(personaId);
        setSelectedName(name);
        await recalculate(true);
    };

    // Recalculate results, but don't change selections
    async function recalculate(resetPredictions: boolean) {
        setProgress(0);
        setRefreshing(true);
        const personaId: any = await AsyncStorage.getItem("@selectedPersonaId");
        var gamestate: GameState = await fetchGameState();
        await updateStandingsDisplay(gamestate, resetPredictions);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update        
        // Run the simulations if it's the last round
        if (gamestate.currentRound === gamestate.minRound)  {
            SimulateLastRoundOfEvent(1000, gamestate, personaId);            
        }
        else{
            const predictions: string[] = JSON.parse(await AsyncStorage.getItem('@predictions'))
            const n: number = 1000;
            const successes = await SimulateRestOfEvent(n, gamestate, predictions, personaId);
            setWinOutOdds(100* (successes / n));
        }
        setRefreshing(false);
        setProgress(1);
    }

    class SimulationResultsArea extends Component {
        render(){
            if (progress >= 1){
                if (currentRound === minRounds){
                    return (
                        <View style={styles.simulationsResultsAreaContainer}>
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
                                <View style={styles.container}>
                                    <Text style={styles.titleLabel}>Your Odds:</Text>
                                    <View style={styles.simulationsResultsContainer}>
                                        <View style={styles.simulationBoxContainerWin}>
                                            <Text style={styles.titleLabel}>Win</Text>
                                            <Text style={styles.titleLabel}>{ourConversionRateWin}%</Text>
                                        </View>
                                        <View style={styles.simulationBoxContainerDraw}>
                                            <Text style={styles.titleLabel}>Draw</Text>
                                            <Text style={styles.titleLabel}>{ourConversionRateDraw}%</Text>
                                        </View>
                                        <View style={styles.simulationBoxContainerLoss}>
                                            <Text style={styles.titleLabel}>Loss</Text>
                                            <Text style={styles.titleLabel}>{ourConversionRateLoss}%</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.titleLabel}>Your Opponent's Odds:</Text>
                                    <View style={styles.simulationsResultsContainer}>
                                        <View style={styles.simulationBoxContainerWin}>
                                            <Text style={styles.titleLabel}>Win</Text>
                                            <Text style={styles.titleLabel}>{oppConversionRateWin}%</Text>
                                        </View>
                                        <View style={styles.simulationBoxContainerDraw}>
                                            <Text style={styles.titleLabel}>Draw</Text>
                                            <Text style={styles.titleLabel}>{oppConversionRateDraw}%</Text>
                                        </View>
                                        <View style={styles.simulationBoxContainerLoss}>
                                            <Text style={styles.titleLabel}>Loss</Text>
                                            <Text style={styles.titleLabel}>{oppConversionRateLoss}%</Text>
                                        </View>
                                    </View>
                                </View>      
                            </RefreshControl>        
                        </View>
                    )
                } else {
                    return (
                        <View style={styles.container}>
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
                                <View style={styles.container}>
                                    <Text style={styles.titleLabel}>{selectedName}</Text>
                                    <Text style={styles.resultLabel}>{winOutOdds}%</Text>
                                    <Text style={styles.titleLabel}>Chance of making top 8</Text>
                                </View>
                            </RefreshControl>
                        </View>
                    )
                }
            } else {
                return (
                    <View style={styles.container}>
                        <Text style={styles.titleLabel}>Crunching numbers...</Text>
                        <Progress.Pie progress={progress} size={50} />
                    </View>
                );
            }
        }        
    };

    type WinLossProps = {
        result: string;
        round: number;
    };

    class WinLossButton extends Component<WinLossProps> {
        constructor(props: WinLossProps) {
            super(props);
            this.state = {
              result: props.result,
            };
        }

        render(){
            if (this.state.result === "loss"){
                return (
                    <View style={styles.lossSelectionContainer}>
                        <Pressable onPress={() => {
                            if (this.props.round+1 >= currentRound){
                                const predictions: string[] = predictionsData;
                                predictions[this.props.round] = "draw";
                                this.setState({ result: "draw"})
                                setPredictionsData(predictions);
                                AsyncStorage.setItem('@predictions', JSON.stringify(predictions));
                                recalculate(false);
                            }
                        }}>                  
                            <Text style={styles.winlossLabels}>Loss</Text>
                            <Text style={styles.winLossRoundCountLabel}>Round {this.props.round+1}</Text>
                        </Pressable>
                    </View> 
                );
            } else if (this.state.result === "win"){
                return (
                    <View style={styles.winSelectionContainer}>
                        <Pressable onPress={() => {
                            if (this.props.round+1 >= currentRound){
                                const predictions: boolean[] = predictionsData;
                                predictions[this.props.round] = "loss";
                                this.setState({ result: "loss"})
                                setPredictionsData(predictions);
                                AsyncStorage.setItem('@predictions', JSON.stringify(predictions));
                                recalculate(false);
                            }
                        }}>
                            <Text style={styles.winlossLabels}>Win</Text>
                            <Text style={styles.winLossRoundCountLabel}>Round {this.props.round+1}</Text>
                        </Pressable> 
                    </View>    
                )            
            }
            else {
                return (
                    <View style={styles.drawSelectionContainer}>
                        <Pressable onPress={() => {
                            if (this.props.round+1 >= currentRound){
                                const predictions: boolean[] = predictionsData;
                                predictions[this.props.round] = "win";
                                this.setState({ result: "win"})
                                setPredictionsData(predictions);
                                AsyncStorage.setItem('@predictions', JSON.stringify(predictions));
                                recalculate(false);
                            }
                        }}>
                            <Text style={styles.winlossLabels}>Draw</Text>
                            <Text style={styles.winLossRoundCountLabel}>Round {this.props.round+1}</Text>
                        </Pressable> 
                    </View>    
                )            
            }            

        }
    }

    class WinLossSelectorArea extends Component {
        constructor(props: any) {
            super(props);
            this.state = {
              predictions: props.predictions,
            };
        }

        renderWinLossButtons = () => {
            return this.state.predictions.map((result, roundNumber) => (
                <WinLossButton key={roundNumber} round={roundNumber} result={result}/>
            ))
        }

        render(){
            if (currentRound < minRounds){
                return (
                    <View style={styles.winLossAreaContainer}>     
                        <View style={styles.winLossSelectorContainer}>
                            {this.renderWinLossButtons()}
                        </View>
                    </View>
                );
            }
            else{
                return (
                    <View/>
                );
            }
        }
    }

    class StandingsArea extends Component {
        render(){
            if (standingsData.length === 0) {
                return (<Progress.Circle size={30} indeterminate={true} />)
            } else {
                return (
                    <View style={styles.standingsAreaContainer}>
                        <Text style={styles.titleLabel}>Round {currentRound} of {minRounds} Standings</Text>
                        <SafeAreaView style={styles.standingsContainer}>
                            <FlatList
                                data={standingsData}
                                renderItem={renderItem}
                                keyExtractor={item => item.id}
                                extraData={selectedId}
                                ListHeaderComponent={headerItem}
                            />
                        </SafeAreaView>
                    </View>
                )
            }
        }
    }

    return (
        <View style={styles.container}>
            <SimulationResultsArea/>
            <WinLossSelectorArea predictions={predictionsData}/>
            <StandingsArea/>
        </View>
    );
}