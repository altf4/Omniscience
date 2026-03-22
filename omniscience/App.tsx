import React from 'react';
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from './screens/loginscreen'
import { EventsScreen } from './screens/eventsscreen'
import { StandingsScreen } from './screens/standingsscreen';
import { colors } from './theme';

export type RootStackParamList = {
  Login: undefined;
  Events: undefined;
  Standings: { eventID: string };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName='Login'
        screenOptions={{
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: '600' },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
          options={{ headerShown: false }}>
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
