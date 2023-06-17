import {describe, expect, test} from '@jest/globals';
import {GameState, Player, SimulateRound, SimulateEvent} from './core/gamestate';

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

test('import / export gamestate', () => {
    var gamestateA: GameState = new GameState();
    // Saturate it with 16 players
    var rank: number = 1;
    for (let i = 0; i < 16; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestateA.players[player.personaId] = player;
    }
    gamestateA.currentRound = 1
    gamestateA.generateRandomPairings()
    const gamestate_js = gamestateA.toJSON()
    expect(gamestate_js.length).toBeGreaterThan(0);

    var gamestateB: GameState = new GameState();
    gamestateB.fromJSON(gamestate_js)
    expect(gamestateB.pairings.length).toBe(8)
    expect(gamestateB.players["personaId7"].firstName).toBe("first7")
});

test('thick copy gamestate', () => {
    var gamestateA: GameState = new GameState();
    gamestateA.minRound = 7;
    // Saturate it with 16 players
    var rank: number = 1;
    for (let i = 0; i < 16; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestateA.players[player.personaId] = player;
    }
    gamestateA.generateRandomPairings()

    var gamestateB: GameState = gamestateA.copy()
    for (let personaId in gamestateA.players) {
        expect(gamestateA.players[personaId].lastName).toBe(gamestateB.players[personaId].lastName)
        expect(gamestateA.players[personaId].firstName).toBe(gamestateB.players[personaId].firstName)
        expect(gamestateA.players[personaId].rank).toBe(gamestateB.players[personaId].rank)
    }
    expect(gamestateB.minRound).toBe(7)
    for (let i = 0; i < gamestateA.pairings.length; i++) {
        expect(gamestateA.pairings[i]).toStrictEqual(gamestateB.pairings[i])
    }
    
});

