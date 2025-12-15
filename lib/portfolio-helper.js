import connectDB from "./mongodb.js";
import Portfolio from "../models/Portfolio.js";
import { findUserByIdWithoutPassword } from "./user-helper.js";

// Helper function to ensure sections have slugs
function ensureSectionSlugs(portfolio) {
  if (!portfolio || !portfolio.sections || !Array.isArray(portfolio.sections)) {
    return;
  }

  const slugMap = new Map();
  portfolio.sections.forEach((section) => {
    if (
      !section.slug ||
      typeof section.slug !== "string" ||
      !section.slug.trim()
    ) {
      // Generate slug from id or type
      let generatedSlug;
      if (section.id && typeof section.id === "string") {
        generatedSlug = section.id.split("-")[0].toLowerCase();
      } else if (section.type && typeof section.type === "string") {
        generatedSlug = section.type.toLowerCase();
      } else {
        generatedSlug = "section";
      }

      // Ensure uniqueness
      let uniqueSlug = generatedSlug;
      let counter = 1;
      while (slugMap.has(uniqueSlug)) {
        uniqueSlug = `${generatedSlug}-${counter}`;
        counter++;
      }
      section.slug = uniqueSlug;
      slugMap.set(uniqueSlug, true);
    } else {
      slugMap.set(section.slug, true);
    }
  });
}

// Create a new portfolio
export async function createPortfolio(portfolioData) {
  await connectDB();

  // Convert legacy isPublic to visibility if needed
  let visibility = portfolioData.visibility;
  if (!visibility && portfolioData.isPublic !== undefined) {
    visibility = portfolioData.isPublic ? "public" : "private";
  }
  if (!visibility) {
    visibility = "private";
  }

  const portfolio = await Portfolio.create({
    studentId: portfolioData.studentId,
    slug: portfolioData.slug,
    visibility: visibility,
    layout: portfolioData.layout || "single-page",
    theme: portfolioData.theme || {
      colors: {},
      typography: {},
      spacing: "comfortable",
      fonts: {},
      styles: {},
    },
    hero: portfolioData.hero || {
      title: null,
      subtitle: null,
      image: null,
      ctaText: null,
      ctaLink: null,
    },
    sections: portfolioData.sections || [],
    certificates: portfolioData.certificates || [],
    animations: portfolioData.animations || {
      enabled: false,
      type: "fade",
    },
    // Legacy field - sync with visibility
    isPublic: visibility === "public",
  });

  return portfolio;
}

// Find portfolio by ID
export async function findPortfolioById(id) {
  await connectDB();

  // Validate that id looks like a MongoDB ObjectId (24 hex characters)
  if (
    !id ||
    typeof id !== "string" ||
    id.length !== 24 ||
    !/^[a-f0-9]{24}$/i.test(id)
  ) {
    return null;
  }

  const portfolio = await Portfolio.findById(id);
  if (portfolio) {
    // Ensure hero field exists with default structure if missing
    if (!portfolio.hero || portfolio.hero === null) {
      portfolio.hero = {
        title: null,
        subtitle: null,
        image: null,
        ctaText: null,
        ctaLink: null,
      };
    }
    // Ensure sections have slugs
    ensureSectionSlugs(portfolio);
    if (portfolio.studentId) {
      const user = findUserByIdWithoutPassword(portfolio.studentId);
      if (user) {
        portfolio.studentId = user;
      }
    }
  }
  return portfolio;
}

// Find portfolio by slug
export async function findPortfolioBySlug(slug) {
  await connectDB();
  const portfolio = await Portfolio.findOne({ slug });
  if (portfolio) {
    // Ensure hero field exists with default structure if missing
    if (!portfolio.hero || portfolio.hero === null) {
      portfolio.hero = {
        title: null,
        subtitle: null,
        image: null,
        ctaText: null,
        ctaLink: null,
      };
    }
    // Ensure sections have slugs
    ensureSectionSlugs(portfolio);
    if (portfolio.studentId) {
      const user = findUserByIdWithoutPassword(portfolio.studentId);
      if (user) {
        portfolio.studentId = user;
      }
    }
  }
  return portfolio;
}

