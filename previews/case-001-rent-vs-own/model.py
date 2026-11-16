"""Case File 001 - Rent vs Own. The numbers shown on screen come from this model.

Same $400K house. One rents it, one buys it. Both spend the same total on housing;
the renter invests whatever the owner pays above rent (and the owner's down payment + closing).
"""
price = 400_000
down, closing = 0.10 * price, 0.03 * price
loan = price - down
rate = 0.065 / 12
pi = loan * rate / (1 - (1 + rate) ** -360)        # principal + interest
stock = 0.07 / 12                                   # 7% average yearly return
home_growth, rent_growth, cost_growth = 0.035, 0.035, 0.03

bal, port, home, contrib = loan, down + closing, price, down + closing
for m in range(1, 241):
    y = (m - 1) // 12
    tax = price * 0.011 * (1 + cost_growth) ** y / 12
    ins = 150 * (1 + cost_growth) ** y
    repairs = home * 0.01 / 12
    pmi = loan * 0.005 / 12 if bal > 0.78 * price else 0
    own = pi + tax + ins + repairs + pmi
    rent = 2200 * (1 + rent_growth) ** y + 20       # + renter's insurance
    diff = own - rent
    port = port * (1 + stock) + diff
    contrib += diff
    bal -= pi - bal * rate
    home *= (1 + home_growth) ** (1 / 12)
    if m == 1:
        print(f"month 1: own ${own:,.0f} (P&I {pi:,.0f}, tax {tax:,.0f}, ins {ins:,.0f}, repairs {repairs:,.0f}, PMI {pmi:,.0f}) vs rent ${rent:,.0f} -> gap ${diff:,.0f}")
    if m in (120, 240):
        owner = home * 0.94 - bal                   # after 6% selling costs
        renter = port - 0.15 * (port - contrib)     # after 15% long-term gains tax
        print(f"year {m // 12}: owner equity ${owner:,.0f} | renter portfolio ${renter:,.0f} after tax")
