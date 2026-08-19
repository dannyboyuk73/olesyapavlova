/*
 * site-config.js — single source of truth for business details.
 *
 * Node (server.js) requires this directly. Static HTML pages cannot import it
 * without a build step, so where a value below is CONFIRMED it is also written
 * into the relevant page copy; where a value is UNCONFIRMED the pages use
 * truthful general wording only (never a visible "£TBC"/"XX mins" placeholder).
 *
 * When an owner value is confirmed, set it here AND update the wording on the
 * booking/consultation pages (grep for the matching TODO(owner) comment).
 */

const siteConfig = {
  business: {
    name: 'Olesya Pavlova Facial Aesthetics',
    practitioner: 'Mrs Olesya Pavlova',
    role: 'GDC-registered dentist',
    gdcNumber: '156643',                 // CONFIRMED
    gdcRegisterUrl: 'https://olr.gdc-uk.org/searchregister',
  },

  contact: {
    phone: '+44 7557 884658',
    phoneHref: 'tel:+447557884658',
    whatsappHref: 'https://wa.me/447557884658',
    email: 'hello@olesyapavlova.co.uk',
  },

  location: {
    venue: 'Send Therapy Rooms',         // established NAP (matches homepage + schema). NB: brief said "Send Treatment Rooms" — owner to confirm.
    line1: '175 Send Road',
    locality: 'Send, Woking',
    region: 'Surrey',
    postcode: 'GU23 7ET',
    mapsQuery: '175 Send Rd, Send, Woking, Surrey, GU23 7ET',
  },

  // Routing target for enquiry emails. Kept server-side only.
  enquiryTo: 'hello@olesyapavlova.co.uk',

  // ── UNCONFIRMED booking details ──────────────────────────────────────────
  // Do NOT surface these as visible placeholders. Until each is confirmed, the
  // booking page shows only the truthful general wording noted alongside.
  booking: {
    // Confirmed 2026-08 (brief §1.2): £50, redeemed in full against treatment.
    consultationFee: 50,
    // TODO(owner): Confirm consultation duration (e.g. 30 minutes).
    consultationDuration: null,
    // TODO(owner): Confirm exact Sunday clinic hours.
    sundayHours: null,
    // General truthful wording to use until sundayHours is confirmed:
    sundayWording: 'Appointments are available on selected Sundays. Contact Olesya to arrange a suitable consultation time.',
    // TODO(owner): Confirm whether same-day treatment is available.
    sameDayTreatment: null,
    // TODO(owner): Confirm deposit amount and collection method.
    deposit: null,
    // TODO(owner): Confirm cancellation and rescheduling policy.
    cancellationPolicy: null,
    // TODO(owner): Confirm whether an appointment-booking platform will be integrated.
    bookingPlatformUrl: null,
  },
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = siteConfig;
}
