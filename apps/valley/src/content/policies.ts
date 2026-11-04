import { contact } from "./resort";

/*
 * The terms, cancellation and privacy text from the current
 * prathameshvalleyresorts.com, in plain English. The meaning is unchanged.
 * Check-in and check-out follow the stay packages (1:00 pm and 10:00 am);
 * the old terms page said 12:30 pm and 10:30 am.
 */

export const terms = [
  "Every Indian guest shows valid photo identification before check-in.",
  "Every foreign guest shows a valid passport and visa before check-in.",
  "We allot rooms at the resort, as available.",
  `Check-in is at ${contact.checkIn}. Check-out is at ${contact.checkOut}.`,
  "We need full payment in advance, at the time of booking.",
  "We accept all Visa and Mastercard credit and debit cards. We do not accept American Express.",
  "Our tariff may change without notice.",
  "In the off season, the minimum stay is one night.",
  "In the mid season, the peak season and at New Year, the minimum stay is two nights.",
];

export const cancellation = [
  "In the off season, cancel more than 72 hours before check-in and we refund the full amount.",
  "In the off season, cancel within 72 hours of check-in and we keep the full amount.",
  "A last-moment cancellation costs 100% of the booking.",
  "If you do not arrive, there is no refund.",
  "The standard cancellation and change policy does not apply during festivals and long weekends, such as Holi, Diwali, Christmas, New Year and 15 August. A no-show then costs 100%.",
];

export const privacy: { title: string; body: string[] }[] = [
  {
    title: "Who we are",
    body: [
      "This policy applies to prathameshvalleyresorts.com, a property of Prathamesh Resorts, an Indian company registered under the Companies Act, 2013, with its registered office at SR. No. 28/1 & 48/2, Bhilar Kaswand Road, Bhilar, Mahabaleshwar 412805.",
      "It applies to current and former visitors to our website and to our customers. By visiting or using our website, you agree to this policy.",
    ],
  },
  {
    title: "What we collect",
    body: [
      "Contact information: your name, email, mobile number, phone number, address and IP address.",
      "Payment and billing information: your billing name, billing address and payment method when you buy our services. We never collect your credit card number, its expiry date or other card details on our website. Our online payment partner, CC Avenue, collects and processes card information.",
      "Information you post in a public space on our website, or on a social media page that belongs to us.",
      "Demographic information, such as the events you like or plan to attend and the services you buy, sometimes as part of a survey.",
      "Other information: your IP address and browser, the site you came from, the time you spent and the pages you visited, the site you went to next, and your type of device and operating system.",
    ],
  },
  {
    title: "How we collect it",
    body: [
      "Directly from you, when you register for an event, buy a service, post a comment or ask us a question by phone or email.",
      "Passively, through tools such as Google Analytics, Google Webmaster tools, browser cookies and web beacons.",
      "From third parties, for example when you use a social media feature on our website.",
    ],
  },
  {
    title: "How we use it",
    body: [
      "To contact you, for example to confirm a purchase, and for promotions.",
      "To answer your requests and questions, and to confirm a registration.",
      "To improve our services and tailor your experience, and to study trends on our website.",
      "For security, to protect our company, our customers and our website.",
      "For marketing: news of offers, features and services, ours or third parties' that we think may interest you. If you buy from us, we may add you to our newsletter.",
      "For transactional messages, by email or SMS, about your purchases.",
      "As the law otherwise allows.",
    ],
  },
  {
    title: "Who we share it with",
    body: [
      "Vendors who work for us, such as those who run online registration, payment processing or transactional messages. Some are outside India.",
      "Event organisers and other parties who fulfil your purchase, and business partners who provide, sponsor or host an event.",
      "Authorities, when the law requires it, for example to answer a court order or subpoena, or to investigate possible fraud.",
      "A successor to all or part of our business, if part of the business is sold.",
      "For any other reason, only after we tell you.",
    ],
  },
  {
    title: "Marketing emails",
    body: [
      "To stop our promotional emails, write to unsubscriber@prathameshvalleyresorts.com. It can take about ten days. You will still receive transactional emails and SMS about your purchases.",
    ],
  },
  {
    title: "Other websites",
    body: ["Links to other websites take you to sites we do not control. This policy does not cover them, so please read their own policies."],
  },
  {
    title: "Grievance Officer",
    body: [
      `Under the Information Technology Act, 2000 and its rules, you can reach our Grievance Officer on ${contact.phone.display} or at ${contact.email}. For other questions about privacy, write to webmaster@prathameshvalleyresorts.com.`,
    ],
  },
  {
    title: "Changes and jurisdiction",
    body: [
      "This policy was last updated on 18 October 2024. We will tell you about any material change as the law requires, and post the new policy on this website.",
      "Any dispute about privacy is subject to this policy and to the website's terms of use, and is governed by the laws of India.",
    ],
  },
];