// Find portfolios by student ID
export async function findPortfoliosByStudentId(studentId) {
  await connectDB();
  const portfolios = await Portfolio.find({ studentId });
  // Populate studentId with user data from JSON database
  const user = findUserByIdWithoutPassword(studentId);
  if (user) {
    portfolios.forEach((portfolio) => {
      portfolio.studentId = user;
      // Ensure sections have slugs
      ensureSectionSlugs(portfolio);
    });
  } else {
    portfolios.forEach((portfolio) => {
      ensureSectionSlugs(portfolio);
    });
  }
  return portfolios;
}

// Find public portfolios
export async function findPublicPortfolios(limit = 50, skip = 0) {
  await connectDB();
  // Support both new visibility field and legacy isPublic
  const portfolios = await Portfolio.find({
    $or: [{ visibility: "public" }, { isPublic: true }],
  })
    .sort({ updatedAt: -1 })
    .limit(limit)
    .skip(skip);
  // Populate studentId with user data from JSON database
  portfolios.forEach((portfolio) => {
    if (portfolio.studentId) {
      const user = findUserByIdWithoutPassword(portfolio.studentId);
      if (user) {
        portfolio.studentId = user;
      }
    }
    // Ensure sections have slugs
    ensureSectionSlugs(portfolio);
  });
  return portfolios;
}

// Update portfolio
export async function updatePortfolio(id, updates) {
  await connectDB();

  const portfolio = await Portfolio.findById(id);
  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  // Update allowed fields
  if (updates.slug !== undefined) portfolio.slug = updates.slug;
  if (updates.visibility !== undefined) {
    portfolio.visibility = updates.visibility;
    // Sync legacy isPublic field
    portfolio.isPublic = updates.visibility === "public";
  }
  if (updates.layout !== undefined) portfolio.layout = updates.layout;
  if (updates.theme !== undefined) portfolio.theme = updates.theme;
  if (updates.hero !== undefined) {
    // Handle hero update - like theme, always preserve structure
    if (updates.hero === null) {
      // Set to default empty structure instead of null
      portfolio.hero = {
        title: null,
        subtitle: null,
        image: null,
        ctaText: null,
        ctaLink: null,
      };
    } else if (typeof updates.hero === "object") {
      // Merge with existing hero or use defaults
      portfolio.hero = {
        title:
          updates.hero.title !== undefined
            ? updates.hero.title
            : portfolio.hero?.title || null,
        subtitle:
          updates.hero.subtitle !== undefined
            ? updates.hero.subtitle
            : portfolio.hero?.subtitle || null,
        image:
          updates.hero.image !== undefined
            ? updates.hero.image
            : portfolio.hero?.image || null,
        ctaText:
          updates.hero.ctaText !== undefined
            ? updates.hero.ctaText
            : portfolio.hero?.ctaText || null,
        ctaLink:
          updates.hero.ctaLink !== undefined
            ? updates.hero.ctaLink
            : portfolio.hero?.ctaLink || null,
      };
    }
  }
  if (updates.sections !== undefined) portfolio.sections = updates.sections;
  if (updates.certificates !== undefined)
    portfolio.certificates = updates.certificates;
  if (updates.animations !== undefined)
    portfolio.animations = updates.animations;
  // Legacy isPublic - convert to visibility
  if (updates.isPublic !== undefined) {
    portfolio.isPublic = updates.isPublic;
    portfolio.visibility = updates.isPublic ? "public" : "private";
  }

  await portfolio.save();
  return portfolio;
}

// Delete portfolio
export async function deletePortfolio(id) {
  await connectDB();

  const portfolio = await Portfolio.findById(id);
  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  await Portfolio.findByIdAndDelete(id);
  return true;
}

