from sqlalchemy import create_engine, text

engine = create_engine('postgresql+psycopg://postgres@/pricepilot_ai')
conn = engine.connect()

# Check tables
result = conn.execute(text("""SELECT table_name FROM information_schema.tables WHERE table_schema='public'"""))
tables = result.fetchall()
print('Tables:', [t[0] for t in tables])

# Check product count
result = conn.execute(text("SELECT COUNT(*) FROM products"))
print('Products count:', result.scalar())

# Check decisions count
result = conn.execute(text("SELECT COUNT(*) FROM pricing_decisions"))
print('Decisions count:', result.scalar())

# Check KPIs
result = conn.execute(text("SELECT COUNT(*) FROM customer_orders"))
print('Orders count:', result.scalar())

result = conn.execute(text("SELECT COUNT(*) FROM promotions"))
print('Promotions count:', result.scalar())

# Check some sample data
result = conn.execute(text("SELECT * FROM products LIMIT 3"))
print('Sample products:', result.fetchall())

result = conn.execute(text("SELECT * FROM pricing_decisions LIMIT 5"))
print('Sample decisions:', result.fetchall())

conn.close()