import { Button, StyleSheet, Text, TextInput, RefreshControl, View, SafeAreaView, TouchableOpacity, FlatList, ViewStyle} from 'react-native';
import React, {Component, useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const EventsScreen = ({navigation}: {navigation: any}) => {
    const OAUTH_API = "https://api.platform.wizards.com/auth/oauth/token"
    // const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"
    const GRAPHQL_API = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql"

    var [accessToken, setAccessToken] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [eventData, setEventData] = useState([]);
    const [displayName, setDisplayName] = useState('');
    const [refreshing, setRefreshing] = useState(false);

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

    //Get a list of events the user is in
    // TODO: Make this a pure function that gets an events structure and have callers responsible for page behavior
    async function fetchEvents () {
        try {
            const display: any = await AsyncStorage.getItem("@displayName");
            if (display){
                setDisplayName(display);
            }

            // TODO: We refresh at the start here, which maybe is suboptimal. Perhaps we should only refresh on error. But that seems more complex for now
            if(await refreshAccess() === false) {
                console.log("Failed to refresh authentication");
                navigation.navigate("Login");                    
            }
            
            const access_token = await AsyncStorage.getItem("@access_token");
            const response = await fetch(GRAPHQL_API, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + access_token
                },
                body: JSON.stringify({
                    "operationName": "MyActiveEvents",
                    "variables": {},
                    "query": "query MyActiveEvents { myActiveEvents { ...EventMyActive __typename} } fragment EventMyActive on Event { __typename id venue {...Venue __typename}} fragment Venue on Venue {__typename id name latitude longitude address}"
                }),
            });
            const json = await response.json();
            console.log(json)
            if (response.status == 200) {
                var events: any[] = [];
                for (let event of json["data"]["myActiveEvents"]) {
                    const id: string = event["id"];
                    const venue: string = event["venue"]
                    console.log(event)
                    if (venue != null) {
                        events.push({"id": id, "title": "Event: " + id + " at " + venue});
                    } else {
                        events.push({"id": id, "title": "Event: " + id + " online"});
                    }
                        
                }
                setEventData(events);

            } else {
                //TODO FAILED TO LOG IN
                console.log("Failed to authenticate: ", json);
                navigation.navigate("Login"); 
            }
        }
        catch(e){
            console.log(e);
        }
    }

    // "OnLoad"
    useEffect(() => {
        fetchEvents();
    }, []);
  

    const styles = StyleSheet.create({
        container: {
            flex: 1,
            backgroundColor: '#fff',
            alignItems: 'center',
        },
        titleLabel: {
            flex: 0,
            fontSize: 64,
            fontWeight: 'bold',
        },
        item: {
            backgroundColor: '#71a0e3',
            padding: 20,
            marginVertical: 8,
            marginHorizontal: 16,
        },
        title: {
            fontSize: 32,
        },
        welcome: {
            fontSize: 24,
        },
        noEventsMessage: {
            fontSize: 24,
        },
    });


    const wait = (timeout: number) => {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchEvents();
        wait(1000).then(() => setRefreshing(false));
    }, []);

    const Item = ({ title, onPress, backgroundColor, textColor }: {title: string, onPress: any, backgroundColor: any, textColor: any}) => (
        <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
          <Text style={[styles.title, textColor]}>{title}</Text>
        </TouchableOpacity>
    );
    const renderItem = ({ item }: {item: any}) => (
        <Item title={item.title}
            onPress={() => {navigation.navigate("Standings", {
                eventID: item.id,
              });}}
            backgroundColor={"#6e3b6e"}
            textColor={"black"}
        />
    );

    class EventsList extends Component {
        render() {
            if (eventData.length === 0) {
                return (                
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
                        <SafeAreaView style={styles.container}>
                            <Text style={styles.noEventsMessage}>No events...</Text>
                        </SafeAreaView>
                    </RefreshControl>
                )
            }
            else {
                return (
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh}>
                        <SafeAreaView style={styles.container}>
                            <FlatList
                                data={eventData}
                                renderItem={renderItem}
                                keyExtractor={item => item.id}
                                extraData={selectedId}
                            />
                        </SafeAreaView>
                    </RefreshControl>
                )
            }
        }
    }

    return (
            <View style={styles.container}>
            <Text style={styles.welcome}>Welcome {displayName}</Text>
            <Text style={styles.titleLabel}>Select Event:</Text>
            <EventsList/>
        </View>
    );
}