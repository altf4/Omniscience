import { Button, StyleSheet, Text, TextInput, View, SafeAreaView, TouchableOpacity, FlatList, ViewStyle} from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export const DetailsScreen = ({navigation}: {navigation: any}) => {
    var [accessToken, setAccessToken] = useState('');
    const [selectedId, setSelectedId] = useState(null);
    const [eventData, seteventData] = useState([]);

    const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"

    // "OnLoad"
    useEffect(() => {
        
        //Get a list of events the user is in
        async function fetchEvents () {
            try {
                async function loadAccessToken () {
                    try {
                        const value = await AsyncStorage.getItem("@access_token");
                        if (value !== null) {
                            // Value previously stored
                            setAccessToken(value);
                        } else{
                            navigation.navigate("LoginScreen")
                        }
                    }
                    catch(e){
                        console.log(e);
                        navigation.navigate("LoginScreen")
                    }
                }
               
                const value = await AsyncStorage.getItem("@access_token");
                await loadAccessToken();
                const response = await fetch(GRAPHQL_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": "Bearer " + value
                    },
                    body: JSON.stringify({
                        "operationName": "MyActiveEvents",
                        "variables": {},
                        "query": "query MyActiveEvents { myActiveEvents { ...EventMyActive __typename} } fragment EventMyActive on Event { __typename id venue {...Venue __typename}} fragment Venue on Venue {__typename id name latitude longitude address}"
                    }),
                });
                const json = await response.json();
                if (response.status == 200) {
                    const id = json["data"]["myActiveEvents"][0]["id"];
                    seteventData([{"id": id, "title": "Event: " + id}]);
                    console.log(eventData);

                } else {
                    //TODO FAILED TO LOG IN
                    console.log("Failed to authenticate: ", json);
                    navigation.navigate("LoginScreen");
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
            // top: "10%",
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
    });


    const Item = ({ title, onPress, backgroundColor, textColor }: {title: string, onPress: any, backgroundColor: any, textColor: any}) => (
        <TouchableOpacity onPress={onPress} style={[styles.item, backgroundColor]}>
          <Text style={[styles.title, textColor]}>{title}</Text>
        </TouchableOpacity>
    );
    const renderItem = ({ item }: {item: any}) => (
        <Item title={item.title}
            onPress={() => {console.log("selectedId " + selectedId); setSelectedId(item.id)}}
            backgroundColor={"#6e3b6e"}
            textColor={"black"}
        />
    );

    return (
        <View style={styles.container}>
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