import {describe, expect, test} from '@jest/globals';
import {GameState, Player, SimulateRound} from './core/gamestate';

test('import / export players', () => {
    var playerA = new Player()
    playerA.personaId = "playerA"
    const playerA_json = playerA.toJSON();
    expect(playerA_json.length).toBeGreaterThan(0)
    playerA.fromJSON(playerA_json)
    expect(playerA).not.toBeNull();

    // Test if clobbering a field works
    var playerB = new Player()
    playerB.personaId = "playerB"
    expect(playerB.personaId).toBe("playerB")
    playerB.fromJSON(playerA_json)
    expect(playerB.personaId).toBe("playerA")

    // Import a whole new player
    const playerC_json = '{"wins":7,"losses":6,"draws":5,"matchPoints":15,"gameWinPercent":0.9,"gameWins":20,"gameLosses":12,"opponentGameWinPercent":0.80,"opponentMatchWinPercent":0.65,"opponents":["one", "two", "three"],"rank":3,"firstName":"first testC","lastName":"last testC","personaId":"playerC","isBye":false}'
    var playerC = new Player()
    playerC.fromJSON(playerC_json)
    expect(playerC.wins).toBe(7)
    expect(playerC.losses).toBe(6)
    expect(playerC.draws).toBe(5)
    expect(playerC.matchPoints).toBe(15)
    expect(playerC.gameWinPercent).toBe(0.9)
    expect(playerC.gameWins).toBe(20)
    expect(playerC.gameLosses).toBe(12)
    expect(playerC.opponentGameWinPercent).toBe(0.8)
    expect(playerC.opponentMatchWinPercent).toBe(0.65)
    expect(playerC.opponents[0]).toBe("one")
    expect(playerC.opponents[1]).toBe("two")
    expect(playerC.opponents[2]).toBe("three")
    expect(playerC.opponents.length).toBe(3)
    expect(playerC.rank).toBe(3)
    expect(playerC.firstName).toBe("first testC")
    expect(playerC.lastName).toBe("last testC")
    expect(playerC.personaId).toBe("playerC")
    expect(playerC.isBye).toBe(false)

    // And then back to a string again, back to an object again
    const serialized = playerC.toJSON()
    playerC.fromJSON(serialized)
    expect(playerC.wins).toBe(7)
    expect(playerC.losses).toBe(6)
    expect(playerC.draws).toBe(5)
    expect(playerC.matchPoints).toBe(15)
    expect(playerC.gameWinPercent).toBe(0.9)
    expect(playerC.gameWins).toBe(20)
    expect(playerC.gameLosses).toBe(12)
    expect(playerC.opponentGameWinPercent).toBe(0.8)
    expect(playerC.opponentMatchWinPercent).toBe(0.65)
    expect(playerC.opponents[0]).toBe("one")
    expect(playerC.opponents[1]).toBe("two")
    expect(playerC.opponents[2]).toBe("three")
    expect(playerC.opponents.length).toBe(3)
    expect(playerC.rank).toBe(3)
    expect(playerC.firstName).toBe("first testC")
    expect(playerC.lastName).toBe("last testC")
    expect(playerC.personaId).toBe("playerC")
    expect(playerC.isBye).toBe(false)
});

test('1000 random pairings from blank', async () => {
    var gamestate: GameState = new GameState();
    var rank: number = 1;
    for (let i = 0; i < 16; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestate.players[player.personaId] = player;
    }
    for (let i = 0; i < 1000; i++){
        gamestate.generateRandomPairings();
        expect(gamestate.pairings.length).toBe(8)
        let uniquePlayers = new Set<string>();
        for (let pairing of gamestate.pairings) {
            expect(pairing.length).toBe(2)
            uniquePlayers.add(pairing[0])
            uniquePlayers.add(pairing[1])
        }
        expect(uniquePlayers.size).toBe(16)

        // Clean up pairings for next iteration
        gamestate.pairings = [];
    }
});

