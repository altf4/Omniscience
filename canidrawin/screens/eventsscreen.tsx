import { Button, StyleSheet, Text, TextInput, View, SafeAreaView, TouchableOpacity, FlatList, ViewStyle} from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const EventsScreen = ({navigation}: {navigation: any}) => {
    var [accessToken, setAccessToken] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [eventData, setEventData] = useState([]);
    const [displayName, setDisplayName] = useState('');

    const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"

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
        //Get a list of events the user is in
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
                if (response.status == 200) {
                    //TODO List ALL events, not just first
                    const id = json["data"]["myActiveEvents"][0]["id"];
                    setEventData([{"id": id, "title": "Event: " + id}]);
                    console.log(eventData);

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
    });


    const Item = ({ title, onPress, backgroundColor, textColor }: {title: string, onPress: any, backgroundColor: any, textColor: any}) => (
        <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
          <Text style={[styles.title, textColor]}>{title}</Text>
        </TouchableOpacity>
    );
    const renderItem = ({ item }: {item: any}) => (
        <Item title={item.title}
            onPress={() => {console.log("Passing over to " + item.id); navigation.navigate("Standings", {
                eventID: item.id,
              });}}
            backgroundColor={"#6e3b6e"}
            textColor={"black"}
        />
    );

    return (
        <View style={styles.container}>
        <Text style={styles.welcome}>Welcome {displayName}</Text>
        <Text style={styles.titleLabel}>Select Event:</Text>
        <SafeAreaView style={styles.container}>
            <FlatList
                data={eventData}
                renderItem={renderItem}
                keyExtractor={item => item.id}
                extraData={selectedId}
            />
        </SafeAreaView>
      </View>
    );
}