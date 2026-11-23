export const events = [
  {
    title: "The Sound of Tomorrow",
    category: "Concerts",
    location: "Mumbai, India",
    venue: "Mahalaxmi Racecourse",
    date: "15 Nov 2026",
    time: "7:00 PM",
    price: "₹1,499",
    image: "photo-1501386761578-eac5c94b800a",
    tag: "LIVE MUSIC",
    description: "An open-air night of boundary-pushing sounds, guest artists, and a Mumbai skyline after dark.",
  },
  {
    title: "Electric Nights Festival",
    category: "Festivals",
    location: "Delhi, India",
    venue: "Jawaharlal Nehru Stadium",
    date: "22 Nov 2026",
    time: "4:00 PM",
    price: "₹2,299",
    image: "photo-1459749411175-04bf5292ceea",
    tag: "FESTIVAL",
    description: "A full evening of live sets and electronic music, bringing a new generation of artists together.",
  },
  {
    title: "An Evening of Laughter",
    category: "Comedy",
    location: "Bengaluru, India",
    venue: "The Comedy Theatre",
    date: "29 Nov 2026",
    time: "8:00 PM",
    price: "₹799",
    image: "photo-1585699324551-f6c309eedeca",
    tag: "ON STAGE",
    description: "A sharp, intimate stand-up showcase featuring fresh voices and a few familiar faces.",
  },
  {
    title: "The Last Train Home",
    category: "Theatre",
    location: "Pune, India",
    venue: "The Creative Adda",
    date: "06 Dec 2026",
    time: "6:30 PM",
    price: "₹999",
    image: "photo-1507676184212-d03ab07a01bf",
    tag: "THEATRE",
    description: "A contemporary stage story about the people we meet, the places we leave, and finding our way back.",
  },
  {
    title: "Indie After Hours",
    category: "Concerts",
    location: "Hyderabad, India",
    venue: "Heart Cup Coffee, Jubilee Hills",
    date: "12 Dec 2026",
    time: "6:00 PM",
    price: "₹1,199",
    image: "photo-1506157786151-b8491531f063",
    tag: "LIVE MUSIC",
    description: "An evening showcase of independent artists, intimate sets, and new sounds from across the city.",
  },
  {
    title: "Midnight Frequencies",
    category: "Festivals",
    location: "Goa, India",
    venue: "Hilltop, Vagator",
    date: "19 Dec 2026",
    time: "5:00 PM",
    price: "₹2,799",
    image: "photo-1470229722913-7c0e2dbbafd3",
    tag: "OPEN AIR",
    description: "An open-air electronic music gathering with late-evening sets in the hills of Vagator.",
  },
  {
    title: "The Good Room",
    category: "Comedy",
    location: "Mumbai, India",
    venue: "Canvas Laugh Club",
    date: "10 Jan 2027",
    time: "7:30 PM",
    price: "₹699",
    image: "photo-1524368535928-5b5e00ddc76b",
    tag: "COMEDY",
    description: "A relaxed stand-up night with a rotating line-up of sharp comics and new material.",
  },
  {
    title: "A Small Room of Stories",
    category: "Theatre",
    location: "Delhi, India",
    venue: "India Habitat Centre",
    date: "17 Jan 2027",
    time: "7:00 PM",
    price: "₹1,099",
    image: "photo-1503095396549-807759245b35",
    tag: "ON STAGE",
    description: "A close-up theatre evening told through monologues, music, and stories gathered from the city.",
  },
  {
    title: "City Lights Jazz Club", category: "Jazz", location: "Chennai, India",
    venue: "The Music Academy", date: "23 Jan 2027", time: "7:30 PM", price: "₹899",
    image: "photo-1514525253161-7a46d19cd819", tag: "LIVE JAZZ",
    description: "An evening of improvised sets and modern jazz.",
  },
  {
    title: "Courtside Saturday", category: "Sports", location: "Pune, India",
    venue: "Balewadi Sports Complex", date: "30 Jan 2027", time: "5:00 PM", price: "₹599",
    image: "photo-1546519638-68e109498ffc", tag: "BASKETBALL",
    description: "A showcase match featuring local basketball teams.",
  },
  {
    title: "Print & Paper Lab", category: "Workshops", location: "Kolkata, India",
    venue: "Tram Arts Studio", date: "06 Feb 2027", time: "11:00 AM", price: "₹1,299",
    image: "photo-1455390582262-044cdead277a", tag: "HANDS ON",
    description: "Learn simple printmaking techniques and take home your own edition.",
  },
];

export function eventSlug(event) {
  return event.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

export function seatPrice(eventId) {
  if (eventId === "demo") return 500;
  const event = events.find((item) => eventSlug(item) === eventId);
  return event ? Number(event.price.replace(/[^0-9]/g, "")) : null;
}

export function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(amount);
}
