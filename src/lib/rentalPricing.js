export function calculateRentalAmenityTotalCents(item = {}, fallbackSelection = null) {
  const selection = fallbackSelection || item || {};
  const quantity = Number(selection.quantity ?? item.quantity ?? 0) || 0;
  const hoursUsed = Number(selection.hoursUsed ?? item.hoursUsed ?? 0) || 0;

  const amenity = selection.rentalAmenity || item.rentalAmenity || item;
  const pricePerUnit = Number(amenity?.pricePerUnit ?? selection.pricePerUnit ?? item.pricePerUnit ?? 0) || 0;
  const pricePerHour = Number(amenity?.pricePerHour ?? selection.pricePerHour ?? item.pricePerHour ?? 0) || 0;
  const storedTotal = Number(selection.totalPrice ?? item.totalPrice ?? 0) || 0;

  if (hoursUsed > 0 && pricePerHour > 0) {
    return quantity > 0 ? quantity * hoursUsed * pricePerHour : hoursUsed * pricePerHour;
  }

  if (quantity > 0 && pricePerUnit > 0) {
    return quantity * pricePerUnit;
  }

  return storedTotal;
}

export function sumRentalAmenitiesTotalCents(items = []) {
  return (items || []).reduce((sum, item) => sum + calculateRentalAmenityTotalCents(item), 0);
}