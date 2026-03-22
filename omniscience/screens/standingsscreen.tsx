import { StyleSheet, Text, Pressable, RefreshControl, View, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import React, { Component, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import * as Progress from 'react-native-progress';
import { GameState, Player, SimulateRound } from '../core/gamestate';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, radius, spacing } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Standings'>;

interface StandingsEntry {
    id: string;
    title: string;
    rank: number;
    matchPoints: number;
    omw: number;
    ogw: number;
    gwp: number;
    personaId: string;
}

export function StandingsScreen({ route, navigation }: Props) {
    const GRAPHQL_API = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql"
    const OAUTH_API = "https://api.platform.wizards.com/auth/oauth/token"

    const [predictionsData, setPredictionsData] = useState<string[]>([]);
    const [standingsData, setStandingsData] = useState<StandingsEntry[]>([]);
    const [selectedId, setSelectedId] = useState("");
    const [selectedName, setSelectedName] = useState("");
    const [currentRound, setCurrentRound] = useState(0);
    const [minRounds, setMinRounds] = useState(0);
    const [ourPersonaId, setOurPersonaId] = useState('');
    const [ourName, setOurName] = useState('');
    const [progress, setProgress] = useState(0);
    const [refreshing, setRefreshing] = useState(false);
    const [stale, setStale] = useState(true);
    const [currentGamestate, setCurrentGamestate] = useState(new GameState());
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
            if (response.status === 200) {
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
    async function updateStandingsDisplay(gamestate: GameState) {
        const standingsArray: StandingsEntry[] = [];
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
    }

    async function updatePredictionsDisplay(gamestate: GameState) {
        const personaId = await AsyncStorage.getItem("@selectedPersonaId") ?? "";
        const predictionsArray: string[] = [];

        for (const round of gamestate.roundHistory) {
            if (Number(round["number"]) < gamestate.roundHistory.length) {
                const matches: any[] = round["matches"];
                for (const match of matches) {
                    if (match["isBye"] === false) {
                        const personaA: string = match["teams"][0]["players"][0]["personaId"];
                        const personaB: string = match["teams"][1]["players"][0]["personaId"];
                        let personaIndex = -1;
                        if (personaA === personaId) {
                            personaIndex = 0;
                        } else if (personaB === personaId) {
                            personaIndex = 1;
                        }
                        if (personaIndex > -1) {
                            const team = match["teams"][personaIndex];
                            if (team["results"]) {
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
        for (let i = 0; i < roundsleft; i++) {
            predictionsArray.push("win");
        }
        setPredictionsData(predictionsArray);
        AsyncStorage.setItem('@predictions', JSON.stringify(predictionsArray));
    }

    // Synchronous function returns true if the target player is currently in the top 8 of the given GameState
    function isInTop8(gamestate: GameState, targetPlayer: string): boolean {
        // Flatten players map into array
        const playersArray: Player[] = gamestate.getSortedPlayers();
        // Just get the top 8
        const top8: Player[] = playersArray.slice(0, 8)

        for (const player of top8) {
            if (targetPlayer === player.personaId) {
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
        let opponentId: string = "";
        for (const pairingEntry of gamestate.pairings) {
            if (pairingEntry[0] === targetPlayerId) {
                opponentId = pairingEntry[1];
            }
            if (pairingEntry[1] === targetPlayerId) {
                opponentId = pairingEntry[0];
            }
        }

        // Scenario 1: Match win
        let successes = 0;
        for (let i = 0; i < n; i++) {
            const newGameState: GameState = await SimulateRound(gamestate, targetPlayerId, "win");
            successes += Number(isInTop8(newGameState, targetPlayerId));
        }
        console.log("With a win: " + successes);
        setOurConversionRateWin(Math.round(10000 * (successes / n)) / 100);
        setProgress(1 / 6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update


        // Scenario 2: Draw
        successes = 0;
        for (let i = 0; i < n; i++) {
            const newGameState: GameState = await SimulateRound(gamestate, targetPlayerId, "draw");
            successes += Number(isInTop8(newGameState, targetPlayerId));
        }
        console.log("With a draw: " + successes);
        setOurConversionRateDraw(Math.round(10000 * (successes / n)) / 100);
        setProgress(2 / 6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Scenario 3: Match loss
        successes = 0;
        for (let i = 0; i < n; i++) {
            const newGameState: GameState = await SimulateRound(gamestate, targetPlayerId, "loss");
            successes += Number(isInTop8(newGameState, targetPlayerId));
        }

        console.log("With a loss: " + successes);
        setOurConversionRateLoss(Math.round(10000 * (successes / n)) / 100);
        setProgress(3 / 6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Find our opponent. Calculate their results too

        // Scenario 1: Match win
        successes = 0;
        for (let i = 0; i < n; i++) {
            const newGameState: GameState = await SimulateRound(gamestate, opponentId, "win");
            successes += Number(isInTop8(newGameState, opponentId));
        }
        console.log("Opponent with a win: " + successes);
        setOppConversionRateWin(Math.round(10000 * (successes / n)) / 100);
        setProgress(4 / 6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Scenario 2: Draw
        successes = 0;
        for (let i = 0; i < n; i++) {
            const newGameState: GameState = await SimulateRound(gamestate, opponentId, "draw");
            successes += Number(isInTop8(newGameState, opponentId));
        }
        console.log("Opponent with a draw: " + successes);
        setOppConversionRateDraw(Math.round(10000 * (successes / n)) / 100);
        setProgress(5 / 6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update

        // Scenario 3: Match loss
        successes = 0;
        for (let i = 0; i < n; i++) {
            const newGameState: GameState = await SimulateRound(gamestate, opponentId, "loss");
            successes += Number(isInTop8(newGameState, opponentId));
        }
        console.log("Opponent with a loss: " + successes);
        setOppConversionRateLoss(Math.round(10000 * (successes / n)) / 100);
        setProgress(6 / 6);
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
    }

    // Assuming we're in the middle of an event, discover target player's odds of top 8'ing
    // returns the number of successful top 8's (out of n)
    // n - Number of iterations to try
    // gamestate - Starting gamestate
    // results - array of results ("win", "loss", "draw") for the entire event. (length minrounds)
    // targetPlayerId - string personaId of the player to simulate for
    async function SimulateRestOfEvent(n: number, gamestate: GameState, results: string[], targetPlayerId: string): Promise<number> {
        console.log("simulating rest of event...")
        let successes: number = 0;
        if (results.length !== gamestate.minRound) {
            throw new RangeError();
        }

        for (let i = 0; i < n; i++) {
            let nextGamestate: GameState = gamestate.copy()
            while (nextGamestate.currentRound <= nextGamestate.minRound) {
                // Do we already have pairings for the next round? If so, use those.
                if (nextGamestate.pairings.length === 0) {
                    nextGamestate.generateRandomPairings();
                }
                nextGamestate = await SimulateRound(nextGamestate, targetPlayerId, results[nextGamestate.currentRound - 1]);
            }

            if (isInTop8(nextGamestate, targetPlayerId)) {
                successes += 1;
            }

            if (i % 100 === 0) {
                setProgress(i / n);
                await new Promise(f => setTimeout(f, 5)); // Sleep real quick to give the UI a chance to update
            }
        }
        console.log("DONE simulating rest of event...")
        return successes;
    }

    // Reach out to remote server and return a GameState object with the latest data
    async function fetchGameState(): Promise<GameState> {
        // Set our personaId to state
        const personaId = await AsyncStorage.getItem("@ourPersonaId") ?? "";
        setOurPersonaId(personaId);
        // GameState that we will be returning later
        let gamestate: GameState = new GameState();

        // TODO: We refresh at the start here, which maybe is suboptimal. Perhaps we should only refresh on error. But that seems more complex for now
        if (await refreshAccess() === false) {
            console.log("Failed to refresh authentication");
            navigation.navigate("Login");
        }
        const access_token = await AsyncStorage.getItem("@access_token");
        // const request: string = "query loadEvent($eventId: ID!) { event(id: $eventId) { __typename ...Event } }  fragment EventFormat on EventFormat { id name includesDraft includesDeckbuilding }  fragment Registration on Registration { id personaId displayName firstName lastName }  fragment User on User { personaId displayName firstName lastName }  fragment Result on TeamResult { draws isPlayoffResult submitter isFinal isTO isBye wins losses teamId }  fragment Team on Team { id name players { __typename ...User } results { __typename ...Result } }  fragment Seats on Seat { number personaId displayName firstName lastName team { __typename ...Team } }  fragment Pod on Pod { number seats { __typename ...Seats } }  fragment Match on Match { id isBye teams { __typename ...Team } leftTeamWins rightTeamWins tableNumber }  fragment Round on Round { id number isFinalRound isCertified matches { __typename ...Match } canRollback timerID }  fragment Drop on Drop { teamId roundNumber }  fragment GameState on GameState { id minRounds pods { __typename ...Pod } top8Pods { __typename ...Pod } constructedSeats { __typename ...Seats } currentRoundNumber currentRound { __typename ...Round } rounds { __typename ...Round } drops { __typename ...Drop } draftTimerID constructDraftTimerID top8DraftTimerID gamesToWin }  fragment Reservation on Registration { personaId displayName firstName lastName }  fragment TeamFields on TeamPayload { id eventId teamCode isLocked isRegistered registrations { __typename ...Registration } reservations { __typename ...Reservation } }  fragment Event on Event { id title pairingType status shortCode isOnline createdBy requiredTeamSize eventFormat { __typename ...EventFormat } registeredPlayers { __typename ...Registration } gameStateAtRound(round: 0) { __typename ...GameState } teams { __typename ...TeamFields } }";
        const request: string = "query loadEvent($eventId: ID!) {event(id: $eventId) { ...Event __typename } } fragment Event on Event { __typename id venue { ...Venue __typename } title description format limitedSet rulesEnforcementLevel pairingType entryFee { __typename amount currency } scheduledStartTime actualStartTime estimatedEndTime actualEndTime status capacity numberOfPlayers shortCode tags latitude longitude address timeZone phoneNumber emailAddress startingTableNumber hasTop8 isAdHoc isOnline createdBy requiredTeamSize groupId cardSet { __typename id name releaseDate } eventFormat { ...EventFormat __typename } registeredPlayers { ...Registration __typename } gameState { ...GameState __typename } teams { ...TeamFields __typename } } fragment Venue on Venue { __typename id name latitude longitude address streetAddress city state country postalCode timeZone phoneNumber emailAddress googlePlaceId capacity notes isApproved } fragment EventFormat on EventFormat { __typename id name blurb requiresSetSelection includesDraft includesDeckbuilding wizardsOnly color } fragment Registration on Registration { __typename id status personaId displayName firstName lastName preferredTableNumber } fragment GameState on GameState { __typename id minRounds pods { ...Pod __typename } top8Pods { ...Pod __typename } draftTimerStartTime draftTimerExpirationTime draftEndTime top8DraftTimerStartTime top8DraftTimerExpirationTime top8DraftEndTime constructionTimerStartTime constructionTimerExpirationTime constructionTimeEndTime constructedSeats { ...Seats __typename } currentRoundNumber currentRound { ...Round __typename } rounds { ...Round __typename } standings { ...Standings __typename } drops { ...Drop __typename } nextRoundMeta { ...RoundMetaData __typename } podPairingType draftTimerID  constructDraftTimerID top8DraftTimerID gamesToWin } fragment Pod on Pod { __typename number seats { ...Seats __typename } } fragment Seats on Seat { __typename number personaId displayName firstName lastName team { ...Team __typename } } fragment Team on Team { __typename id cacheId name players { ...User __typename } results { ...Result __typename } } fragment User on User { __typename personaId displayName firstName lastName } fragment Result on TeamResult { __typename draws isPlayoffResult submitter isFinal isTO isBye wins losses teamId } fragment Round on Round { __typename id number isFinalRound isPlayoff isCertified actualStartTime actualEndTime roundTimerExpirationTime matches { ...Match __typename } pairingStrategy canRollback timerID } fragment Match on Match { __typename id cacheId isBye teams { ...Team __typename } leftTeamWins rightTeamWins isLeftTeamDropped isRightTeamDropped tableNumber } fragment Standings on TeamStanding { __typename team { ...Team __typename } rank wins losses draws byes matchPoints gameWinPercent opponentGameWinPercent opponentMatchWinPercent } fragment Drop on Drop { __typename teamId roundNumber } fragment RoundMetaData on RoundMetadata { __typename hasDraft hasDeckConstruction } fragment TeamFields on TeamPayload { __typename id eventId teamCode isLocked isRegistered registrations { ...Registration __typename } reservations { ...Reservation __typename } } fragment Reservation on Registration { __typename status personaId displayName firstName lastName preferredTableNumber }"
        const load_event = {
            "operationName": "loadEvent",
            "variables": { "eventId": Number(route.params.eventID) },
            "query": request
        }
        const response = await fetch(GRAPHQL_API, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": "Bearer " + access_token
            },
            body: JSON.stringify(load_event),
        });
        const json = await response.json();
        console.log("Bearer " + access_token)
        if (response.status !== 200) {
            console.log("Error fetching GameState")
            throw new Error("Failed to fetch GameState");
        } else {
            const standingsArray: StandingsEntry[] = [];

            const players: { [personaId: string]: Player } = {};

            // Set the round data
            gamestate.minRound = Number(json["data"]["event"]["gameState"]["minRounds"]);
            gamestate.currentRound = Number(json["data"]["event"]["gameState"]["currentRoundNumber"]);

            // On the first round, we don't have "standings" yet. So just list the players in no particular order instead
            //  There's still pairings to work with.
            if (gamestate.currentRound === 1) {
                const roundOneGamestate: GameState = new GameState();
                roundOneGamestate.currentRound = gamestate.currentRound
                roundOneGamestate.minRound = gamestate.minRound
                const rounds: any[] = json["data"]["event"]["gameState"]["rounds"];
                for (let round of rounds) {
                    const matches: any[] = round["matches"];
                    let rank: number = 1;
                    for (let match of matches) {
                        for (let team of match["teams"]) {
                            const player = new Player();
                            player.personaId = team["players"][0]["personaId"];
                            player.firstName = team["players"][0]["firstName"];
                            player.lastName = team["players"][0]["lastName"];
                            player.rank = rank;
                            rank += 1;
                            roundOneGamestate.players[player.personaId] = player;
                        }
                    }
                }
                return roundOneGamestate;
            } else {
                // Build initial players array
                for (let team of json["data"]["event"]["gameState"]["standings"]) {
                    const player = new Player();
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
                const bye = new Player();
                bye.isBye = true;
                bye.personaId = "bye"
                players["bye"] = bye;
                // Go through all past results and calculate game win/loss counts
                //      This information is present here in the match history, but not given to us explicitly
                const rounds: any[] = json["data"]["event"]["gameState"]["rounds"];
                gamestate.roundHistory = rounds;
                for (const round of rounds) {
                    if (Number(round["number"]) < rounds.length) {
                        const matches: any[] = round["matches"];
                        for (const match of matches) {
                            if (match["isBye"] === false) {
                                const personaA: string = match["teams"][0]["players"][0]["personaId"];
                                const personaB: string = match["teams"][1]["players"][0]["personaId"];
                                // Add each other to the opponent list
                                players[personaA].opponents.push(personaB);
                                players[personaB].opponents.push(personaA);
                                for (const team of match["teams"]) {
                                    if (team["results"]) {
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
                const pairings: string[][] = [];
                for (const match of json["data"]["event"]["gameState"]["currentRound"]["matches"]) {
                    if (match["isBye"]) {
                        const personaA: string = match["teams"][0]["players"][0]["personaId"]
                        pairings.push([personaA, "bye"])
                    } else {
                        const personaA: string = match["teams"][0]["players"][0]["personaId"]
                        const personaB: string = match["teams"][1]["players"][0]["personaId"]
                        pairings.push([personaA, personaB])
                    }
                }
                // Add each new pairing to the others' list of opponents
                for (const pairingEntry of pairings) {
                    players[pairingEntry[0]].opponents.push(pairingEntry[1])
                    players[pairingEntry[1]].opponents.push(pairingEntry[0])
                }

                gamestate.players = players;
                gamestate.pairings = pairings;

                // Pull out "our" title and set it globally
                for (let playerId in players) {
                    if (playerId === personaId) {
                        const name = players[playerId].firstName + " " + players[playerId].lastName;
                        await AsyncStorage.setItem("@ourName", name);
                    }
                }
                return gamestate;
            }
        }
        throw new Error("We shouldn't be able to get here.");
    }

    // "OnLoad"
    useEffect(() => {
        async function doSimulations() {
            let gamestate: GameState = await fetchGameState();
            setCurrentGamestate(gamestate)
            await updateStandingsDisplay(gamestate);
            await updatePredictionsDisplay(gamestate)
            await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
            const personaId = await AsyncStorage.getItem("@ourPersonaId") ?? "";
            const name = await AsyncStorage.getItem("@ourName") ?? "";
            AsyncStorage.setItem("@selectedPersonaId", personaId);
            setSelectedId(personaId);
            setSelectedName(name);
            // Run the simulations
            setCurrentRound(gamestate.currentRound);
            setMinRounds(gamestate.minRound);
            console.log("Round " + gamestate.currentRound + " of " + gamestate.minRound);
            if (gamestate.currentRound > 0 && gamestate.currentRound === gamestate.minRound) {
                SimulateLastRoundOfEvent(1000, gamestate, personaId);
            } else {
                const predictions: string[] = JSON.parse(await AsyncStorage.getItem('@predictions') || '[]')
                const n: number = 1000;
                const successes = await SimulateRestOfEvent(n, gamestate, predictions, personaId);
                const odds: number = 100 * (successes / n)
                setWinOutOdds(Math.round(odds * 100) / 100); // round the odds to 2 decimal points
            }
            setProgress(1);
        }

        setStale(false)
        doSimulations();

    }, []);

    const Item = ({ personaId, rank, title, matchPoints, omw, onPress }: { personaId: string, rank: number, title: string, matchPoints: number, omw: number, onPress: () => void, backgroundColor: string, textColor: string }) => {
        const isOurs = personaId === ourPersonaId;
        const isSelected = personaId === selectedId;
        const rowStyle = isOurs
            ? styles.ourItemContainer
            : isSelected
                ? styles.selectedItemContainer
                : styles.itemContainer;

        return (
            <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
                <View style={rowStyle}>
                    <Text style={styles.itemRank}>{rank}</Text>
                    <Text style={styles.itemName}>{title}</Text>
                    <Text style={styles.itemStat}>{matchPoints}</Text>
                    <Text style={styles.itemStat}>{omw}</Text>
                </View>
            </TouchableOpacity>
        );
    };

    async function onPressPlayer(id: string) {
        console.log("Pressed player")
        setStale(true)
        updatePredictionsDisplay(currentGamestate)
    }

    const renderItem = ({ item }: { item: StandingsEntry }) => (
        <Item
            rank={item.rank}
            title={item.title}
            matchPoints={item.matchPoints}
            omw={item.omw}
            onPress={() => {
                AsyncStorage.setItem("@selectedPersonaId", item.id);
                setSelectedId(item.id);
                setSelectedName(item.title);
                onPressPlayer(item.id);
            }}
            backgroundColor={""}
            textColor={""}
            personaId={item.personaId}
        />
    );

    const headerItem = () => (
        <View style={styles.headerRow}>
            <Text style={styles.headerRank}>#</Text>
            <Text style={styles.headerName}>Name</Text>
            <Text style={styles.headerStat}>Pts</Text>
            <Text style={styles.headerStat}>OMW%</Text>
        </View>
    );

    const wait = (timeout: number) => {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }

    // Clear out any state and start over
    async function onRefresh() {
        setStale(false)
        const personaId = await AsyncStorage.getItem("@ourPersonaId") ?? "";
        const name = await AsyncStorage.getItem("@ourName") ?? "";
        AsyncStorage.setItem("@selectedPersonaId", personaId);
        setSelectedId(personaId);
        setSelectedName(name);
        await recalculate(true);
    };

    // Recalculate results, but don't change selections
    async function recalculate(resetPredictions: boolean) {
        setStale(false)
        setProgress(0);
        setRefreshing(true);
        const personaId = await AsyncStorage.getItem("@selectedPersonaId") ?? "";
        console.log("recalculating for", personaId)
        await updateStandingsDisplay(currentGamestate);
        if (resetPredictions) {
            await updatePredictionsDisplay(currentGamestate)
        }
        await new Promise(f => setTimeout(f, 10)); // Sleep real quick to give the UI a chance to update
        // Run the simulations if it's the last round
        if (currentGamestate.currentRound === currentGamestate.minRound) {
            SimulateLastRoundOfEvent(1000, currentGamestate, personaId);
        }
        else {
            const predictions: string[] = JSON.parse(await AsyncStorage.getItem('@predictions') || '[]')
            const n: number = 1000;
            const successes = await SimulateRestOfEvent(n, currentGamestate, predictions, personaId);
            const odds: number = 100 * (successes / n)
            setWinOutOdds(Math.round(odds * 100) / 100); // round the odds to 2 decimal points
        }
        setRefreshing(false);
        setProgress(1);
    }

    class SimulationResultsArea extends Component {
        render() {
            if (stale) {
                return (
                    <TouchableOpacity style={styles.recalculateButton} onPress={() => recalculate(false)} activeOpacity={0.8}>
                        <Text style={styles.recalculateText}>Recalculate</Text>
                    </TouchableOpacity>
                );
            }

            if (progress >= 1) {
                if (currentRound === minRounds) {
                    return (
                        <View style={styles.simulationsArea}>
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
                                <View style={styles.oddsSection}>
                                    <Text style={styles.oddsSectionTitle}>Your Odds</Text>
                                    <View style={styles.oddsRow}>
                                        <View style={[styles.oddsBox, styles.oddsBoxWin]}>
                                            <Text style={styles.oddsLabel}>Win</Text>
                                            <Text style={styles.oddsValue}>{ourConversionRateWin}%</Text>
                                        </View>
                                        <View style={[styles.oddsBox, styles.oddsBoxDraw]}>
                                            <Text style={styles.oddsLabel}>Draw</Text>
                                            <Text style={styles.oddsValue}>{ourConversionRateDraw}%</Text>
                                        </View>
                                        <View style={[styles.oddsBox, styles.oddsBoxLoss]}>
                                            <Text style={styles.oddsLabel}>Loss</Text>
                                            <Text style={styles.oddsValue}>{ourConversionRateLoss}%</Text>
                                        </View>
                                    </View>
                                </View>
                                <View style={styles.oddsSection}>
                                    <Text style={styles.oddsSectionTitle}>Opponent's Odds</Text>
                                    <View style={styles.oddsRow}>
                                        <View style={[styles.oddsBox, styles.oddsBoxWin]}>
                                            <Text style={styles.oddsLabel}>Win</Text>
                                            <Text style={styles.oddsValue}>{oppConversionRateWin}%</Text>
                                        </View>
                                        <View style={[styles.oddsBox, styles.oddsBoxDraw]}>
                                            <Text style={styles.oddsLabel}>Draw</Text>
                                            <Text style={styles.oddsValue}>{oppConversionRateDraw}%</Text>
                                        </View>
                                        <View style={[styles.oddsBox, styles.oddsBoxLoss]}>
                                            <Text style={styles.oddsLabel}>Loss</Text>
                                            <Text style={styles.oddsValue}>{oppConversionRateLoss}%</Text>
                                        </View>
                                    </View>
                                </View>
                            </RefreshControl>
                        </View>
                    )
                } else {
                    return (
                        <View style={styles.mainOddsContainer}>
                            <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
                                <View style={styles.mainOddsContent}>
                                    <Text style={styles.playerNameLabel}>{selectedName}</Text>
                                    <Text style={styles.bigOddsValue}>{winOutOdds}%</Text>
                                    <Text style={styles.oddsCaption}>Chance of making top 8</Text>
                                </View>
                            </RefreshControl>
                        </View>
                    )
                }
            } else {
                return (
                    <View style={styles.loadingContainer}>
                        <Text style={styles.loadingText}>Crunching numbers...</Text>
                        <Progress.Bar
                            progress={progress}
                            width={200}
                            color={colors.primary}
                            unfilledColor={colors.surfaceHighlight}
                            borderColor={colors.border}
                        />
                    </View>
                );
            }
        }
    };

    type WinLossProps = {
        result: string;
        round: number;
    };

    class WinLossButton extends Component<WinLossProps, { result: string }> {
        constructor(props: WinLossProps) {
            super(props);
            this.state = {
                result: props.result,
            };
        }

        render() {
            const isPast = this.props.round + 1 < currentRound;
            let bgColor: string;
            let label: string;

            if (this.state.result === "loss") {
                bgColor = colors.dangerDark;
                label = "L";
            } else if (this.state.result === "win") {
                bgColor = colors.successDark;
                label = "W";
            } else {
                bgColor = colors.warningDark;
                label = "D";
            }

            return (
                <Pressable
                    style={[styles.winLossPill, { backgroundColor: bgColor, opacity: isPast ? 0.6 : 1 }]}
                    onPress={() => {
                        if (this.props.round + 1 >= currentRound) {
                            const predictions: string[] = predictionsData;
                            let next: string;
                            if (this.state.result === "win") next = "loss";
                            else if (this.state.result === "loss") next = "draw";
                            else next = "win";
                            predictions[this.props.round] = next;
                            this.setState({ result: next });
                            setPredictionsData(predictions);
                            AsyncStorage.setItem('@predictions', JSON.stringify(predictions));
                            setStale(true);
                        }
                    }}
                >
                    <Text style={styles.winLossLabel}>{label}</Text>
                    <Text style={styles.winLossRound}>R{this.props.round + 1}</Text>
                </Pressable>
            );
        }
    }

    class WinLossSelectorArea extends Component<{ predictions: string[] }, { predictions: string[] }> {
        constructor(props: { predictions: string[] }) {
            super(props);
            this.state = {
                predictions: props.predictions,
            };
        }

        renderWinLossButtons = () => {
            return this.state.predictions.map((result: string, roundNumber: number) => (
                <WinLossButton key={roundNumber} round={roundNumber} result={result} />
            ))
        }

        render() {
            if (currentRound < minRounds) {
                return (
                    <View style={styles.winLossArea}>
                        <View style={styles.winLossRow}>
                            {this.renderWinLossButtons()}
                        </View>
                    </View>
                );
            }
            else {
                return (
                    <View />
                );
            }
        }
    }

    class StandingsArea extends Component {
        render() {
            if (standingsData.length === 0) {
                return (
                    <View style={styles.loadingContainer}>
                        <Progress.Circle size={30} indeterminate={true} color={colors.primary} />
                    </View>
                );
            } else {
                return (
                    <View style={styles.standingsArea}>
                        <Text style={styles.standingsTitle}>Round {currentRound} of {minRounds}</Text>
                        <SafeAreaView style={styles.standingsList}>
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
            <StatusBar style="light" />
            <SimulationResultsArea />
            <WinLossSelectorArea predictions={predictionsData} />
            <StandingsArea />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },

    // Simulation results
    simulationsArea: {
        flex: 4,
        paddingHorizontal: spacing.md,
        paddingTop: spacing.md,
    },
    oddsSection: {
        marginBottom: spacing.lg,
    },
    oddsSectionTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: spacing.sm,
        textAlign: 'center',
    },
    oddsRow: {
        flexDirection: 'row',
        gap: spacing.sm,
    },
    oddsBox: {
        flex: 1,
        borderRadius: radius.card,
        paddingVertical: spacing.lg,
        alignItems: 'center',
    },
    oddsBoxWin: {
        backgroundColor: 'rgba(34, 197, 94, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(34, 197, 94, 0.3)',
    },
    oddsBoxDraw: {
        backgroundColor: 'rgba(234, 179, 8, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(234, 179, 8, 0.3)',
    },
    oddsBoxLoss: {
        backgroundColor: 'rgba(239, 68, 68, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(239, 68, 68, 0.3)',
    },
    oddsLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    oddsValue: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },

    // Main odds display (mid-event)
    mainOddsContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    mainOddsContent: {
        alignItems: 'center',
    },
    playerNameLabel: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    bigOddsValue: {
        fontSize: 56,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    oddsCaption: {
        fontSize: 14,
        color: colors.textMuted,
        marginTop: spacing.xs,
    },

    // Loading
    loadingContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: spacing.xxl,
    },
    loadingText: {
        fontSize: 16,
        color: colors.textSecondary,
        marginBottom: spacing.lg,
    },

    // Recalculate
    recalculateButton: {
        backgroundColor: colors.primary,
        borderRadius: radius.button,
        paddingVertical: spacing.lg,
        paddingHorizontal: spacing.xxl,
        margin: spacing.lg,
        alignItems: 'center',
    },
    recalculateText: {
        fontSize: 18,
        fontWeight: '600',
        color: colors.textPrimary,
    },

    // Win/Loss selector
    winLossArea: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
    },
    winLossRow: {
        flexDirection: 'row',
        gap: spacing.xs,
        justifyContent: 'center',
    },
    winLossPill: {
        borderRadius: radius.pill,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        alignItems: 'center',
        minWidth: 44,
    },
    winLossLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    winLossRound: {
        fontSize: 10,
        color: 'rgba(255,255,255,0.7)',
        marginTop: 2,
    },

    // Standings
    standingsArea: {
        flex: 3,
        paddingTop: spacing.md,
    },
    standingsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.textSecondary,
        textAlign: 'center',
        marginBottom: spacing.sm,
    },
    standingsList: {
        flex: 1,
    },
    headerRow: {
        flexDirection: 'row',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        backgroundColor: colors.surface,
    },
    headerRank: {
        flex: 0.5,
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    headerName: {
        flex: 3,
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textTransform: 'uppercase',
    },
    headerStat: {
        flex: 1,
        fontSize: 12,
        fontWeight: '700',
        color: colors.textMuted,
        textAlign: 'right',
        textTransform: 'uppercase',
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(51, 65, 85, 0.5)',
    },
    ourItemContainer: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(51, 65, 85, 0.5)',
        backgroundColor: 'rgba(99, 102, 241, 0.15)',
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    selectedItemContainer: {
        flexDirection: 'row',
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(51, 65, 85, 0.5)',
        backgroundColor: colors.surfaceHighlight,
    },
    itemRank: {
        flex: 0.5,
        fontSize: 14,
        color: colors.textMuted,
    },
    itemName: {
        flex: 3,
        fontSize: 14,
        color: colors.textPrimary,
    },
    itemStat: {
        flex: 1,
        fontSize: 14,
        color: colors.textSecondary,
        textAlign: 'right',
    },
});
