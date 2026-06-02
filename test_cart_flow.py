import unittest
import json
import sqlite3
import database
import app

class TestCartFlow(unittest.TestCase):
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
        
        # Insert test players
        self.player_ids = []
        for p in ['Mario', 'Luigi', 'Peach', 'Bowser']:
            c.execute('INSERT INTO players (name) VALUES (?)', (p,))
            self.player_ids.append(c.lastrowid)
            
        # Insert a test voter
        c.execute('INSERT INTO voters (name, password) VALUES (?, ?)', ('voter_1', 'pass'))
        self.voter_id = c.lastrowid
        
        conn.commit()
        conn.close()

    def test_purchase_votes_and_finalization(self):
        # 1. Start a race (1R) as Win (単勝)
        res = self.client.post('/api/races/active', json={
            'race_number': 1,
            'player_ids': self.player_ids,
            'allowed_bet_type': 'win'
        })
        self.assertEqual(res.status_code, 200)

        # 2. Place votes (Voter purchases/submits their cart items)
        res = self.client.post('/api/votes', json={
            'race_number': 1,
            'voter_id': self.voter_id,
            'bet_type': 'win',
            'pattern': [self.player_ids[0]],
            'amount': 200
        })
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        self.assertTrue(data['success'])

        # 3. Fetch voter's vote history to verify it has been placed correctly
        res = self.client.get(f'/api/voter/votes?voter_id={self.voter_id}')
        self.assertEqual(res.status_code, 200)
        data = json.loads(res.data)
        votes = data['votes']
        self.assertEqual(len(votes), 1)
        self.assertEqual(votes[0]['amount'], 200)
        self.assertEqual(votes[0]['pattern'], [self.player_ids[0]])
        self.assertFalse(votes[0]['is_resolved'])

if __name__ == '__main__':
    unittest.main()
