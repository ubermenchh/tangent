import * as Contacts from "expo-contacts";
import { toolRegistry } from "./registry";

toolRegistry.register(
    {
        name: "search_contacts",
        description: "Search for contacts by name. Returns matching contacts with their phone numbers.",
        parameters: {
            type: "object",
            properties: {
                query: {
                    type: "string",
                    description: "The name to search (e.g., 'Mom')",
                },
            },
            required: ["query"],
        },
    },
    async (args) => {
        const { query } = args as { query: string };

        const { status } = await Contacts.requestPermissionsAsync();
        if (status != "granted") {
            return {error: "Contacts permission not granted"}
        }

        const { data } = await Contacts.getContactsAsync({
            fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            name: query
        })

        if (data.length === 0) {
            return { found: 0, contacts: [], message: `No contacts found matching "${query}"` }
        }

        const contacts = data.slice(0, 5).map(contact => ({
            id: contact.id,
            name: contact.name ?? "Unknown",
            phoneNumbers: contact.phoneNumbers?.map(p => ({
                number: p.number,
                label: p.label ?? "mobile"
            })) ?? [],
        }))

        return {
            found: data.length,
            contacts,
            messaage: `Found ${data.length} contact(s) matching "${query}"`
        }
    }
)