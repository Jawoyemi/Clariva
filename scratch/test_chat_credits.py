from datetime import datetime, timezone
from app.services.credits import charge_credits, GENERATION_COSTS

# Mock account object
class MockAccount:
    def __init__(self, plan, credits_balance, credits_max):
        self.id = "mock-id"
        self.plan = plan
        self.credits_balance = credits_balance
        self.credits_max = credits_max
        self.last_refill_at = datetime.now(timezone.utc)

class MockDB:
    def commit(self): pass
    def add(self, obj): pass
    def refresh(self, obj): pass

import app.services.credits
app.services.credits._transaction_for_account = lambda *a, **k: None

def test_chat_charge():
    account = MockAccount("free", 30, 30)
    owner = {"type": "user", "data": account}
    db = MockDB()
    
    print(f"Initial balance: {account.credits_balance}")
    charge_credits(owner, db, cost=GENERATION_COSTS["message"], description="Test chat")
    print(f"Balance after 1 message: {account.credits_balance} (Expected 29)")
    
    # Try charging until 0
    for _ in range(29):
        charge_credits(owner, db, cost=GENERATION_COSTS["message"], description="Test chat")
    
    print(f"Balance after 30 messages total: {account.credits_balance}")
    
    try:
        charge_credits(owner, db, cost=GENERATION_COSTS["message"], description="Test chat")
    except Exception as e:
        print(f"Caught expected error when balance is 0: {e}")

if __name__ == "__main__":
    test_chat_charge()
