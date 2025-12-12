import bcrypt from "bcryptjs";
import { readDB, writeDB, generateId } from "./json-db.js";

// Read all users
export function getAllUsers() {
  return readDB("users");
}

// Find user by ID
export function findUserById(id) {
  const users = readDB("users");
  return users.find((user) => user._id === id);
}

// Find user by email
export function findUserByEmail(email) {
  const users = readDB("users");
  return users.find((user) => user.email.toLowerCase() === email.toLowerCase());
}

// Create a new user
export async function createUser(userData) {
  const users = readDB("users");

  // Check if user already exists
  const existingUser = findUserByEmail(userData.email);
  if (existingUser) {
    throw new Error("User already exists with this email");
  }

  // Validate: Only students and school-teacher can have school information
  const userRole = userData.role || "student";
  if (
    userRole !== "student" &&
    userRole !== "school-teacher" &&
    (userData.schoolName || userData.schoolId)
  ) {
    throw new Error(
      "School information (schoolName, schoolId) can only be provided for students or school-teacher"
    );
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(userData.password, salt);

  // Create new user object
  const newUser = {
    _id: generateId(),
    name: userData.name?.trim() || "",
    firstName: userData.firstName?.trim() || null,
    secondName: userData.secondName?.trim() || null,
    email: userData.email.toLowerCase().trim(),
    gmail: userData.gmail?.toLowerCase().trim() || null,
    password: hashedPassword,
    tel: userData.tel?.trim() || null,
    address: userData.address?.trim() || null,
    // Only students and school-teacher can have school information
    schoolName:
      userRole === "student" || userRole === "school-teacher"
        ? userData.schoolName?.trim() || null
        : null,
    schoolId:
      userRole === "student" || userRole === "school-teacher"
        ? userData.schoolId?.trim() || null
        : null,
    dateBorn: userData.dateBorn
      ? new Date(userData.dateBorn).toISOString()
      : null,
    gender: userData.gender || null,
    userBan: userData.userBan || false,
    role: userRole,
    profile: userData.profile || {
      avatar: null,
      phone: null,
      institution: null,
    },
    userLogo: userData.userLogo?.trim() || null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // Add to users array
  users.push(newUser);

  // Save to database
  writeDB("users", users);

  // Return user without password
  const { password, ...userWithoutPassword } = newUser;
  return userWithoutPassword;
}

// Update user
export function updateUser(id, updates) {
  const users = readDB("users");
  const userIndex = users.findIndex((user) => user._id === id);

  if (userIndex === -1) {
    throw new Error("User not found");
  }

  const currentUser = users[userIndex];
  const finalRole =
    updates.role !== undefined ? updates.role : currentUser.role;

  // Validate: Only students and school-teacher can have school information
  // If role is being changed to non-student/non-school-teacher, clear school info
  // If role is non-student/non-school-teacher and trying to set school info, reject
  if (finalRole !== "student" && finalRole !== "school-teacher") {
    if (updates.schoolName !== undefined && updates.schoolName !== null) {
      throw new Error(
        "School information can only be provided for students or school-teacher"
      );
    }
    if (updates.schoolId !== undefined && updates.schoolId !== null) {
      throw new Error(
        "School information can only be provided for students or school-teacher"
      );
    }
    // Clear school info if role is being changed to non-student/non-school-teacher
    if (
      updates.role &&
      updates.role !== "student" &&
      updates.role !== "school-teacher" &&
      (currentUser.role === "student" || currentUser.role === "school-teacher")
    ) {
      updates.schoolName = null;
      updates.schoolId = null;
    }
  }

  // Preserve all existing fields (including _id, createdAt, etc.) and apply updates
  // Explicitly preserve: _id, createdAt, and ensure updatedAt is set
  users[userIndex] = {
    _id: currentUser._id, // Preserve _id
    name: currentUser.name,
    firstName: currentUser.firstName,
    secondName: currentUser.secondName,
    email: currentUser.email,
    gmail: currentUser.gmail,
    password: currentUser.password, // Preserve password (will be updated if in updates)
    tel: currentUser.tel,
    address: currentUser.address,
    schoolName: currentUser.schoolName,
    schoolId: currentUser.schoolId,
    dateBorn: currentUser.dateBorn,
    gender: currentUser.gender,
    userBan: currentUser.userBan,
    role: currentUser.role,
    profile:
      updates.profile !== undefined
        ? {
            avatar: currentUser.profile?.avatar || null,
            phone: currentUser.profile?.phone || null,
            institution: currentUser.profile?.institution || null,
            ...(updates.profile || {}), // Apply profile updates
          }
        : currentUser.profile || {
            avatar: null,
            phone: null,
            institution: null,
          },
    userLogo: currentUser.userLogo,
    createdAt: currentUser.createdAt, // Preserve createdAt
    ...updates, // Apply all updates (will override fields above)
    updatedAt: new Date().toISOString(), // Always update updatedAt
  };

  writeDB("users", users);

  const { password, ...userWithoutPassword } = users[userIndex];
  return userWithoutPassword;
}

// Compare password
export async function comparePassword(enteredPassword, hashedPassword) {
  return await bcrypt.compare(enteredPassword, hashedPassword);
}

// Find user by ID and return without password
export function findUserByIdWithoutPassword(id) {
  const user = findUserById(id);
  if (!user) {
    return null;
  }
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

export default {
  getAllUsers,
  findUserById,
  findUserByEmail,
  createUser,
  updateUser,
  comparePassword,
  findUserByIdWithoutPassword,
};
