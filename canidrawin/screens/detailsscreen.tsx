import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export const DetailsScreen = ({navigation}: {navigation: any}) => {
    var [accessToken, setAccessToken] = useState('');
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
               
                await loadAccessToken();
                const response = await fetch(GRAPHQL_API, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                        "Authorization": "Bearer" + accessToken
                    },
                    body: JSON.stringify({
                        "operationName": "MyActiveEvents",
                        "variables": {},
                        "query": "query MyActiveEvents { myActiveEvents { ...EventMyActive __typename} } fragment EventMyActive on Event { __typename id venue {...Venue __typename}} fragment Venue on Venue {__typename id name latitude longitude address}"
                    }),
                });
                const json = await response.json();
                if (response.status == 200) {
                    console.log(json);
                } else {
                    //TODO FAILED TO LOG IN
                    console.log(json);
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
        }
    });

    return (
        <View style={styles.container}>
        <Text style={styles.titleLabel}>Details</Text>
      </View>
    );
}