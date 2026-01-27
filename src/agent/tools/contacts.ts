import { z } from "zod";
import { toolRegistry } from "./registry";
import { logger } from "@/lib/logger";

const log = logger.create("ContactsTools");

let Contacts: typeof import("expo-contacts") | null = null;

async function getContacts() {
    if (!Contacts) {
        Contacts = await import("expo-contacts");
    }
    return Contacts;
}

toolRegistry.register("search_contacts", {
    description: "Search for contacts by name. Returns matching contacts with their phone numbers.",
    parameters: z.object({
        query: z.string().describe("The name to search (e.g., 'Mom')"),
    }),
    execute: async ({ query }) => {
        log.info(`Searching contacts: "${query}"`);

        const ContactsModule = await getContacts();

        const { status } = await ContactsModule.requestPermissionsAsync();
        if (status != "granted") {
            log.warn("Contacts permission not granted");
            return { error: "Contacts permission not granted" };
        }

        const { data } = await ContactsModule.getContactsAsync({
            fields: [ContactsModule.Fields.PhoneNumbers, ContactsModule.Fields.Name],
            name: query,
        });

        log.info(`Found ${data.length} contacts matching "${query}"`);

        if (data.length === 0) {
            return { found: 0, contacts: [], message: `No contacts found matching "${query}"` };
        }

        const contacts = data.slice(0, 5).map(contact => ({
            id: contact.id,
            name: contact.name ?? "Unknown",
            phoneNumbers:
                contact.phoneNumbers?.map(p => ({
                    number: p.number,
                    label: p.label ?? "mobile",
                })) ?? [],
        }));

        log.debug(
            "Returning contacts:",
            contacts.map(c => c.name)
        );

        return {
            found: data.length,
            contacts,
            message: `Found ${data.length} contact(s) matching "${query}"`,
        };
    },
});
