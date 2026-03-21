import React from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './screens/loginscreen'
import { EventsScreen } from './screens/eventsscreen'
import { StandingsScreen } from './screens/standingsscreen';

export type RootStackParamList = {
  Login: undefined;
  Events: undefined;
  Standings: { eventID: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName='Login'>
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
