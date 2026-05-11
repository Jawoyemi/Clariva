from datetime import datetime, timedelta, timezone
from app.services.credits import apply_refill, next_refill_at, REFILL_RATES

import app.services.credits

# Mock account object
class MockAccount:
    def __init__(self, plan, credits_balance, credits_max, last_refill_at):
        self.id = "mock-id"
        self.plan = plan
        self.credits_balance = credits_balance
        self.credits_max = credits_max
        self.last_refill_at = last_refill_at

class MockDB:
    def commit(self): pass
    def add(self, obj): pass

# Patch _transaction_for_account to do nothing
app.services.credits._transaction_for_account = lambda *a, **k: None

def test_future_timestamp():
    now = datetime.now(timezone.utc)
    future = now + timedelta(hours=5)
    account = MockAccount("free", 10, 30, future)
    db = MockDB()
    
    print(f"Initial last_refill_at (Future): {account.last_refill_at}")
    apply_refill(account, db)
    print(f"Updated last_refill_at (Should be now): {account.last_refill_at}")
    
    # next_refill_at should be now + 4 hours
    next_time = next_refill_at(account)
    diff = next_time - now
    print(f"Next refill in: {diff.total_seconds() / 3600:.2f} hours (Expected ~4.00)")

def test_past_timestamp_catchup():
    now = datetime.now(timezone.utc)
    # 9 hours ago. Interval is 4. Should catch up 2 periods (8 hours).
    # New last_refill_at should be 1 hour ago.
    past = now - timedelta(hours=9)
    account = MockAccount("free", 10, 30, past)
    db = MockDB()
    
    print(f"\nInitial last_refill_at (Past): {account.last_refill_at}")
    apply_refill(account, db)
    print(f"Balance after refill: {account.credits_balance} (Expected 30)")
    print(f"Updated last_refill_at: {account.last_refill_at}")
    
    next_time = next_refill_at(account)
    diff = next_time - now
    print(f"Next refill in: {diff.total_seconds() / 3600:.2f} hours (Expected ~3.00)")

if __name__ == "__main__":
    test_future_timestamp()
    test_past_timestamp_catchup()