test('sorting players', () => {
    var gamestateA: GameState = new GameState();
    gamestateA.minRound = 7;
    // Saturate it with 16 players
    var rank: number = 1;
    for (let i = 0; i < 16; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestateA.players[player.personaId] = player;
    }
    // But two players have different game scores
    gamestateA.players["personaId8"].gameWinPercent = 1

    const sortedPlayers: Player[] = gamestateA.getSortedPlayers();
    expect(sortedPlayers.length).toBe(16)
    expect(sortedPlayers[0].personaId).toBe("personaId8")
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

test('16 player gamestate wins', async () => {
    for (let j = 0; j < 100; j++){
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

        expect(round1results.players["bye"]).toBe(undefined)

        // Round 2
        var round2results = await SimulateRound(round1results, "personaId4", "win")
        expect(round2results.currentRound).toBe(2)
        expect(round2results.players["personaId4"].rank).toBeLessThanOrEqual(4)
        expect(round2results.players["bye"]).toBe(undefined)
        
        // Round 3
        var round3results = await SimulateRound(round2results, "personaId4", "win")
        expect(round3results.currentRound).toBe(3)
        expect(round3results.players["personaId4"].rank).toBeLessThanOrEqual(2)
        expect(round3results.players["bye"]).toBe(undefined)

        // There should be no bye players
        const sortedPlayers = round3results.getSortedPlayers()
        expect(sortedPlayers.length).toBe(16)
        for (let x = 0; x < sortedPlayers.length; x++){
            expect(sortedPlayers[x].personaId).not.toBe("bye")
        }

        // Round 4
        var round4results = await SimulateRound(round3results, "personaId4", "win")
        expect(round4results.currentRound).toBe(4)
        expect(round4results.players["personaId4"].rank).toBe(1)
        expect(round4results.players["personaId4"].wins).toBe(4)
        expect(round4results.players["personaId4"].matchPoints).toBe(12)
        const lastopponent: string = round4results.players["personaId4"].opponents[3]
        expect(round4results.players[lastopponent].opponents[3]).toBe("personaId4")
        expect(round4results.players["bye"]).toBe(undefined)

        expect(round4results.players["personaId7"].wins).not.toBeNaN()
    }
});

test('16 player gamestate losses', async () => {   
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
    
    var round1results = await SimulateRound(gamestate, "personaId4", "loss")
    expect(round1results.players["personaId4"].matchPoints).toBe(0)

    var round2results = await SimulateRound(round1results, "personaId4", "loss")
    expect(round1results.players["personaId4"].matchPoints).toBe(0)

    var round3results = await SimulateRound(round2results, "personaId4", "loss")
    expect(round1results.players["personaId4"].matchPoints).toBe(0)

    var round4results = await SimulateRound(round3results, "personaId4", "loss")
    expect(round1results.players["personaId4"].matchPoints).toBe(0)

    // Cover a draw
    var alternateRound4 = await SimulateRound(round3results, "personaId4", "draw")
    expect(alternateRound4.players["personaId4"].matchPoints).toBe(1)
});

test('garbage input to SimulateRound', async () => {
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
    await expect(SimulateRound(gamestate, "personaId4", "garbage")).rejects.toThrow(TypeError)

});

test('7 players with a bye', async () => {
    var gamestate: GameState = new GameState();
    expect(gamestate).not.toBeNull();

    gamestate.minRound = 4;
    var rank: number = 1;
    for (let i = 0; i < 7; i++){
        var player = new Player();
        player.personaId = "personaId" + i;
        player.firstName = "first" + i;
        player.lastName = "last" + i;
        player.rank = rank;
        rank += 1;
        gamestate.players[player.personaId] = player;
    }
    var bye = new Player();
    bye.personaId = "bye";
    bye.firstName = "f-bye";
    bye.lastName = "l-bye";
    bye.rank = 8;
    bye.isBye = true
    gamestate.players["bye"] = bye
    gamestate.generateRandomPairings()

    var round1results = await SimulateRound(gamestate, "personaId4", "win")
    expect(round1results.players["bye"].matchPoints).toBe(0)

    var round2results = await SimulateRound(round1results, "personaId4", "loss")
    expect(round2results.players["bye"].matchPoints).toBe(0)

    var round3results = await SimulateRound(round2results, "personaId4", "loss")
    expect(round3results.players["bye"].matchPoints).toBe(0)

});

test('gamestate that requires backup to make pairings', () => {
    // var requiresBackup = '{"players":{"personaId0":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6,"gameWins":3,"gameLosses":2,"opponentGameWinPercent":0.9888888888888889,"opponentMatchWinPercent":1.0000000000000002,"opponents":["personaId11","personaId13","personaId3","personaId15"],"rank":8,"firstName":"first0","lastName":"last0","personaId":"personaId0","isBye":false},"personaId1":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6,"gameWins":3,"gameLosses":2,"opponentGameWinPercent":0.811111111111111,"opponentMatchWinPercent":0.8888888888888888,"opponents":["personaId8","personaId15","personaId14","personaId2"],"rank":4,"firstName":"first1","lastName":"last1","personaId":"personaId1","isBye":false},"personaId2":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.5,"gameWins":3,"gameLosses":3,"opponentGameWinPercent":0.9638888888888889,"opponentMatchWinPercent":1.1944444444444444,"opponents":["personaId10","personaId14","personaId11","personaId1"],"rank":2,"firstName":"first2","lastName":"last2","personaId":"personaId2","isBye":false},"personaId3":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6666666666666666,"gameWins":4,"gameLosses":2,"opponentGameWinPercent":0.811111111111111,"opponentMatchWinPercent":1.0000000000000002,"opponents":["personaId4","personaId8","personaId0","personaId6"],"rank":9,"firstName":"first3","lastName":"last3","personaId":"personaId3","isBye":false},"personaId4":{"wins":3,"losses":0,"draws":0,"matchPoints":9,"gameWinPercent":0.6666666666666666,"gameWins":6,"gameLosses":3,"opponentGameWinPercent":0.7861111111111111,"opponentMatchWinPercent":0.6666666666666666,"opponents":["personaId3","personaId5","personaId15","personaId11"],"rank":1,"firstName":"first4","lastName":"last4","personaId":"personaId4","isBye":false},"personaId5":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.375,"gameWins":3,"gameLosses":5,"opponentGameWinPercent":0.7083333333333334,"opponentMatchWinPercent":0.8611111111111112,"opponents":["personaId9","personaId4","personaId8","personaId13"],"rank":11,"firstName":"first5","lastName":"last5","personaId":"personaId5","isBye":false},"personaId6":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.5,"gameWins":3,"gameLosses":3,"opponentGameWinPercent":0.8638888888888889,"opponentMatchWinPercent":0.9444444444444443,"opponents":["personaId12","personaId11","personaId10","personaId3"],"rank":5,"firstName":"first6","lastName":"last6","personaId":"personaId6","isBye":false},"personaId7":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.42857142857142855,"gameWins":3,"gameLosses":4,"opponentGameWinPercent":0.8638888888888889,"opponentMatchWinPercent":1.0833333333333333,"opponents":["personaId14","personaId10","personaId12","personaId8"],"rank":15,"firstName":"first7","lastName":"last7","personaId":"personaId7","isBye":false},"personaId8":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.3333333333333333,"gameWins":2,"gameLosses":4,"opponentGameWinPercent":0.9805555555555555,"opponentMatchWinPercent":0.8611111111111112,"opponents":["personaId1","personaId3","personaId5","personaId7"],"rank":13,"firstName":"first8","lastName":"last8","personaId":"personaId8","isBye":false},"personaId9":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.375,"gameWins":3,"gameLosses":5,"opponentGameWinPercent":0.5972222222222222,"opponentMatchWinPercent":0.6388888888888888,"opponents":["personaId5","personaId12","personaId13"],"rank":12,"firstName":"first9","lastName":"last9","personaId":"personaId9","isBye":false},"personaId10":{"wins":2,"losses":1,"draws":0,"matchPoints":6,"gameWinPercent":0.625,"gameWins":5,"gameLosses":3,"opponentGameWinPercent":0.753968253968254,"opponentMatchWinPercent":0.8333333333333334,"opponents":["personaId2","personaId7","personaId6","personaId14"],"rank":10,"firstName":"first10","lastName":"last10","personaId":"personaId10","isBye":false},"personaId11":{"wins":2,"losses":0,"draws":1,"matchPoints":7,"gameWinPercent":0.8,"gameWins":4,"gameLosses":1,"opponentGameWinPercent":0.7833333333333333,"opponentMatchWinPercent":0.8055555555555555,"opponents":["personaId0","personaId6","personaId2","personaId4"],"rank":3,"firstName":"first11","lastName":"last11","personaId":"personaId11","isBye":false},"personaId12":{"wins":0,"losses":3,"draws":0,"matchPoints":0,"gameWinPercent":0.3333333333333333,"gameWins":2,"gameLosses":6,"opponentGameWinPercent":0.740079365079365,"opponentMatchWinPercent":0.8055555555555557,"opponents":["personaId6","personaId9","personaId7"],"rank":16,"firstName":"first12","lastName":"last12","personaId":"personaId12","isBye":false},"personaId13":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.3333333333333333,"gameWins":2,"gameLosses":4,"opponentGameWinPercent":0.9416666666666668,"opponentMatchWinPercent":0.8611111111111112,"opponents":["personaId15","personaId0","personaId9","personaId5"],"rank":14,"firstName":"first13","lastName":"last13","personaId":"personaId13","isBye":false},"personaId14":{"wins":2,"losses":0,"draws":1,"matchPoints":7,"gameWinPercent":0.6666666666666666,"gameWins":4,"gameLosses":2,"opponentGameWinPercent":0.7317460317460317,"opponentMatchWinPercent":0.7222222222222222,"opponents":["personaId7","personaId2","personaId1","personaId10"],"rank":7,"firstName":"first14","lastName":"last14","personaId":"personaId14","isBye":false},"personaId15":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6,"gameWins":3,"gameLosses":2,"opponentGameWinPercent":0.811111111111111,"opponentMatchWinPercent":0.8888888888888888,"opponents":["personaId13","personaId1","personaId4","personaId0"],"rank":6,"firstName":"first15","lastName":"last15","personaId":"personaId15","isBye":false}},"pairings":[],"minRound":4,"currentRound":3,"roundHistory":[]}'
    var gamestate: GameState = new GameState();
    gamestate.players = JSON.parse('{"personaId0":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6,"gameWins":3,"gameLosses":2,"opponentGameWinPercent":0.9888888888888889,"opponentMatchWinPercent":1.0000000000000002,"opponents":["personaId11","personaId13","personaId3","personaId15"],"rank":8,"firstName":"first0","lastName":"last0","personaId":"personaId0","isBye":false},"personaId1":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6,"gameWins":3,"gameLosses":2,"opponentGameWinPercent":0.811111111111111,"opponentMatchWinPercent":0.8888888888888888,"opponents":["personaId8","personaId15","personaId14","personaId2"],"rank":4,"firstName":"first1","lastName":"last1","personaId":"personaId1","isBye":false},"personaId2":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.5,"gameWins":3,"gameLosses":3,"opponentGameWinPercent":0.9638888888888889,"opponentMatchWinPercent":1.1944444444444444,"opponents":["personaId10","personaId14","personaId11","personaId1"],"rank":2,"firstName":"first2","lastName":"last2","personaId":"personaId2","isBye":false},"personaId3":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6666666666666666,"gameWins":4,"gameLosses":2,"opponentGameWinPercent":0.811111111111111,"opponentMatchWinPercent":1.0000000000000002,"opponents":["personaId4","personaId8","personaId0","personaId6"],"rank":9,"firstName":"first3","lastName":"last3","personaId":"personaId3","isBye":false},"personaId4":{"wins":3,"losses":0,"draws":0,"matchPoints":9,"gameWinPercent":0.6666666666666666,"gameWins":6,"gameLosses":3,"opponentGameWinPercent":0.7861111111111111,"opponentMatchWinPercent":0.6666666666666666,"opponents":["personaId3","personaId5","personaId15","personaId11"],"rank":1,"firstName":"first4","lastName":"last4","personaId":"personaId4","isBye":false},"personaId5":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.375,"gameWins":3,"gameLosses":5,"opponentGameWinPercent":0.7083333333333334,"opponentMatchWinPercent":0.8611111111111112,"opponents":["personaId9","personaId4","personaId8","personaId13"],"rank":11,"firstName":"first5","lastName":"last5","personaId":"personaId5","isBye":false},"personaId6":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.5,"gameWins":3,"gameLosses":3,"opponentGameWinPercent":0.8638888888888889,"opponentMatchWinPercent":0.9444444444444443,"opponents":["personaId12","personaId11","personaId10","personaId3"],"rank":5,"firstName":"first6","lastName":"last6","personaId":"personaId6","isBye":false},"personaId7":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.42857142857142855,"gameWins":3,"gameLosses":4,"opponentGameWinPercent":0.8638888888888889,"opponentMatchWinPercent":1.0833333333333333,"opponents":["personaId14","personaId10","personaId12","personaId8"],"rank":15,"firstName":"first7","lastName":"last7","personaId":"personaId7","isBye":false},"personaId8":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.3333333333333333,"gameWins":2,"gameLosses":4,"opponentGameWinPercent":0.9805555555555555,"opponentMatchWinPercent":0.8611111111111112,"opponents":["personaId1","personaId3","personaId5","personaId7"],"rank":13,"firstName":"first8","lastName":"last8","personaId":"personaId8","isBye":false},"personaId9":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.375,"gameWins":3,"gameLosses":5,"opponentGameWinPercent":0.5972222222222222,"opponentMatchWinPercent":0.6388888888888888,"opponents":["personaId5","personaId12","personaId13"],"rank":12,"firstName":"first9","lastName":"last9","personaId":"personaId9","isBye":false},"personaId10":{"wins":2,"losses":1,"draws":0,"matchPoints":6,"gameWinPercent":0.625,"gameWins":5,"gameLosses":3,"opponentGameWinPercent":0.753968253968254,"opponentMatchWinPercent":0.8333333333333334,"opponents":["personaId2","personaId7","personaId6","personaId14"],"rank":10,"firstName":"first10","lastName":"last10","personaId":"personaId10","isBye":false},"personaId11":{"wins":2,"losses":0,"draws":1,"matchPoints":7,"gameWinPercent":0.8,"gameWins":4,"gameLosses":1,"opponentGameWinPercent":0.7833333333333333,"opponentMatchWinPercent":0.8055555555555555,"opponents":["personaId0","personaId6","personaId2","personaId4"],"rank":3,"firstName":"first11","lastName":"last11","personaId":"personaId11","isBye":false},"personaId12":{"wins":0,"losses":3,"draws":0,"matchPoints":0,"gameWinPercent":0.3333333333333333,"gameWins":2,"gameLosses":6,"opponentGameWinPercent":0.740079365079365,"opponentMatchWinPercent":0.8055555555555557,"opponents":["personaId6","personaId9","personaId7"],"rank":16,"firstName":"first12","lastName":"last12","personaId":"personaId12","isBye":false},"personaId13":{"wins":1,"losses":2,"draws":0,"matchPoints":3,"gameWinPercent":0.3333333333333333,"gameWins":2,"gameLosses":4,"opponentGameWinPercent":0.9416666666666668,"opponentMatchWinPercent":0.8611111111111112,"opponents":["personaId15","personaId0","personaId9","personaId5"],"rank":14,"firstName":"first13","lastName":"last13","personaId":"personaId13","isBye":false},"personaId14":{"wins":2,"losses":0,"draws":1,"matchPoints":7,"gameWinPercent":0.6666666666666666,"gameWins":4,"gameLosses":2,"opponentGameWinPercent":0.7317460317460317,"opponentMatchWinPercent":0.7222222222222222,"opponents":["personaId7","personaId2","personaId1","personaId10"],"rank":7,"firstName":"first14","lastName":"last14","personaId":"personaId14","isBye":false},"personaId15":{"wins":1,"losses":1,"draws":1,"matchPoints":4,"gameWinPercent":0.6,"gameWins":3,"gameLosses":2,"opponentGameWinPercent":0.811111111111111,"opponentMatchWinPercent":0.8888888888888888,"opponents":["personaId13","personaId1","personaId4","personaId0"],"rank":6,"firstName":"first15","lastName":"last15","personaId":"personaId15","isBye":false}}')
    // gamestate.fromJSON(requiresBackup)
    gamestate.minRound = 4
    gamestate.currentRound = 3

    gamestate.generateRandomPairings()
});

test('simulate whole event', async () => {
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

    console.log(await SimulateEvent(100, gamestate, ["win", "win", "draw", "draw"], "personaId2", undefined))
});

// TODO: Test if wizards' pairings tries to avoid double pair-down
// in instance where it's:
// A, B, C, D (but Cand D have played each other already)
// Does it: A) Always prefer to have C play A/B and D play B/A? (to deliberately avoid the pair down)
//  or      B) Choose randomly anyway, resulting in a double pair-down 1/3 of the time.
//              A has 3 choices to pair with. Pairing with B makes it so that C and D both pair down

