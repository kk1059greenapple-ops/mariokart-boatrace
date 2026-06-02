import unittest
import json
import sqlite3
import database
import app

class TestCarryover(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = app.app.test_client()

    def setUp(self):
        # Clear settings, votes, races, players
        conn = database.get_connection()
        c = conn.cursor()
        c.execute('DELETE FROM players')
        c.execute('DELETE FROM settings')
        c.execute('DELETE FROM votes')
        c.execute('DELETE FROM races')
        c.execute('DELETE FROM voters')
        conn.commit()
        
        # Reset carryover pool to 0
        c.execute('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', ('carryover_pool', '0.0'))
        conn.commit()
        conn.close()

    def test_carryover_flow(self):
        # 1. Register players
        conn = database.get_connection()
        c = conn.cursor()
        players = ['Mario', 'Luigi', 'Peach', 'Bowser']
        player_ids = []
        for p in players:
            c.execute('INSERT INTO players (name) VALUES (?)', (p,))
            player_ids.append(c.lastrowid)
        
        # Register a voter
        c.execute('INSERT INTO voters (name, password) VALUES (?, ?)', ('test_voter', 'pass'))
        voter_id = c.lastrowid
        conn.commit()
        conn.close()

        # 2. Check initial carryover
        carryover = database.get_carryover_pool()
        self.assertEqual(carryover, 0.0)

        # 3. Start 1R (Win)
        res = self.client.post('/api/races/active', json={
            'race_number': 1,
            'player_ids': player_ids,
            'allowed_bet_type': 'win'
        })
        self.assertEqual(res.status_code, 200)

        # 4. Vote on 1R (Voter bets 1000 G on player_ids[0])
        res = self.client.post('/api/votes', json={
            'race_number': 1,
            'voter_id': voter_id,
            'bet_type': 'win',
            'pattern': [player_ids[0]],
            'amount': 1000
        })
        self.assertEqual(res.status_code, 200)

        # 5. Resolve 1R with player_ids[1] winning (No winners!)
        res = self.client.post('/api/races', json={
            'race_number': 1,
            'results': [player_ids[1], player_ids[0], player_ids[2], player_ids[3]]
        })
        self.assertEqual(res.status_code, 200)

        # 6. Check that carryover pool is updated: (1000 * 0.90) = 900.0 G
        carryover = database.get_carryover_pool()
        self.assertEqual(carryover, 900.0)

        # 7. Start 2R
        res = self.client.post('/api/races/active', json={
            'race_number': 2,
            'player_ids': player_ids,
            'allowed_bet_type': 'win'
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['carryover_pool'], 900.0)

        # 8. Check odds of 2R with 900 G carryover pool before any bet
        # Default odds for win with carryover should be: (100.0 * 0.90 + 900.0 * 0.90) / 100.0 = (90 + 810) / 100.0 = 9.0
        res = self.client.get('/api/races/active?race_number=2')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertEqual(data['carryover_pool'], 900.0)
        odds = data['odds']['win']
        for o in odds:
            self.assertEqual(o['odds'], 9.0)

        # 9. Vote on 2R (Voter bets 1000 G on player_ids[0])
        res = self.client.post('/api/votes', json={
            'race_number': 2,
            'voter_id': voter_id,
            'bet_type': 'win',
            'pattern': [player_ids[0]],
            'amount': 1000
        })
        self.assertEqual(res.status_code, 200)

        # Odds on player_ids[0] should now be: (1000 * 0.90 + 900.0 * 0.90) / 1000 = (900 + 810) / 1000 = 1.71
        # Odds on other players should be: ((1000 + 100) * 0.90 + 900 * 0.90) / 100 = (990 + 810) / 100 = 18.0
        res = self.client.get('/api/races/active?race_number=2')
        data = json.loads(res.data)
        for o in data['odds']['win']:
            if o['player_id'] == player_ids[0]:
                self.assertAlmostEqual(o['odds'], 1.71)
            else:
                self.assertAlmostEqual(o['odds'], 18.0)

        # 10. Resolve 2R with player_ids[0] winning (Voter wins!)
        res = self.client.post('/api/races', json={
            'race_number': 2,
            'results': [player_ids[0], player_ids[1], player_ids[2], player_ids[3]]
        })
        self.assertEqual(res.status_code, 200)

        # 11. Carryover pool should be reset to 0
        carryover = database.get_carryover_pool()
        self.assertEqual(carryover, 0.0)

        # 12. Check payout for voter: should be 1000 * 1.7 = 1700 G (since target_odds 1.71 rounds to 1.7)
        votes = database.get_votes_by_voter(voter_id)
        # Find 2R vote
        vote_2r = next(v for v in votes if v['race_number'] == 2)
        self.assertEqual(vote_2r['is_hit'], 1)
        self.assertEqual(vote_2r['payout'], 1700)

if __name__ == '__main__':
    unittest.main()
