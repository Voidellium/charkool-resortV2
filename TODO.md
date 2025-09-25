# Remove Centavos from Pricing Display

## Steps to Complete:

1. **Update app/cashier/page.js** ✅:
   - Remove `.toFixed(2)` from all price displays
   - Change to display whole numbers only

2. **Update app/checkout/page.js**:
   - Remove `.toFixed(2)` from half payment calculation
   - Ensure all price displays show whole numbers

3. **Update app/booking/page.js**:
   - Change total price display to show whole numbers without decimals
   - Update `₱{totalPrice.toLocaleString()}` to `₱{(totalPrice / 100).toFixed(0)}`

4. **Test Changes**:
   - Verify prices display without decimals across all pages
   - Ensure calculations still work correctly
