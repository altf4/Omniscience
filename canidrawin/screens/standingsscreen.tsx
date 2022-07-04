import { Button, StyleSheet, Text, TextInput, View, SafeAreaView, TouchableOpacity, FlatList, ViewStyle} from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export function StandingsScreen({route, navigation}: {route: any, navigation: any}) {
    const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"
    const [standingsData, setStandingsData] = useState([]);
    const [selectedId, setSelectedId] = useState(null);

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

    // "OnLoad"
    useEffect(() => {
        async function fetchStandings () {
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
                for (var team of json["data"]["event"]["gameState"]["standings"]) {
                    const name: string = team["team"]["players"][0]["firstName"] + " " + team["team"]["players"][0]["lastName"] 
                    standingsArray.push({
                        "id": team["team"]["players"][0]["personaId"], 
                        "title": name,
                        "rank": Number(team["rank"]),
                        "matchPoints": Number(team["matchPoints"]),
                        }
                    );
                    // console.log(name + team["team"]["players"][0]["rank"]);
                    // console.log(JSON.stringify(team));
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

    const Item = ({ rank, title, matchPoints, onPress, backgroundColor, textColor }: {rank: number, title: string, matchPoints: number, onPress: any, backgroundColor: any, textColor: any}) => (
        <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
            <View style={[styles.container, {
                flexDirection: "row"}]}>
                <Text style={[styles.item, textColor]}>{rank}</Text>
                <Text style={[styles.item, textColor]}>{title}</Text>
                <Text style={[styles.item, textColor]}>{matchPoints}</Text>
            </View>
        </TouchableOpacity>
    );
    const renderItem = ({ item }: {item: any}) => (
        <Item 
            rank={item.rank}
            title={item.title}
            matchPoints={item.matchPoints}
            onPress={() => {
                setSelectedId(item.id); 
                console.log("selecting player: " + item.id)
            }}
            backgroundColor={"#6e3b6e"}
            textColor={"black"}
        />
    );

    const headerItem = ({ item }: {item: any}) => (
        <View style={[styles.container, {
            flexDirection: "row"}]}>
            <Text style={[styles.headerItem]}>Place</Text>
            <Text style={[styles.headerItem]}>First Name</Text>
            <Text style={[styles.headerItem]}>Points</Text>
        </View>
    );
    

    return (
        <View style={styles.container}>
        <Text style={styles.titleLabel}>Standings</Text>
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
    );
}