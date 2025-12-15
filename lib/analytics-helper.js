import crypto from 'crypto';
import connectDB from './mongodb.js';
import PortfolioView from '../models/PortfolioView.js';

// Hash IP address for privacy
export function hashIP(ip) {
  return crypto.createHash('sha256').update(ip).digest('hex');
}

// Create a portfolio view record
export async function createPortfolioView(viewData) {
  await connectDB();
  
  const view = await PortfolioView.create({
    portfolioId: viewData.portfolioId,
    viewerType: viewData.viewerType,
    ipHash: viewData.ipHash,
    userAgent: viewData.userAgent || null,
    timestamp: viewData.timestamp || new Date()
  });

  return view;
}

// Get view statistics for a portfolio
export async function getPortfolioViewStats(portfolioId, startDate = null, endDate = null) {
  await connectDB();
  
  const query = { portfolioId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const views = await PortfolioView.find(query).sort({ timestamp: -1 });
  
  const stats = {
    total: views.length,
    byType: {
      public: views.filter(v => v.viewerType === 'public').length,
      university: views.filter(v => v.viewerType === 'university').length
    },
    views: views.map(v => ({
      viewerType: v.viewerType,
      timestamp: v.timestamp,
      userAgent: v.userAgent
    }))
  };

  return stats;
}

// Get unique viewers count (by IP hash)
export async function getUniqueViewersCount(portfolioId, startDate = null, endDate = null) {
  await connectDB();
  
  const query = { portfolioId };
  
  if (startDate || endDate) {
    query.timestamp = {};
    if (startDate) query.timestamp.$gte = new Date(startDate);
    if (endDate) query.timestamp.$lte = new Date(endDate);
  }

  const uniqueIPs = await PortfolioView.distinct('ipHash', query);
  return uniqueIPs.length;
}

// Get views by viewer type
export async function getViewsByType(portfolioId, viewerType, limit = 100) {
  await connectDB();
  
  return await PortfolioView.find({ portfolioId, viewerType })
    .sort({ timestamp: -1 })
    .limit(limit);
}

// Get recent views for a portfolio
export async function getRecentViews(portfolioId, limit = 50) {
  await connectDB();
  
  return await PortfolioView.find({ portfolioId })
    .sort({ timestamp: -1 })
    .limit(limit);
}

export default {
  hashIP,
  createPortfolioView,
  getPortfolioViewStats,
  getUniqueViewersCount,
  getViewsByType,
  getRecentViews
};

