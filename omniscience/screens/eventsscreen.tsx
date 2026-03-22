import { StyleSheet, Text, RefreshControl, View, SafeAreaView, TouchableOpacity, FlatList } from 'react-native';
import React, { Component, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../App';
import { colors, radius, spacing, commonStyles } from '../theme';

type Props = NativeStackScreenProps<RootStackParamList, 'Events'>;

interface EventItem {
    id: string;
    title: string;
}

export const EventsScreen = ({ navigation }: Props) => {
    const OAUTH_API = "https://api.platform.wizards.com/auth/oauth/token"
    // const GRAPHQL_API = "https://api2.tabletop.tiamat-origin.cloud/silverbeak-griffin-service/graphql"
    const GRAPHQL_API = "https://api.tabletop.wizards.com/silverbeak-griffin-service/graphql"

    const [selectedId, setSelectedId] = useState<string | null>(null);
    const [eventData, setEventData] = useState<EventItem[]>([]);
    const [displayName, setDisplayName] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    // Fetches a new access token from our current refresh token
    async function refreshAccess() {
        const value = await AsyncStorage.getItem("@refresh_token");
        if (value !== null) {
            const formdata = new URLSearchParams({
                "grant_type": "refresh_token",
                "refresh_token": value,
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
            if (response.status === 200) {
                await AsyncStorage.setItem("@access_token", json["access_token"]);
                return true
            } else {
                return false
            }
        } else {
            return false
        }
    }

    //Get a list of events the user is in
    // TODO: Make this a pure function that gets an events structure and have callers responsible for page behavior
    async function fetchEvents() {
        try {
            const display = await AsyncStorage.getItem("@displayName");
            if (display) {
                setDisplayName(display);
            }

            // TODO: We refresh at the start here, which maybe is suboptimal. Perhaps we should only refresh on error. But that seems more complex for now
            if (await refreshAccess() === false) {
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
            console.log(json)
            if (response.status === 200) {
                const events: EventItem[] = [];
                for (let event of json["data"]["myActiveEvents"]) {
                    const id: string = event["id"];
                    const venue: string = event["venue"]
                    console.log(event)
                    if (venue != null) {
                        events.push({ "id": id, "title": "Event: " + id + " at " + venue });
                    } else {
                        events.push({ "id": id, "title": "Event: " + id + " online" });
                    }

                }
                setEventData(events);

            } else {
                //TODO FAILED TO LOG IN
                console.log("Failed to authenticate: ", json);
                navigation.navigate("Login");
            }
        }
        catch (e) {
            console.log(e);
        }
    }

    // "OnLoad"
    useEffect(() => {
        fetchEvents();
    }, []);


    const wait = (timeout: number) => {
        return new Promise(resolve => setTimeout(resolve, timeout));
    }
    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        fetchEvents();
        wait(1000).then(() => setRefreshing(false));
    }, []);

    const Item = ({ title, onPress }: { title: string, onPress: () => void }) => (
        <TouchableOpacity onPress={onPress} style={styles.eventCard} activeOpacity={0.7}>
            <Text style={styles.eventTitle}>{title}</Text>
            <Text style={styles.eventArrow}>›</Text>
        </TouchableOpacity>
    );
    const renderItem = ({ item }: { item: EventItem }) => (
        <Item title={item.title}
            onPress={() => {
                navigation.navigate("Standings", {
                    eventID: item.id,
                });
            }}
        />
    );

    class EventsList extends Component {
        render() {
            if (eventData.length === 0) {
                return (
                    <View style={styles.emptyState}>
                        <Text style={styles.emptyIcon}>🎴</Text>
                        <Text style={styles.emptyTitle}>No active events</Text>
                        <Text style={styles.emptySubtitle}>Pull down to refresh</Text>
                    </View>
                )
            }
            else {
                return (
                    <SafeAreaView style={styles.listContainer}>
                        <FlatList
                            data={eventData}
                            renderItem={renderItem}
                            keyExtractor={item => item.id}
                            extraData={selectedId}
                            refreshControl={
                                <RefreshControl
                                    refreshing={refreshing}
                                    onRefresh={onRefresh}
                                    tintColor={colors.textSecondary}
                                />
                            }
                            contentContainerStyle={styles.listContent}
                        />
                    </SafeAreaView>
                )
            }
        }
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcomeText}>Welcome, {displayName}</Text>
                <Text style={styles.titleLabel}>Select Event</Text>
            </View>
            <EventsList />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        paddingHorizontal: spacing.xxl,
        paddingTop: spacing.xl,
        paddingBottom: spacing.lg,
    },
    welcomeText: {
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: spacing.xs,
    },
    titleLabel: {
        fontSize: 28,
        fontWeight: 'bold',
        color: colors.textPrimary,
    },
    listContainer: {
        flex: 1,
    },
    listContent: {
        paddingHorizontal: spacing.lg,
        paddingBottom: spacing.xxl,
    },
    eventCard: {
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        padding: spacing.xl,
        marginBottom: spacing.md,
        borderWidth: 1,
        borderColor: colors.border,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    eventTitle: {
        fontSize: 16,
        color: colors.textPrimary,
        flex: 1,
    },
    eventArrow: {
        fontSize: 24,
        color: colors.textMuted,
        marginLeft: spacing.md,
    },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingBottom: 100,
    },
    emptyIcon: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: colors.textSecondary,
        marginBottom: spacing.sm,
    },
    emptySubtitle: {
        fontSize: 15,
        color: colors.textMuted,
    },
});
