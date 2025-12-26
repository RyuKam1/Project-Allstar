const SESSION_KEY = 'allstar_user_session';
const USERS_DB_KEY = 'allstar_users_db'; // "Database" of all registered users

export const authService = {
  // Login against stored users
  login: async (email, password) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!email || !password) throw new Error("Email and password are required");

    const users = authService.getAllUsersLocal();
    const user = users.find(u => u.email === email && u.password === password);

    if (!user) {
      throw new Error("Invalid email or password");
    }

    // Create session (safe version without password)
    const { password: _, ...safeUser } = user;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    return safeUser;
  },

  // Register and save to "DB"
  register: async (name, email, password) => {
    await new Promise(resolve => setTimeout(resolve, 800));

    if (!name || !email || !password) throw new Error("All fields are required");

    const users = authService.getAllUsersLocal();
    
    // Check if email taken
    if (users.some(u => u.email === email)) {
      return { success: false, error: "Email already exists" };
    }

    const newUser = {
      id: 'u_' + Date.now(),
      name: name,
      email: email,
      password: password, // Storing plain text for prototype owner request
      bio: 'Ready to play!',
      sport: 'Any',
      avatar: 'https://ui-avatars.com/api/?name=' + name + '&background=6366f1&color=fff',
      joinedAt: new Date().toISOString()
    };

    // Save to DB
    users.push(newUser);
    localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));

    // Auto login
    const { password: _, ...safeUser } = newUser;
    localStorage.setItem(SESSION_KEY, JSON.stringify(safeUser));
    
    return { success: true, user: safeUser };
  },

  logout: async () => {
    localStorage.removeItem(SESSION_KEY);
    return true;
  },

  getCurrentUser: () => {
    if (typeof window === 'undefined') return null;
    const stored = localStorage.getItem(SESSION_KEY);
    return stored ? JSON.parse(stored) : null;
  },

  updateProfile: async (updates) => {
    await new Promise(resolve => setTimeout(resolve, 500));
    const currentUser = authService.getCurrentUser();
    if (!currentUser) throw new Error("No user logged in");

    // Update in Session
    const updatedUser = { ...currentUser, ...updates };
    localStorage.setItem(SESSION_KEY, JSON.stringify(updatedUser));

    // Update in DB
    const users = authService.getAllUsersLocal();
    const index = users.findIndex(u => u.id === currentUser.id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates }; // Keep password
      localStorage.setItem(USERS_DB_KEY, JSON.stringify(users));
    }

    return updatedUser;
  },

  // Helper to get raw DB
  getAllUsersLocal: () => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem(USERS_DB_KEY);
    return stored ? JSON.parse(stored) : [];
  },

  // Public method for Admin Panel
  getAllUsers: async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    return authService.getAllUsersLocal();
  }
};
