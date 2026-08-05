import type { Dictionary } from "../dictionary";

/**
 * `satisfies` checks that English has exactly the same shape as Arabic without
 * widening the types. Miss a key and the build fails — which is how you avoid
 * shipping a screen that is half-translated.
 */
export const en = {
  common: {
    appName: "Fitness Guide",
    search: "Search",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    retry: "Try again",
    loading: "Loading",
    back: "Back",
    viewAll: "View all",
    from: "From",
  },
  nav: {
    home: "Home",
    explore: "Explore",
    memberships: "Memberships",
    profile: "Profile",
  },
  home: {
    title: "Find your gym",
    subtitle: "Verified gyms across Kuwait, at prices exclusive to the app",
    nearbyGyms: "Nearby gyms",
    todaysOffers: "Today's offers",
  },
  gym: {
    verified: "Verified gym",
    pendingReview: "Pending review",
    reviews: "reviews",
    startingFrom: "From",
    viewPlans: "View plans",
    openNow: "Open now",
    closed: "Closed",
    about: "About",
    amenities: "Facilities",
    hours: "Opening hours",
    location: "Location",
    directions: "Directions",
    plansTitle: "Memberships",
    reviewsTitle: "Reviews",
    writeReview: "Write a review",
    reviewLocked: "Only members who have joined can review",
    noReviews: "No reviews yet",
    photos: "Photos",
  },
  access: {
    men: "Men",
    women: "Women",
    mixed: "Mixed",
    separateSections: "Separate sections",
  },
  amenity: {
    parking: "Parking",
    sauna: "Sauna",
    classes: "Group classes",
    childcare: "Childcare",
    pool: "Pool",
    lockers: "Lockers",
    personalTraining: "Personal training",
    cardio: "Cardio machines",
    freeWeights: "Free weights",
  },
  plan: {
    dayPass: "Day pass",
    monthly: "Monthly",
    quarterly: "Quarterly",
    halfYearly: "Half-yearly",
    yearly: "Yearly",
    choose: "Choose",
    exclusive: "Exclusive offer",
    save: "Save",
  },
  checkout: {
    title: "Checkout",
    subtotal: "Subtotal",
    discount: "Discount",
    total: "Total",
    payWithKnet: "Pay with KNET",
    payWithCard: "Pay by card",
  },
  membership: {
    showQr: "Show entry code",
    checkedIn: "Checked in",
    expiresOn: "Expires",
    renew: "Renew",
  },
  errors: {
    paymentDeclined: "Payment was declined. Try another card.",
    noConnection: "No internet connection.",
    notFound: "We could not find what you were looking for.",
  },
} satisfies Dictionary;
