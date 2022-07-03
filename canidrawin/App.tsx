import React, {useState, useEffect} from 'react';
import { Button, StyleSheet, Text, TextInput, View } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {NavigationContainer} from "@react-navigation/native";
import { StackRouter } from 'react-navigation';
import {createNativeStackNavigator} from '@react-navigation/native-stack';
import {LoginScreen} from './screens/loginscreen'
import {DetailsScreen} from './screens/detailsscreen'
import { createStackNavigator } from '@react-navigation/stack';

// const Stack = createStackNavigator<RootStackParamList>();
const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='LoginScreen'>
        <Stack.Screen
          name="LoginScreen"
          component={LoginScreen}>
        </Stack.Screen>
        <Stack.Screen
          name="DetailsScreen"
          component={DetailsScreen}>
        </Stack.Screen>
      </Stack.Navigator>
    </NavigationContainer>
  );
}
