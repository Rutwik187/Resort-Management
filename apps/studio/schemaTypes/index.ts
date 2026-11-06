import { author } from "./documents/author";
import { category } from "./documents/category";
import { faq } from "./documents/faq";
import { policies } from "./documents/policies";
import { post } from "./documents/post";
import { postBody, simpleText } from "./objects/richText";

/*
 * What lives in Sanity (docs/implementation-plan.md, section 2): the four
 * blogs, FAQs and the policies pages. Anything with a price, a date, a count
 * or a rule for bookings lives in the admin instead.
 */
export const schemaTypes = [post, author, category, faq, policies, postBody, simpleText];
