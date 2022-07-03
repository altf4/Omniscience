import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export const LoginScreen = ({navigation}: {navigation: any}) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    var [accessToken, setAccessToken] = useState('');
    var [failedAuth, setFailedAuth] = useState(false);

    async function saveAccessToken(value: string) {
      try{
        await AsyncStorage.setItem("@access_token", value);
      }
      catch(e){
        console.log(e);
      }
    }

    // Are we already logged in?
    useEffect(() => {
      setFailedAuth(false);
      async function loadAccessToken () {
        try {
         const value = await AsyncStorage.getItem("@access_token");
         if (value !== null) {
           // Value previously stored
           setAccessToken(value);
           navigation.navigate("DetailsScreen")
         }
       }
       catch(e){
         console.log(e);
       }
     }

     loadAccessToken();
      
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
        subtitle: {
          flex: 0,
          fontSize: 18,
        },
        username: {
          flex: 0,
          fontSize: 18,
        },
        password: {
          flex: 0,
          fontSize: 18,
        },
        loginButton: {
          flex: 0,
        },
        faildauth: {
          flex: 0,
          opacity: failedAuth ? 100 : 0,
          color: "red"
        }
      });


    async function onLoginPress(event: any, username: string, password: string, navigator: any) {       
        const formdata = new URLSearchParams({
          "grant_type": "password", 
          "username": username,
          "password": password,
        });
        const response = await fetch('https://api.platform.wizards.com/auth/oauth/token', {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": "Basic V0pSWURITkdST0laSEw4QjpWNVZYSzZGTEcxWUkwR0QyWFkzSA=="
          },
          body: formdata,
        });
        const json = await response.json();
        if (response.status == 200) {
          setFailedAuth(false)
          await saveAccessToken(json["access_token"]);
          console.log(json);
          navigator.navigate("DetailsScreen")
        } else {
          //TODO FAILED TO LOG IN
          setFailedAuth(true)
        }
    }

    return (
        <View style={styles.container}>
        <Text style={styles.titleLabel}>Can I Draw In?</Text>
        <Text style={styles.subtitle}>Enter your Companion App credentials</Text>
        <TextInput style={styles.username} placeholder="Username" onChangeText={(username) => setUsername(username)}/>
        <TextInput style={styles.password} placeholder="Password" secureTextEntry={true} onChangeText={(password) => setPassword(password)}/>
        <Button title="Login" onPress={(e) => onLoginPress(e, username, password, navigation)}/>
        <Text style={[styles.faildauth]}>Login Failed</Text>
        <StatusBar style="auto" />
      </View>
    );
  };