import {describe, expect, test} from '@jest/globals';
import {GameState, Player} from './core/gamestate';

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
test('1v1 gamestate', () => {
    var gamestate: GameState = new GameState();
    expect(gamestate).not.toBeNull();
});

