import connectDB from './mongodb.js';
import PortfolioReservation from '../models/PortfolioReservation.js';

// Reserve/save a portfolio for a user
export async function reservePortfolio(userId, portfolioId, notes = null) {
  await connectDB();
  
  // Check if already reserved
  const existing = await PortfolioReservation.findOne({ userId, portfolioId });
  if (existing) {
    // Update notes if provided
    if (notes !== null) {
      existing.notes = notes;
      await existing.save();
    }
    return existing;
  }
  
  // Create new reservation
  const reservation = await PortfolioReservation.create({
    userId,
    portfolioId,
    notes: notes || null
  });
  
  return reservation;
}

// Remove reservation (unsave)
export async function unreservePortfolio(userId, portfolioId) {
  await connectDB();
  
  const result = await PortfolioReservation.deleteOne({ userId, portfolioId });
  return result.deletedCount > 0;
}

// Check if a portfolio is reserved by a user
export async function isPortfolioReserved(userId, portfolioId) {
  await connectDB();
  
  const reservation = await PortfolioReservation.findOne({ userId, portfolioId });
  return !!reservation;
}

// Get all portfolios reserved by a user
export async function getReservedPortfoliosByUser(userId, limit = 50, skip = 0) {
  await connectDB();
  
  const reservations = await PortfolioReservation.find({ userId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
  
  // Populate portfolio data manually
  const { findPortfolioById } = await import('./portfolio-helper.js');
  const reservationsWithPortfolios = await Promise.all(
    reservations.map(async (res) => {
      const portfolio = await findPortfolioById(res.portfolioId);
      return {
        reservationId: res._id,
        portfolio: portfolio,
        notes: res.notes,
        reservedAt: res.createdAt
      };
    })
  );
  
  return reservationsWithPortfolios;
}

// Get all users who reserved a portfolio
export async function getUsersWhoReservedPortfolio(portfolioId, limit = 50, skip = 0) {
  await connectDB();
  
  const reservations = await PortfolioReservation.find({ portfolioId })
    .sort({ createdAt: -1 })
    .limit(limit)
    .skip(skip);
  
  return reservations.map(res => ({
    userId: res.userId,
    notes: res.notes,
    reservedAt: res.createdAt
  }));
}

// Get reservation count for a portfolio
export async function getPortfolioReservationCount(portfolioId) {
  await connectDB();
  
  return await PortfolioReservation.countDocuments({ portfolioId });
}

export default {
  reservePortfolio,
  unreservePortfolio,
  isPortfolioReserved,
  getReservedPortfoliosByUser,
  getUsersWhoReservedPortfolio,
  getPortfolioReservationCount
};