test('round two pairings', async () => {
    var gamestate: GameState = new GameState();
    var rank: number = 1;
    for (let i = 0; i < 16; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestate.players[player.personaId] = player;
    }
    var round1results = await SimulateRound(gamestate, "personaId4", "win")

    for (let i = 0; i < 100; i++){
        // Now that we have some results, let's see if the NEXT round's pairings make sense
        round1results.generateRandomPairings()
        // There should be at most one pair down amongst 1-0 players
        var pairdowns = 0;
        for (let pairing of round1results.pairings) {
            const matchPointsA: number = round1results.players[pairing[0]].matchPoints;
            const matchpointsB: number = round1results.players[pairing[1]].matchPoints;
            if (matchPointsA === 3 || matchpointsB === 3){
                if (matchPointsA + matchpointsB < 6) {
                    pairdowns += 1;
                }
            }
        }
        expect(pairdowns).toBeLessThanOrEqual(1)
        round1results.pairings = []
    }
});

test('16 player gamestate', async () => {
    var gamestate: GameState = new GameState();
    expect(gamestate).not.toBeNull();

    gamestate.minRound = 4;
    var rank: number = 1;
    for (let i = 0; i < 16; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestate.players[player.personaId] = player;
    }

    expect(gamestate.currentRound).toBe(0)

    // Let's have player 4 win 
    var round1results = await SimulateRound(gamestate, "personaId4", "win")
    expect(round1results.currentRound).toBe(1)
    expect(round1results.players["personaId4"].rank).toBeLessThanOrEqual(8)
    const round1opponent: string = round1results.players["personaId4"].opponents[0]
    expect(round1results.players[round1opponent].opponents[0]).toBe("personaId4")
    expect(round1results.players["personaId4"].opponents[0]).toBe(round1opponent)
    expect(round1results.players["personaId4"].wins).toBe(1)
    expect(round1results.players["personaId4"].losses).toBe(0)
    expect(round1results.players["personaId4"].draws).toBe(0)
    expect(round1results.players["personaId4"].matchPoints).toBe(3)
    expect(round1results.players["personaId4"].opponentMatchWinPercent).toBeCloseTo(0.3333333333333333)
    expect(round1results.players["personaId4"].opponentGameWinPercent).toBeLessThan(0.5)
    expect(round1results.players["personaId4"].gameWins).toBe(2)

    // Round 2
    var round2results = await SimulateRound(round1results, "personaId4", "win")
    expect(round2results.currentRound).toBe(2)
    expect(round2results.players["personaId4"].rank).toBeLessThanOrEqual(4)
    
    // Round 3
    var round3results = await SimulateRound(round2results, "personaId4", "win")
    expect(round3results.currentRound).toBe(3)
    expect(round3results.players["personaId4"].rank).toBeLessThanOrEqual(2)

    // Round 4
    var round4results = await SimulateRound(round3results, "personaId4", "win")
    expect(round4results.currentRound).toBe(4)
    expect(round4results.players["personaId4"].rank).toBe(1)
    expect(round4results.players["personaId4"].wins).toBe(4)
    expect(round4results.players["personaId4"].matchPoints).toBe(12)
    const lastopponent: string = round4results.players["personaId4"].opponents[3]
    expect(round4results.players[lastopponent].opponents[3]).toBe("personaId4")

    expect(round4results.players["personaId7"].wins).not.toBeNaN()

    //TODO TEST there should be no byes
});

// TODO: Test if wizards' pairings tries to avoid double pair-down
// in instance where it's:
// A, B, C, D (but Cand D have played each other already)
// Does it: A) Always prefer to have C play A/B and D play B/A? (to deliberately avoid the pair down)
//  or      B) Choose randomly anyway, resulting in a double pair-down 1/3 of the time.
//              A has 3 choices to pair with. Pairing with B makes it so that C and D both pair down

