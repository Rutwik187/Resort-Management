import { properties } from "@repo/sites";
import { defineField } from "sanity";

/** The four resorts, by the codes the admin and the sites use. */
export const resortOptions = properties.map((p) => ({ title: `${p.shortName} (${p.name})`, value: p.code }));

export const resortName = (code: unknown) => properties.find((p) => p.code === code)?.shortName ?? "No resort";

/**
 * The resort a document belongs to. Its site shows it, and no other site
 * does. The Studio's menu fills this in when an editor starts a document
 * from a resort's list.
 */
export const resortField = (options: { readOnly?: boolean } = {}) =>
  defineField({
    name: "resort",
    title: "Resort",
    type: "string",
    options: { list: resortOptions, layout: "radio" },
    validation: (rule) => rule.required(),
    readOnly: options.readOnly,
  });
