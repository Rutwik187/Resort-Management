import { contact } from "./resort";

/*
 * The terms, cancellation and privacy text from the old prathameshresorts.com,
 * in plain English. The meaning is unchanged. The old privacy page named the
 * Grievance Officer as "Mr XXXXXXXXXXX", so only the office's contact
 * details appear here until the client gives a name.
 */

export const cancellation = [
  "One-day and stay packages: if you cancel, the amount is not refunded. You may move your booking to another date or month that is available.",
  "Passes sold on this website cannot be cancelled, transferred, brought forward or postponed.",
];

export const terms = [
  "We accept payments on this website in Indian rupees only.",
  "When you book, the person who pays shows a valid photo ID, so that we know who owns the booking.",
  "We are not responsible for a loss caused by a payment that your bank does not authorise, that goes over a limit agreed with your bank, that fails, or that is declined for any other reason.",
  "If a user breaks these terms or the privacy policy, we may limit or block their use of the website and recover any amount they owe.",
  "You agree to indemnify Prathamesh Resorts against any claim that arises from your breach of these terms, the privacy policy or the law.",
  "This website is provided as it is. Prathamesh Resorts is not liable for indirect or consequential loss from its use. Our total liability is limited to the services supplied, or the amount paid for them.",
  "If you find that your work has been copied on this website, write to info@prathameshresorts.com.",
  "These terms follow the laws of India. The courts at Mumbai alone hear any dispute.",
];

export const privacy: { title: string; body: string[] }[] = [
  {
    title: "Who we are",
    body: [
      "This policy applies to prathameshresorts.com, a property of Prathamesh Resorts, an Indian company registered under the Companies Act, 2013, with its registered office at Khed Shivapur, Shivaganga Nadikathi, Taluka Bhor, District Pune.",
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
      "To answer your requests and questions, and to confirm a registration for an event or contest.",
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
      "To stop our promotional emails, write to unsubscriber@prathameshresorts.com. It can take about ten days. You will still receive transactional emails and SMS about your purchases.",
    ],
  },
  {
    title: "Other websites",
    body: ["Links to other websites take you to sites we do not control. This policy does not cover them, so please read their own policies."],
  },
  {
    title: "Grievance Officer",
    body: [
      `Under the Information Technology Act, 2000 and its rules, you can reach our Grievance Officer at Prathamesh Resorts, At Post Salawade, near Khed Shivapur Toll, Taluka Bhor, District Pune, Maharashtra 412205, on ${contact.bookingPhone.display} or at ${contact.email}. For other questions about privacy, write to webmaster@prathameshresorts.com.`,
    ],
  },
  {
    title: "Changes and jurisdiction",
    body: [
      "This policy was last updated on 3 March 2021. We will tell you about any material change as the law requires, and post the new policy on this website.",
      "Any dispute about privacy is subject to this policy and to the website's terms of use, and is governed by the laws of India.",
    ],
  },
];