// Check if slug exists
export async function slugExists(slug, excludeId = null) {
  await connectDB();
  const query = { slug };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  const portfolio = await Portfolio.findOne(query);
  return !!portfolio;
}

// Add certificate to portfolio
export async function addCertificateToPortfolio(portfolioId, certificateData) {
  await connectDB();

  const portfolio = await Portfolio.findById(portfolioId);
  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  portfolio.certificates.push(certificateData);
  await portfolio.save();
  return portfolio;
}

// Remove certificate from portfolio
export async function removeCertificateFromPortfolio(
  portfolioId,
  certificateId
) {
  await connectDB();

  const portfolio = await Portfolio.findById(portfolioId);
  if (!portfolio) {
    throw new Error("Portfolio not found");
  }

  portfolio.certificates = portfolio.certificates.filter(
    (cert) => cert._id.toString() !== certificateId
  );
  await portfolio.save();
  return portfolio;
}

// Filter personal data from portfolio for public/university views
export function filterPersonalData(portfolio, viewerRole = "public") {
  if (!portfolio) return null;

  const portfolioObj = portfolio.toObject ? portfolio.toObject() : portfolio;

  // If viewer is owner or admin, return full data
  // This function should be called after access control, so we assume filtering is needed

  // Remove sensitive student data
  if (portfolioObj.studentId && typeof portfolioObj.studentId === "object") {
    portfolioObj.studentId = {
      _id: portfolioObj.studentId._id,
      name: portfolioObj.studentId.name,
      // Don't include email, phone, address, dateBorn, gender, etc.
    };
  }

  // Filter sections that might contain personal data
  if (Array.isArray(portfolioObj.sections)) {
    portfolioObj.sections = portfolioObj.sections.map((section) => {
      const filteredSection = { ...section };

      // Filter contact section
      if (filteredSection.type === "contact") {
        // Remove personal contact information
        delete filteredSection.phone;
        delete filteredSection.mobile;
        delete filteredSection.address;
        delete filteredSection.personalEmail;
        delete filteredSection.homeAddress;
        delete filteredSection.postalCode;
        // Keep only public contact methods like social media
      }

      // Filter about section for personal identifiers
      if (filteredSection.type === "about" && filteredSection.content) {
        // Remove email addresses, phone numbers, addresses from content
        let content = filteredSection.content;
        // Remove email patterns
        content = content.replace(
          /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
          ""
        );
        // Remove phone patterns (various formats)
        content = content.replace(
          /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
          ""
        );
        filteredSection.content = content;
      }

      // Filter education section for personal identifiers
      if (
        filteredSection.type === "education" &&
        Array.isArray(filteredSection.items)
      ) {
        filteredSection.items = filteredSection.items.map((item) => {
          const filteredItem = { ...item };
          // Remove personal identifiers from education items
          delete filteredItem.studentId;
          delete filteredItem.personalInfo;
          return filteredItem;
        });
      }

      // Filter items in other sections for personal data
      if (Array.isArray(filteredSection.items)) {
        filteredSection.items = filteredSection.items.map((item) => {
          if (typeof item === "object") {
            const filteredItem = { ...item };
            // Remove common personal data fields
            delete filteredItem.email;
            delete filteredItem.phone;
            delete filteredItem.address;
            delete filteredItem.personalEmail;
            delete filteredItem.contactInfo;
            // Clean description/content fields
            if (filteredItem.description) {
              let desc = filteredItem.description;
              desc = desc.replace(
                /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
                ""
              );
              desc = desc.replace(
                /(\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
                ""
              );
              filteredItem.description = desc;
            }
            return filteredItem;
          }
          return item;
        });
      }

      return filteredSection;
    });
  }

  return portfolioObj;
}

export default {
  createPortfolio,
  findPortfolioById,
  findPortfolioBySlug,
  findPortfoliosByStudentId,
  findPublicPortfolios,
  updatePortfolio,
  deletePortfolio,
  slugExists,
  addCertificateToPortfolio,
  removeCertificateFromPortfolio,
  filterPersonalData,
};
