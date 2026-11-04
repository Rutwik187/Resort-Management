/*
 * The policies as published on the current sinhagadbliss.com, kept as
 * written. Only spelling slips are fixed ("bv" for "by", "pavment" for
 * "payment"), and the privacy policy's placeholder name for the grievance
 * officer is left out. The client should confirm these texts before launch:
 * the terms and the dated cancellation policy disagree in places.
 */

export type PolicyBlock = { heading?: string; paragraphs?: string[]; list?: string[] };

export type Policy = {
  id: string;
  title: string;
  /** As printed on the policy. */
  updated?: string;
  blocks: PolicyBlock[];
};

export const policies: Policy[] = [
  {
    id: "cancellation",
    title: "Cancellation policy",
    updated: "Effective 28 July 2026",
    blocks: [
      {
        paragraphs: [
          "We understand that travel plans may change. Our cancellation policy has been designed to be fair to both our guests and the resort.",
        ],
      },
      {
        heading: "1. Individual room bookings",
        list: [
          "More than 7 days before check-in: 100% refund of the booking amount (excluding applicable payment gateway or convenience charges).",
          "3 to 7 days before check-in: 50% refund of the booking amount.",
          "Less than 72 hours before check-in: no refund.",
          "No-show: no refund.",
        ],
      },
      {
        heading: "2. How to cancel",
        paragraphs: [
          "To cancel a booking, please contact us by email at info@prathameshresorts.com or by phone on +91 90495 38888. Please provide your Booking ID for quicker processing.",
        ],
      },
      {
        heading: "3. Rescheduling",
        paragraphs: [
          "Requests to change the booking date made at least 3 days before check-in may be accommodated, subject to room availability and management approval. Any difference in tariff must be paid by the guest.",
        ],
      },
      {
        heading: "4. Group bookings and events",
        paragraphs: [
          "Bookings for corporate events, destination weddings, private functions, or group reservations may have separate cancellation terms as specified in the booking agreement.",
        ],
      },
      {
        heading: "5. Force majeure",
        paragraphs: [
          "Prathamesh Resorts shall not be held responsible for cancellations or interruptions caused by events beyond our reasonable control, including but not limited to natural disasters, government restrictions, pandemics, strikes, or other unforeseen circumstances.",
        ],
      },
      {
        heading: "Contact information",
        paragraphs: ["Prathamesh Resorts (Sinhagad Bliss), sinhagadbliss.com. Email info@prathameshresorts.com. Phone +91 90495 38888."],
      },
    ],
  },
  {
    id: "refunds",
    title: "Refund policy",
    updated: "Effective 28 July 2026",
    blocks: [
      {
        paragraphs: [
          "At Prathamesh Resorts (Sinhagad Bliss), we are committed to providing a smooth and transparent booking experience. This Refund Policy explains how refunds are processed for bookings made through our website.",
        ],
      },
      {
        heading: "1. Eligibility for refund",
        paragraphs: [
          "Refunds are provided only in accordance with our Cancellation Policy. The amount eligible for refund depends on the cancellation timeline and applicable booking terms.",
        ],
      },
      {
        heading: "2. Refund process",
        list: [
          "Approved refunds will be processed to the original payment method used at the time of booking (credit card, debit card, UPI, net banking, or any other supported payment method).",
          "Refund requests must be submitted by contacting us with your booking details.",
          "Refunds are initiated only after verification of the booking.",
        ],
      },
      {
        heading: "3. Refund timeline",
        paragraphs: [
          "Once approved, refunds are generally processed within 7–10 business days. Depending on your bank or payment provider, it may take additional time for the amount to appear in your account.",
        ],
      },
      {
        heading: "4. Resort-initiated cancellation",
        paragraphs: [
          "If a booking is cancelled by Prathamesh Resorts (Sinhagad Bliss) due to unforeseen circumstances such as maintenance, operational issues, government restrictions, natural calamities, or other force majeure events, guests will receive a full refund of the amount paid.",
        ],
      },
      {
        heading: "5. Non-refundable charges",
        paragraphs: ["The following charges, if applicable, are non-refundable:"],
        list: ["Payment gateway convenience charges", "Transaction processing fees", "Any third-party service charges"],
      },
      {
        heading: "6. Contact for refunds",
        paragraphs: [
          "For any refund-related queries, please contact us by email at info@prathameshresorts.com or by phone on +91 90495 38888. Please mention your Booking ID, name, and registered mobile number while requesting a refund.",
        ],
      },
    ],
  },
  {
    id: "terms",
    title: "Terms and conditions",
    blocks: [
      {
        heading: "1. Terms and conditions",
        list: [
          "Valid photo identification. Documents should be produced as identification before check-in by all Indian nationals.",
          "Valid passport and visa should be produced as identification before check-in by all foreign nationals.",
          "Room allotment will be done at the resort as per availability.",
          "Check-in time: 12:30 pm.",
          "Check-out time: 10:30 am.",
          "Full payment is required in advance at the time of booking.",
          "We honour all Visa and Mastercard credit and debit cards except American Express.",
          "The above tariff may change without prior notice.",
          "Off season minimum length of stay: 1 night.",
          "Mid, peak and New Year minimum length of stay: 2 nights.",
        ],
      },
      {
        heading: "2. Cancellation policy",
        list: [
          "The standard cancellation and amendment policy will not be applicable during festive periods or long weekends, like Holi, Diwali, Christmas, New Year, 15th August, etc. 100% no-show.",
          "Last-moment cancellation charges will be 100% of the cost.",
          "During the off season, if you cancel your booking more than 72 hours before check-in, the full amount will be refunded.",
          "During the off season, if you cancel your booking within 72 hours of check-in, 100% retention applies.",
          "No show, no refund.",
        ],
      },
    ],
  },
  {
    id: "privacy",
    title: "Privacy policy",
    updated: "Last updated 18 October 2024",
    blocks: [
      {
        paragraphs: [
          "This Privacy Policy applies to https://sinhagadbliss.com/. https://sinhagadbliss.com/ recognises the importance of maintaining your privacy. We value your privacy and appreciate your trust in us. This Policy describes how we treat user information we collect on https://sinhagadbliss.com/ and other offline sources. This Privacy Policy applies to current and former visitors to our website and to our online customers. By visiting and/or using our website, you agree to this Privacy Policy.",
          "https://sinhagadbliss.com/ is a property of Sinhagad Bliss, an Indian Company registered under the Companies Act, 2013 having its registered office at Ghera Sinhagad, Maharashtra.",
        ],
      },
      {
        heading: "Information we collect",
        list: [
          "Contact information. We might collect your name, email, mobile number, phone number, street, city, state, pin code, country and IP address.",
          "Payment and billing information. We might collect your billing name, billing address and payment method when you buy our services. We never collect your credit card number or credit card expiry date or other details pertaining to your credit card on our website. Credit card information will be obtained and processed by our online payment partner CC Avenue.",
          "Information you post. We collect the information you post in a public space on our website or on a third-party social media site belonging to https://sinhagadbliss.com/.",
          "Demographic information. We may collect demographic information about you, events you like, events you intend to participate in, services you buy, or any other information provided by you during the use of our website. We might collect this as a part of a survey also.",
          "Other information. If you use our website, we may collect information about your IP address and the browser you’re using. We might look at what site you came from, duration of time spent on our website, pages accessed or what site you visit when you leave us. We might also collect the type of mobile device you are using, or the version of the operating system your computer or device is running.",
        ],
      },
      {
        heading: "We collect information in different ways",
        list: [
          "We collect information directly from you. We collect information directly from you when you register for an event or buy services. We also collect information if you post a comment on our websites or ask us a question through phone or email.",
          "We collect information from you passively. We use tracking tools like Google Analytics, Google Webmaster, browser cookies and web beacons for collecting information about your usage of our website.",
          "We get information about you from third parties. For example, if you use an integrated social media feature on our websites. The third-party social media site will give us certain information about you. This could include your name and email address.",
        ],
      },
      {
        heading: "Use of your personal information",
        list: [
          "We use the information to contact you. We might use the information you provide to contact you for confirmation of a purchase of services on our website or for other promotional purposes.",
          "We use the information to respond to your requests or questions. We might use your information to confirm your registration for an event or contest.",
          "We use the information to improve our products and services. We might use your information to customise your experience with us. This could include displaying content based on your preferences.",
          "We use the information to look at site trends and customer interests. We may use your information to make our website and services better. We may combine information we get from you with information about you we get from third parties.",
          "We use the information for security purposes. We may use the information to protect our company, our customers, or our websites.",
          "We use the information for marketing purposes. We might send you information about special promotions or offers. We might also tell you about new features or services. These might be our own offers or services, or third-party offers or services we think you might find interesting. Or, for example, if you buy services from us we’ll enrol you in our newsletter.",
          "We use the information to send you transactional communications. We might send you emails or SMS about your account or the purchase of a service.",
          "We use information as otherwise permitted by law.",
        ],
      },
      {
        heading: "Sharing of information with third parties",
        list: [
          "We will share information with third parties who perform services on our behalf. We share information with vendors who help us manage our online registration process or payment processors or transactional message processors. Some vendors may be located outside of India.",
          "We will share information with the event organisers. We share your information with event organisers and other parties responsible for fulfilling the purchase obligation. The event organisers and other parties may use the information we give them as described in their privacy policies.",
          "We will share information with our business partners. This includes a third party who provides or sponsors an event, or who operates a venue where we hold events. Our partners use the information we give them as described in their privacy policies.",
          "We may share information if we think we have to in order to comply with the law or to protect ourselves. We will share information to respond to a court order or subpoena. We may also share it if a government agency or investigatory body requests it. Or, we might also share information when we are investigating potential fraud.",
          "We may share information with any successor to all or part of our business. For example, if part of our business is sold we may give our customer list as part of that transaction.",
          "We may share your information for reasons not described in this policy. We will tell you before we do this.",
        ],
      },
      {
        heading: "Email opt-out",
        paragraphs: [
          "You can opt out of receiving our marketing emails. To stop receiving our promotional emails, please email unsubscriber@prathameshvalleyresorts.com. It may take about ten days to process your request. Even if you opt out of getting marketing messages, we will still be sending you transactional messages through email and SMS about your purchases.",
        ],
      },
      {
        heading: "Third-party sites",
        paragraphs: [
          "If you click on one of the links to third-party websites, you may be taken to websites we do not control. This policy does not apply to the privacy practices of those websites. Read the privacy policy of other websites carefully. We are not responsible for these third-party sites.",
        ],
      },
      {
        heading: "Grievance officer",
        paragraphs: [
          "In accordance with the Information Technology Act 2000 and rules made thereunder, the contact details of the Grievance Officer are: Ghera Sinhagad, Maharashtra. Phone +91 91122 35656. Email info@sinhagadbliss.com.",
          "If you have any questions about this Policy or other privacy concerns, you can also email us at webmaster@prathameshvalleyresorts.com.",
        ],
      },
      {
        heading: "Updates to this policy",
        paragraphs: [
          "This Privacy Policy was last updated on 18.10.2024. From time to time we may change our privacy practices. We will notify you of any material changes to this policy as required by law. We will also post an updated copy on our website. Please check our site periodically for updates.",
        ],
      },
      {
        heading: "Jurisdiction",
        paragraphs: [
          "If you choose to visit the website, your visit and any dispute over privacy is subject to this Policy and the website’s terms of use. In addition to the foregoing, any disputes arising under this Policy shall be governed by the laws of India.",
        ],
      },
    ],
  },
];
