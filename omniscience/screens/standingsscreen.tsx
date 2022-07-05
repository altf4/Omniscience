import { Button, StyleSheet, Text, TextInput, View, SafeAreaView, TouchableOpacity, FlatList, ViewStyle, TouchableHighlightBase} from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export function StandingsScreen({route, navigation}: {route: any, navigation: any}) {
    const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"
    const [standingsData, setStandingsData] = useState([]);
    const [selectedId, setSelectedId] = useState(null);
    const [currentRound, setCurrentRound] = useState(0);
    const [minRounds, setMinRounds] = useState(0);
    const [ourPersonaId, setOurPersonaId] = useState('');
    // "conversion" rates (ie: chance of top8'ing win win/draw/loss)
    const [ourConversionRateWin, setOurConversionRateWin] = useState(0);
    const [ourConversionRateDraw, setOurConversionRateDraw] = useState(0);
    const [ourConversionRateLoss, setOurConversionRateLoss] = useState(0);
    const [oppConversionRateWin, setOppConversionRateWin] = useState(0);
    const [oppConversionRateDraw, setOppConversionRateDraw] = useState(0);
    const [oppConversionRateLoss, setOppConversionRateLoss] = useState(0);

    // Fetches a new access token from our current refresh token
    async function refreshAccess() {
        const value = await AsyncStorage.getItem("@refresh_token");
        if (value !== null) {
        const formdata = new URLSearchParams({
            "grant_type": "refresh_token", 
            "refresh_token": value,
        });
        const response = await fetch('https://api.platform.wizards.com/auth/oauth/token', {
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

    class Player {
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
      }

    // Returns bool of whether the target player has top8'd the event after simulating the rest of the event
    //  originalPlayers - dict of personaId -> Player
    //  pairings - array of personaId pairs
    //  targetPlayer - personaId of the player to simulate for
    //  result - One of "win", "draw", or "loss"
    async function SimulateRound(originalPlayers: {[personaId: string] : Player}, pairings: any[], targetPlayer: string, result: string) {
        // Make a copy of the players dict since we're going to be mutating it
        var players: {[personaId: string] : Player} = {};
        for (let player in originalPlayers) {
            players[player] = {...originalPlayers[player]};
        }

        for (let pairing in pairings) {
            var playerA: Player = players[pairings[pairing][0]];
            var playerB: Player = players[pairings[pairing][1]];

            var dieroll = Math.random();
            var randomdraw = Math.random();
            var isBye: boolean = false;
    
            // Use the prescripted result if this is the target user
            if (targetPlayer === playerA.personaId || targetPlayer === playerB.personaId) {
                // reset the players so Player A is the target
                playerA = players[targetPlayer];
                if (pairing[0] === targetPlayer){
                    playerB = players[pairings[pairing][1]];
                } else {
                    playerB = players[pairings[pairing][0]];
                }
                if (result === "win") {
                    // Assume worst case win (2-1)
                    dieroll = 0.6;
                    randomdraw = 1;
                }
                if (result === "loss") {
                    // Assume worse case loss (0-2)
                    dieroll = 0.1;
                    randomdraw = 1;
                } 
                if (result === "draw") {
                    randomdraw = 0;
                }
            }
            
            // If one of the players is "bye", then handle that separately
            if ("bye" === playerA.personaId || "bye" === playerB.personaId) {
                // Set playerA to the non-bye player
                if ("bye" === pairings[pairing][0]){
                    playerA = players[pairings[pairing][1]];
                } else {
                    playerA = players[pairings[pairing][0]];
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

        // Flatten players map into array
        var playersArray: Player[] = [];
        for (let player in players) {
            playersArray.push(players[player]);
        }
        // Sort the players by breakers
        function playerSort(a: Player, b: Player) {
            if (a.matchPoints === b.matchPoints){
                // First breaker: Opponent Match Win Percent
                if(a.opponentMatchWinPercent === b.opponentMatchWinPercent) {
                    // Second breaker: Game win percent
                    if(a.opponentMatchWinPercent === b.opponentMatchWinPercent) {
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

    // "OnLoad"
    useEffect(() => {
        async function fetchStandings () {
            // Set our personaId to state
            const personaId: any = await AsyncStorage.getItem("@ourPersonaId");
            setOurPersonaId(personaId);

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

                // Build initial players array
                for (var team of json["data"]["event"]["gameState"]["standings"]) {
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
                players["bye"] = bye;

                // Set the round data
                setMinRounds(Number(json["data"]["event"]["gameState"]["minRounds"]))
                setCurrentRound(Number(json["data"]["event"]["gameState"]["currentRoundNumber"]))

                // Go through all past results and calculate game win/loss counts
                //      This information is present here in the match history, but not given to us explicitly
                const rounds: any[] = json["data"]["event"]["gameState"]["rounds"];
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
                                        // console.log(team["players"][0]["personaId"], team["results"][0]["wins"], "-", team["results"][0]["losses"])                                                     
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
                var opponentId: string = "";
                // Add each new pairing to the others' list of opponents
                for (var pairing in pairings) {
                    players[pairings[pairing][0]].opponents.push(pairings[pairing][1])
                    players[pairings[pairing][1]].opponents.push(pairings[pairing][0])
                    // While we're at it, find who our opponent is
                    if (pairings[pairing][0] === personaId) {
                        opponentId = pairings[pairing][1];
                    }
                    if (pairings[pairing][1] === personaId) {
                        opponentId = pairings[pairing][0];
                    }

                }
 
                console.log("ourselves " + personaId);


                // Scenario 1: Match win
                const n = 10;
                var successes = 0;
                for (let i = 0; i < n; i++) { 
                    successes += Number(await SimulateRound(players, pairings, personaId, "win"));
                }
                console.log("With a win: " + successes);
                setOurConversionRateWin(100 * (successes / n));

                // Scenario 2: Draw
                successes = 0;
                for (let i = 0; i < n; i++) { 
                    successes += Number(await SimulateRound(players, pairings, personaId, "draw"));
                }
                console.log("With a draw: " + successes);
                setOurConversionRateDraw(100 * (successes / n));

                // Scenario 3: Match loss
                successes = 0;
                for (let i = 0; i < n; i++) { 
                    successes += Number(await SimulateRound(players, pairings, personaId, "loss"));
                }
                console.log("With a loss: " + successes);
                setOurConversionRateLoss(100 * (successes / n));

                // Find our opponent. Calculate their results too

                // Scenario 1: Match win
                var successes = 0;
                for (let i = 0; i < n; i++) { 
                    successes += Number(await SimulateRound(players, pairings, opponentId, "win"));
                }
                console.log("Opponent with a win: " + successes);
                setOppConversionRateWin(100 * (successes / n));

                // Scenario 2: Draw
                successes = 0;
                for (let i = 0; i < n; i++) { 
                    successes += Number(await SimulateRound(players, pairings, opponentId, "draw"));
                }
                console.log("Opponent with a draw: " + successes);
                setOppConversionRateDraw(100 * (successes / n));

                // Scenario 3: Match loss
                successes = 0;
                for (let i = 0; i < n; i++) { 
                    successes += Number(await SimulateRound(players, pairings, opponentId, "loss"));
                }
                console.log("Opponent with a loss: " + successes);
                setOppConversionRateLoss(100 * (successes / n));                


                // Update the display data structure
                for (let personaId in players) {
                    const player: Player = players[personaId];
                    if (player.isBye === false){
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
            } else {
                console.log("Error fetching standings")
            }
        }

        fetchStandings();

    }, []);

    const styles = StyleSheet.create({
        container: {
          flex: 1,
          backgroundColor: '#fff',
          alignItems: 'center',
        },
        standingsContainer: {
            flex: 2,
            backgroundColor: '#fff',
            alignItems: 'center',
        },
        simulationsResultsContainer: {
            flex: 1,
            backgroundColor: '#fff',
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
        titleLabel: {
          flex: 0,
          fontSize: 20,
          fontWeight: 'bold',
        },
        headerItem: {
            fontSize: 20,
        },        
        item: {
            flex: 0.5,
            fontSize: 20,
        },
    });

    const Item = ({ personaId, rank, title, matchPoints, omw, gwp, ogw, onPress, backgroundColor, textColor }: {personaId: string, rank: number, title: string, matchPoints: number, omw: number, gwp: number, ogw: number, onPress: any, backgroundColor: any, textColor: any}) => (
        <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
            <View style={personaId === ourPersonaId ? styles.ourItemContainer : styles.itemContainer}>
                <Text style={[styles.item, textColor]}>{rank}</Text>
                <Text style={[styles.item, textColor]}>{title}</Text>
                <Text style={[styles.item, textColor]}>{matchPoints}</Text>
                <Text style={[styles.item, textColor]}>{omw}</Text>
                <Text style={[styles.item, textColor]}>{gwp}</Text>
                <Text style={[styles.item, textColor]}>{ogw}</Text>
            </View>
        </TouchableOpacity>
    );
    const renderItem = ({ item }: {item: any}) => (
        <Item 
            rank={item.rank}
            title={item.title}
            matchPoints={item.matchPoints}
            omw={item.omw}
            gwp={item.gwp}
            ogw={item.ogw}
            onPress={() => {
                setSelectedId(item.id); 
                console.log("selecting player: " + item.id)
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
            <Text style={[styles.headerItem]}>First Name</Text>
            <Text style={[styles.headerItem]}>Points</Text>
            <Text style={[styles.headerItem]}>OMW%</Text>
            <Text style={[styles.headerItem]}>GW%</Text>
            <Text style={[styles.headerItem]}>OGW%</Text>
        </View>
    );
    

    return (
        <View style={styles.container}>
            <View style={styles.container}>
                <Text style={styles.titleLabel}>You</Text>
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
                <Text style={styles.titleLabel}>Your Opponent</Text>
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
            <View style={styles.standingsContainer}>
                <Text style={styles.titleLabel}>Round {currentRound} of {minRounds}</Text>
                <SafeAreaView style={styles.container}>
                    <FlatList
                        data={standingsData}
                        renderItem={renderItem}
                        keyExtractor={item => item.id}
                        extraData={selectedId}
                        ListHeaderComponent={headerItem}
                    />
                </SafeAreaView>
        </View>
      </View>
    );
}