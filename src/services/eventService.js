const STORAGE_KEY = 'allstar_events';

// Seed Data
const seedEvents = [
  {
    id: 'evt_1',
    title: "Morning Yoga & Stretch",
    type: "Workshop",
    sport: "Fitness",
    date: "2024-11-01",
    time: "07:00",
    location: "Central Park",
    description: "Start your day with energy! Open to all levels.",
    cost: "Free",
    reward: "None",
    maxSpots: 20,
    attendees: [],
    imageGradient: "linear-gradient(45deg, #FF9A9E, #FECFEF)",
    image: "/venues/Iron Pump Gym.jpg"
  },
  {
    id: 'evt_2',
    title: "5K Charity Run",
    type: "Race",
    sport: "Running",
    date: "2024-11-05",
    time: "08:00",
    location: "Downtown Plaza",
    description: "Run for a cause. Proceeds go to local youth sports.",
    cost: "$20",
    reward: "Medal",
    maxSpots: 100,
    attendees: [],
    imageGradient: "linear-gradient(45deg, #a18cd1, #fbc2eb)",
    image: "/venues/Lakeside Run Trail.jpg"
  },
  {
    id: 'evt_3',
    title: "3v3 Basketball Scrimmage",
    type: "Match",
    sport: "Basketball",
    date: "2024-10-30",
    time: "18:00",
    location: "City Hoop Park",
    description: "Casual pickup games. Teams formed on site.",
    cost: "$5",
    reward: "Bragging Rights",
    maxSpots: 12,
    attendees: [],
    imageGradient: "linear-gradient(120deg, #f6d365, #fda085)",
    image: "/venues/City Hoop Park.jpg"
  }
];

export const eventService = {
  getAllEvents: async () => {
    // Simulate delay
    await new Promise(resolve => setTimeout(resolve, 200));
    
    if (typeof window === 'undefined') return seedEvents;

    let stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(seedEvents));
        stored = JSON.stringify(seedEvents);
    }
    return JSON.parse(stored);
  },

  getEventById: async (id) => {
    const events = await eventService.getAllEvents();
    return events.find(e => e.id === id);
  },

  createEvent: async (eventData, creator) => {
    const events = await eventService.getAllEvents();
    const newEvent = {
        id: 'evt_' + Date.now(),
        ...eventData,
        creatorId: creator?.id || 'anon',
        attendees: [],
        imageGradient: "linear-gradient(45deg, #667eea, #764ba2)" // Default gradient
    };
    events.push(newEvent);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return newEvent;
  },

  registerForEvent: async (eventId, user) => {
    const events = await eventService.getAllEvents();
    const index = events.findIndex(e => e.id === eventId);
    if (index === -1) throw new Error("Event not found");

    const event = events[index];
    if (event.attendees.length >= event.maxSpots) {
        throw new Error("Event is full");
    }
    if (event.attendees.find(a => a.id === user.id)) {
        throw new Error("Already registered");
    }

    event.attendees.push({ id: user.id, name: user.name, email: user.email });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(events));
    return event;
  }
};
