import unittest
import json
import sqlite3
import database
import app

class TestTwoTeams(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        database.init_db()
        cls.client = app.app.test_client()

    def setUp(self):
        conn = database.get_connection()
        c = conn.cursor()
        c.execute('DELETE FROM settings')
        c.execute('DELETE FROM races')
        c.execute('DELETE FROM players')
        c.execute('DELETE FROM votes')
        c.execute('DELETE FROM voters')
        
        # Insert 6 test players (representing 1 to 6 boat positions)
        self.player_ids = []
        for p in ['Mario', 'Luigi', 'Peach', 'Bowser', 'Yoshi', 'Wario']:
            c.execute('INSERT INTO players (name) VALUES (?)', (p,))
            self.player_ids.append(c.lastrowid)
            
        # Insert a test voter
        c.execute('INSERT INTO voters (name, password) VALUES (?, ?)', ('voter_two_teams', 'pass'))
        self.voter_id = c.lastrowid
        
        conn.commit()
        conn.close()

    def test_two_teams_flow_red_win(self):
        # 1. Start a race as two_teams (2チーム)
        res = self.client.post('/api/races/active', json={
            'race_number': 1,
            'player_ids': self.player_ids,
            'allowed_bet_type': 'two_teams'
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])

        # Check that odds initialized with default 1.8x
        odds = data['odds']
        self.assertEqual(len(odds), 2)
        self.assertEqual(odds[0]['pattern'], [1]) # Red Team
        self.assertEqual(odds[0]['odds'], 1.8)
        self.assertEqual(odds[1]['pattern'], [2]) # Blue Team
        self.assertEqual(odds[1]['odds'], 1.8)

        # 2. Place a bet on Red Team (pattern = [1], amount = 500)
        res = self.client.post('/api/votes', json={
            'race_number': 1,
            'voter_id': self.voter_id,
            'bet_type': 'two_teams',
            'pattern': [1],
            'amount': 500
        })
        self.assertEqual(res.status_code, 200)
        
        # Odds should recalculate based on Pari-Mutuel with 90% return rate
        # Total pool = 500. Red Team pool = 500. Blue Team pool = 0.
        # Red Team odds: (500 * 0.90) / 500 = 0.9
        # Blue Team odds: ((500 + 100) * 0.9) / 100 = 540 / 100 = 5.4x
        res = self.client.get('/api/races/active?race_number=1')
        data = json.loads(res.data)
        odds = data['odds']['two_teams']
        self.assertEqual(odds[0]['odds'], 0.9)
        self.assertEqual(odds[1]['odds'], 5.4)

        # 3. Resolve race with player_ids[0] (Mario - 1号艇 - Red Team) winning
        # The winner is Mario, odd-numbered boat, so Red Team wins!
        res = self.client.post('/api/races', json={
            'race_number': 1,
            'results': [self.player_ids[0], self.player_ids[1], self.player_ids[2], self.player_ids[3], self.player_ids[4], self.player_ids[5]]
        })
        self.assertEqual(res.status_code, 200)

        # 4. Verify vote payout: 500G * 0.9x = 450G payout
        res = self.client.get(f'/api/voter/votes?voter_id={self.voter_id}')
        data = json.loads(res.data)
        votes = data['votes']
        self.assertEqual(len(votes), 1)
        self.assertTrue(votes[0]['is_resolved'])
        self.assertTrue(votes[0]['is_hit'])
        self.assertEqual(votes[0]['payout'], 450)

    def test_two_teams_flow_blue_win(self):
        # 1. Start a race as two_teams (2チーム)
        res = self.client.post('/api/races/active', json={
            'race_number': 1,
            'player_ids': self.player_ids,
            'allowed_bet_type': 'two_teams'
        })
        self.assertEqual(res.status_code, 200)

        # 2. Place a bet on Blue Team (pattern = [2], amount = 100)
        res_bet = self.client.post('/api/votes', json={
            'race_number': 1,
            'voter_id': self.voter_id,
            'bet_type': 'two_teams',
            'pattern': [2],
            'amount': 100
        })
        self.assertEqual(res_bet.status_code, 200)

        # 3. Resolve race with player_ids[1] (Luigi - 2号艇 - Blue Team) winning
        # Luigi is 2号艇, even-numbered boat, so Blue Team wins!
        res = self.client.post('/api/races', json={
            'race_number': 1,
            'results': [self.player_ids[1], self.player_ids[0], self.player_ids[2], self.player_ids[3], self.player_ids[4], self.player_ids[5]]
        })
        self.assertEqual(res.status_code, 200)

        # 4. Verify vote payout: 100G * 0.9x = 90G payout (since pool was 100 on blue, total bets 100, odds = (100 * 0.9) / 100 = 0.9)
        res = self.client.get(f'/api/voter/votes?voter_id={self.voter_id}')
        data = json.loads(res.data)
        votes = data['votes']
        self.assertEqual(len(votes), 1)
        self.assertTrue(votes[0]['is_resolved'])
        self.assertTrue(votes[0]['is_hit'])
        self.assertEqual(votes[0]['payout'], 90)

if __name__ == '__main__':
    unittest.main()
