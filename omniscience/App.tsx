import React from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './screens/loginscreen'
import { EventsScreen } from './screens/eventsscreen'
import { StandingsScreen } from './screens/standingsscreen';

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
