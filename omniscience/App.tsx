import React, { useState, useEffect } from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { NavigationContainer } from "@react-navigation/native";
import { StackRouter } from 'react-navigation';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './screens/loginscreen'
import { EventsScreen } from './screens/eventsscreen'
import { StandingsScreen } from './screens/standingsscreen';
import { createStackNavigator } from '@react-navigation/stack';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='LoginScreen'>
        <Stack.Screen
          name="Login"
          component={LoginScreen}>
        </Stack.Screen>
        <Stack.Screen
          name="Events"
          component={EventsScreen}>
        </Stack.Screen>
        <Stack.Screen
          name="Standings"
          component={StandingsScreen}>
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
