import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import React, {useState, useEffect} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

export const LoginScreen = ({navigation}: {navigation: any}) => {
  const OAUTH_API = "https://api.platform.wizards.com/auth/oauth/token"

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  var [accessToken, setAccessToken] = useState('');
  var [refreshToken, setRefreshToken] = useState('');
  var [failedAuth, setFailedAuth] = useState(false);

  // Are we already logged in?
  useEffect(() => {
    setFailedAuth(false);
    async function loadAccessToken () {
      try {
        const value = await AsyncStorage.getItem("@access_token");
        if (value !== null) {
          // Value previously stored
          setAccessToken(value);
          navigation.navigate("Events")
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
      bottomsubtitle: {
        flex: 0,
        fontSize: 12,
      },      
      username: {
        flex: 1,
        fontSize: 18,
      },
      password: {
        flex: 1,
        fontSize: 18,
      },
      loginButton: {
        flex: 1,
        fontSize: 30,
      },
      faildauth: {
        flex: 0,
        opacity: failedAuth ? 100 : 0,
        color: "red"
      },
    });


  async function onLoginPress(event: any, username: string, password: string, navigator: any) {       
      const formdata = new URLSearchParams({
        "grant_type": "password", 
        "username": username,
        "password": password,
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
        setFailedAuth(false)
        await AsyncStorage.setItem("@access_token", json["access_token"]);
        await AsyncStorage.setItem("@refresh_token", json["refresh_token"]);
        await AsyncStorage.setItem("@ourPersonaId", json["persona_id"]);
        await AsyncStorage.setItem("@displayName", json["display_name"]);
        navigator.navigate("Events")
      } else {
        //TODO FAILED TO LOG IN
        setFailedAuth(true)
      }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.titleLabel}>Omniscience</Text>
      <Text style={styles.subtitle}>Enter your Companion App credentials</Text>
      <TextInput style={styles.username} placeholder="Username" onChangeText={(username) => setUsername(username)}/>
      <TextInput style={styles.password} placeholder="Password" secureTextEntry={true} onChangeText={(password) => setPassword(password)}/>
      <Button title="Login" onPress={(e) => onLoginPress(e, username, password, navigation)}/>
      <Text style={[styles.faildauth]}>Login Failed</Text>
      <Text style={styles.bottomsubtitle}>Math is for blockers, not top 8 competitors</Text>
      <StatusBar style="auto" />
    </View>
  );
};