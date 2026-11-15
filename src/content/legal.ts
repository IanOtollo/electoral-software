import { LEGAL } from "@/lib/legal-config";

/**
 * Legal documents, reviewed against these primary texts on 15 November 2026:
 *   - Data Protection Act, 2019 (Kenya Gazette Supplement No. 181, Acts No. 24)
 *   - Data Protection (General) Regulations, 2021 (Legal Notice No. 263)
 *   - Communications Authority of Kenya (with NCIC), Guidelines on Prevention of
 *     Dissemination of Undesirable Bulk and Premium Rate Political Messages and
 *     Political Social Media Content Via Electronic Networks, July 2017
 * Provisions are cited only where they were read in those texts. These documents
 * must still be reviewed by a Kenyan advocate before launch.
 */
export type Block =
  | string
  | { list: string[] }
  | { note: string }
  | { table: { head: string[]; rows: string[][] } };
export type Section = { id: string; heading: string; body: Block[] };
export type LegalDoc = {
  slug: string;
  title: string;
  short: string;
  summary: string;
  inShort: string[];
  sections: Section[];
};

export function fill(text: string): string {
  return text
    .replaceAll("{{service}}", LEGAL.service)
    .replaceAll("{{operator}}", LEGAL.operatorName ?? LEGAL.service)
    .replaceAll("{{contact}}", LEGAL.contactEmail ?? "the contact details shown in the footer of this site")
    .replaceAll("{{effective}}", LEGAL.effective)
    .replaceAll(
      "{{odpc}}",
      LEGAL.odpcRegistration
        ? `registered with the Office of the Data Protection Commissioner (registration ${LEGAL.odpcRegistration})`
        : "required to register with the Office of the Data Protection Commissioner where the Commissioner's thresholds apply (section 18 of the Data Protection Act); our registration details will be shown in the footer of this site once issued",
    );
}

export const CHANGELOG = [{ version: "1.0", date: "15 November 2026", change: "First publication of all documents." }];

export const DOCS: LegalDoc[] = [
  /* ------------------------------------------------------------------ */
  {
    slug: "independence",
    title: "Independence and official results notice",
    short: "Independence notice",
    summary: "This is independent software. It is not the IEBC, and nothing here is an official election result.",
    inShort: [
      "{{service}} is independent. No government body, electoral body, party or candidate runs it or endorses it.",
      "Only the IEBC can declare official results. Every figure here is unofficial.",
      "Geography and voter numbers come from IEBC publications. We show their date and source and never blend them with newer, uncertified figures.",
      "If something here is wrong, tell us and we will fix it and record the correction.",
    ],
    sections: [
      {
        id: "independent",
        heading: "1. We are independent",
        body: [
          "{{service}} is independent software, built and operated by {{operator}}. It is not affiliated with, endorsed by, sponsored by, or operated by the Independent Electoral and Boundaries Commission (IEBC), the Government of Kenya, any county government, any political party, or any candidate.",
          "We do not speak for any of those bodies, and nothing on this site should be read as a statement, position or communication from them. We do not use the IEBC's name, logo or branding as our own.",
        ],
      },
      {
        id: "unofficial",
        heading: "2. Nothing here is an official result",
        body: [
          "Only the IEBC is empowered by law to tally, verify and declare the official results of an election in Kenya. Figures on this site are compiled from forms that polling agents submit, and they are unofficial and provisional. They may differ from, and may later be corrected to match, the IEBC's official results.",
          "Where a result is marked verified, that describes our own check: the figures entered were compared with the photographed Form 34A and found consistent. It does not mean the IEBC has received, accepted or declared those figures.",
          "Do not treat anything on this site as an official declaration, as proof of an election outcome, or as grounds to claim victory or concede defeat. Official results are published by the IEBC at iebc.or.ke.",
        ],
      },
      {
        id: "how-to-tell",
        heading: "3. Telling official from unofficial",
        body: [
          {
            table: {
              head: ["", "Official", "On this site"],
              rows: [
                ["Who publishes it", "The IEBC", "{{operator}}, independently"],
                ["What it is built from", "Forms 34A, 34B and 34C received and tallied by the IEBC", "Form 34A figures submitted by agents, checked against the form photo"],
                ["Legal effect", "Declared results with legal effect", "None. For information only"],
                ["If the two differ", "The IEBC's figure prevails", "We correct our figure"],
              ],
            },
          },
        ],
      },
      {
        id: "iebc-data",
        heading: "4. IEBC data we reproduce",
        body: [
          "The counties, constituencies, wards, polling stations and registered-voter counts come from documents the IEBC has published. We reproduce them for information, as published, and always state the date and source. They are not a certified current register: the voter and station counts shown are the register used for the August 2022 General Election, and new registrations reported by the IEBC for 2025 and 2026 are shown separately as an update, never added to them.",
          "\"IEBC\", \"Independent Electoral and Boundaries Commission\", party names, candidate names and logos belong to their owners. They appear here only to describe things, and imply no relationship. See Data sources and methodology for how we checked these figures.",
        ],
      },
      {
        id: "neutral",
        heading: "5. Neutrality",
        body: [
          "The public results portal is open to everyone and shows the same information to every visitor. It does not favour any candidate or party.",
          "Campaign customers who use our agent and messaging tools are solely responsible for their own communications and are not speaking for us. A campaign sees its own agents' figures privately; those figures are not published on the public pages.",
        ],
      },
      {
        id: "corrections",
        heading: "6. Reporting an error",
        body: ["If you believe a figure here is wrong, write to {{contact}} with the area and, if you have it, the source. We review it against the source document, correct confirmed errors promptly, and keep a record of what changed and when."],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "terms",
    title: "Terms of Service",
    short: "Terms of Service",
    summary: "The agreement for using {{service}}: the public portal, campaign accounts, polling agents and messaging.",
    inShort: [
      "The public results pages are free to read, with no account.",
      "Campaign accounts are for aspirants and their teams. You are responsible for your agents, your contacts and every message you send.",
      "Political SMS follows the Communications Authority's rules, including advance approval, English or Kiswahili only, and sending only between 08:00 and 17:00. Read the Political messaging rules.",
      "Results are unofficial. Nothing here replaces the IEBC.",
    ],
    sections: [
      {
        id: "about",
        heading: "1. About these terms",
        body: [
          "These Terms of Service (\"Terms\") are an agreement between you and {{operator}} (\"we\", \"us\") for your use of {{service}} (the \"Service\"). They take effect on {{effective}}.",
          "You may read the public results portal without an account, and by doing so you accept these Terms. To hold a campaign account, or to use the polling-agent and messaging tools, you must also accept the Privacy Policy, the Acceptable Use and Messaging Policy and the Political messaging rules. If you do not agree, do not use the Service.",
          "You must be at least 18 to hold an account. The public portal may be read by anyone.",
        ],
      },
      {
        id: "definitions",
        heading: "2. Words we use",
        body: [
          {
            table: {
              head: ["Term", "Meaning"],
              rows: [
                ["Aspirant", "A person seeking or holding an elective post, or the campaign acting for them, who holds an account."],
                ["Campaign account", "A workspace created by an aspirant, with its own users, agents, results and contacts, separate from every other workspace."],
                ["Agent", "A person an aspirant appoints to submit results from polling stations, who uses a private link and PIN rather than an account."],
                ["Submission", "The figures and the photograph of Form 34A that an agent sends for a polling station."],
                ["Political message", "Content of a political nature sent to the public by SMS or a similar bulk channel, as the Communications Authority's guidelines define it."],
                ["Unofficial result", "Any figure on the Service. Only the IEBC declares official results."],
              ],
            },
          },
        ],
      },
      {
        id: "independent",
        heading: "3. We are independent",
        body: ["The Service is independent software and is not affiliated with or endorsed by the IEBC, any government body, party or candidate. The Independence and official results notice forms part of these Terms."],
      },
      {
        id: "service",
        heading: "4. What the Service does",
        body: [
          { list: [
            "A public portal showing IEBC geography and registered-voter figures and, during an election, unofficial results and station coverage by area.",
            "Tools for an aspirant to set up a race, appoint agents, assign them polling stations, receive their submissions and follow a private tally.",
            "Tools to message contacts by SMS, where messaging is enabled for the account and the rules below are met.",
          ] },
          "We may add, change or withdraw features. We will try to give notice of material changes that affect active accounts.",
        ],
      },
      {
        id: "unofficial",
        heading: "5. Results are unofficial",
        body: [
          "Results on the Service are unofficial. You must not present them as official or suggest that the IEBC or any authority endorses them.",
          "Figures may be incomplete, delayed or later corrected. The station coverage figure shows how much of an area has reported; a low figure means displayed totals are partial.",
        ],
      },
      {
        id: "accounts",
        heading: "6. Accounts and security",
        body: [
          { list: [
            "Give accurate information and keep it up to date.",
            "Keep your password, and your agents' links and PINs, private. You are responsible for activity under your account and your agents' links.",
            "We may require extra security, such as two-factor authentication, for administrator accounts.",
            "Tell us at {{contact}} as soon as you suspect unauthorised access, so we can end the affected sessions.",
            "We may suspend an account we reasonably believe is compromised or misused. Suspension ends sessions immediately.",
          ] },
        ],
      },
      {
        id: "roles",
        heading: "7. Who is responsible for what",
        body: [
          "For account holders' own details and for security records, {{operator}} is the data controller. For the contact lists, messages, agent details and results that a campaign puts into its workspace, the campaign is the data controller and {{operator}} is its data processor, handling that data only to provide the Service and on the campaign's instructions. Each campaign's data is kept separate from every other campaign's data. The Privacy Policy explains this in full.",
        ],
      },
      {
        id: "agents",
        heading: "8. Agents and submissions",
        body: [
          "An aspirant may appoint agents only for polling stations inside the area it contests, and only people it is entitled to appoint. The aspirant is responsible for telling each agent what data is collected about them and why.",
          "By submitting, an agent confirms that the figures are accurate and match the signed Form 34A, and that the photograph is of the genuine form for that station. We may check, query, flag, hold or reject any submission. A flag is a prompt to check, and is not a finding of wrongdoing.",
          "Submissions and photographs are kept as evidence for the periods in the Privacy Policy. Knowingly submitting false results may be an offence under Kenyan law, and we may report it to the authorities.",
        ],
      },
      {
        id: "messaging",
        heading: "9. Messaging",
        body: [
          "Messaging runs only on accounts where we have enabled it. Political messages are subject to the Communications Authority of Kenya's July 2017 guidelines, summarised in the Political messaging rules. In particular they must be sent through a licensed content service provider, be submitted for approval at least 48 hours in advance with the sponsor's signed authorisation, be sent only to people who have opted in, carry the sponsor's name, be in English or Kiswahili, and be sent only between 08:00 and 17:00.",
          "We may hold, refuse or stop any message or campaign that does not meet those rules or that a mobile network operator or the National Cohesion and Integration Commission declines or withdraws. Delivery depends on third-party networks and cannot be guaranteed. Message logs are kept as the Privacy Policy describes.",
          "You are the sponsor of your messages and are legally responsible for their content and for the lawfulness of the contact list you use.",
        ],
      },
      {
        id: "customer-data",
        heading: "10. Your contacts and your data",
        body: [
          "You keep ownership of the contact lists and content you upload. You promise that you have a lawful basis, and where required the recipient's express consent, to hold and message every contact you add, and that you can show that consent when asked. Section 32 of the Data Protection Act puts the burden of proving consent on the person relying on it.",
          "You must not upload lists you bought, scraped or took from another campaign. You must delete or stop messaging any person who objects or opts out.",
        ],
      },
      {
        id: "ip",
        heading: "11. Intellectual property",
        body: [
          "The software, design, text and branding of the Service belong to us or our licensors. We grant you a limited, non-exclusive, non-transferable licence to use the Service as these Terms allow.",
          "Data published by the IEBC remains the IEBC's publication. We reproduce it for information and do not claim ownership of it. You must not scrape, copy or republish the Service at scale, or remove its notices, without our written permission.",
        ],
      },
      {
        id: "availability",
        heading: "12. Availability",
        body: ["We aim to keep the Service available, especially on election day, but we do not promise uninterrupted or error-free operation. Maintenance, faults, provider outages and events beyond our control may affect it."],
      },
      {
        id: "warranty",
        heading: "13. No warranty",
        body: ["To the fullest extent the law permits, the Service is provided as is and as available. We do not warrant that results or other information are accurate, complete, current or fit for any purpose, and nothing here is legal, political or financial advice."],
      },
      {
        id: "liability",
        heading: "14. Limit of liability",
        body: [
          "To the fullest extent the law permits, we are not liable for indirect or consequential loss, loss of profit, loss of data, or loss arising from decisions you make, or messages you send, using the Service.",
          "Nothing in these Terms excludes or limits liability that cannot lawfully be excluded or limited under the laws of Kenya.",
        ],
      },
      {
        id: "responsibility",
        heading: "15. Your responsibility",
        body: ["You are responsible for your content, contact lists, agents and messages. You will compensate us for loss, claims and costs we suffer because you broke these Terms or the law, for example by sending unapproved or unlawful political messages or uploading contacts without a lawful basis."],
      },
      {
        id: "termination",
        heading: "16. Suspension and ending",
        body: ["You may stop using the Service at any time and ask us to close your account. We may suspend or end access for breach of these Terms, for legal reasons, or to protect the Service or other people. Provisions that by nature continue, such as liability and governing law, will continue."],
      },
      {
        id: "changes",
        heading: "17. Changes to these Terms",
        body: ["We may update these Terms. The current version and effective date are shown on this page, with a record of changes at the foot of every document. If a change is material we will tell account holders in advance where we reasonably can. Using the Service after a change takes effect means you accept it."],
      },
      {
        id: "law",
        heading: "18. Governing law and disputes",
        body: ["These Terms are governed by the laws of Kenya. The parties will first try to resolve any dispute in good faith. A dispute not so resolved is subject to the jurisdiction of the courts of Kenya."],
      },
      {
        id: "contact",
        heading: "19. Contact",
        body: ["Questions about these Terms: {{contact}}."],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "privacy",
    title: "Privacy Policy",
    short: "Privacy Policy",
    summary: "What personal data the Service handles, why, who sees it, how long it is kept, and your rights under the Data Protection Act, 2019.",
    inShort: [
      "The public portal needs no account and shows no personal data about any voter, only aggregated IEBC figures.",
      "We hold your account details, your agents' details and results for your campaign. The campaign controls that data; we process it for them.",
      "Passwords, agent PINs, device identifiers and network addresses are stored only as one-way hashes.",
      "You can ask us to correct or delete your data, to object, or to move it, and you can complain to the Data Commissioner.",
    ],
    sections: [
      {
        id: "who",
        heading: "1. Who is responsible",
        body: [
          "This policy applies the Data Protection Act, 2019 (\"the Act\") and the Data Protection (General) Regulations, 2021. {{operator}} is {{odpc}}.",
          "Two roles matter. {{operator}} is the data controller for account holders' details and for security records. For the contacts, messages, agent details and results that a campaign places in its workspace, the campaign is the data controller and {{operator}} is its data processor. A campaign decides what data it collects and why; we hold and process it for the campaign, keep it separate from every other campaign, and do not use it for our own purposes. Contact: {{contact}}.",
        ],
      },
      {
        id: "inventory",
        heading: "2. What we hold, and why",
        body: [
          {
            table: {
              head: ["Data", "Whose", "Why", "Basis (section 30)", "Role"],
              rows: [
                ["Name, email, role, workspace, password (stored only as a salted slow hash), terms accepted and when, last sign-in", "Account holders", "To run your account and keep it secure", "Contract; compliance with a legal obligation", "We are controller"],
                ["Sign-in sessions (browser details, times); failed-sign-in counters by email", "Account holders", "To keep you signed in and stop password guessing", "Legitimate security need; contract", "We are controller"],
                ["Network address at sign-up, kept only as a one-way hash", "People creating an account", "To limit sign-ups from one network", "Legitimate security need", "We are controller"],
                ["Name, phone number, assigned stations, device identifier (one-way hash), PIN (hash), last-seen time", "Agents", "To let the campaign receive results from its agents", "The campaign's basis; our contract with the campaign", "Campaign is controller; we are processor"],
                ["Votes entered, rejected ballots, the Form 34A photograph, flags, submission times", "Agents; people named or signing on the form", "To record and check a polling-station result", "The campaign's basis; our contract with the campaign", "Campaign is controller; we are processor"],
                ["Contact lists, group labels, message text and delivery status (when messaging is enabled)", "Contacts of the campaign", "To send messages the campaign has authorised", "Consent of the contact, evidenced by the campaign", "Campaign is controller; we are processor"],
                ["Record of important actions (who, what, when)", "Account holders", "To keep a tamper-evident audit trail", "Legitimate interest in integrity; legal obligation", "We are controller"],
              ],
            },
          },
          "Visitors to the public portal: we do not require an account, do not set advertising or analytics cookies, and do not publish personal data about any voter. The registered-voter figures are aggregated IEBC numbers with no names or details of individual voters. Our hosting providers keep ordinary request logs.",
          { note: "Form 34A photographs can show the names and signatures of polling officials and agents. They are kept only as evidence of the figures and are visible only to the campaign that collected them." },
        ],
      },
      {
        id: "notice",
        heading: "3. Telling people what we collect (section 29)",
        body: [
          "Before collecting personal data, a controller must say, as far as practicable, what rights the person has, that data is being collected, why, who else will receive it, how to contact the controller, what security measures protect it, whether giving it is voluntary or required, and what follows if it is not given.",
          "For our own collection this policy is that notice. Campaigns that appoint agents or message contacts must give their agents and contacts the same information. We provide the tools and text to help, but the campaign remains responsible for doing so.",
        ],
      },
      {
        id: "principles",
        heading: "4. How we apply the data protection principles (section 25)",
        body: [
          { list: [
            "Lawful, fair and transparent: we process on the bases in the table above and explain them here.",
            "Specified purposes only: data a campaign enters is used to provide that campaign's service and for nothing else.",
            "Minimisation: we collect only what each purpose needs. For example, device identifiers and network addresses are stored only as hashes.",
            "Accuracy: you can correct your details, and we correct figures when a source is shown to be wrong.",
            "Limited retention: see the retention table below.",
            "Transfers outside Kenya only with safeguards or consent, as set out below.",
          ] },
          "We do not sell personal data, and we do not use it for advertising or profiling. We do not use personal data obtained through the Service for commercial purposes without express consent, as section 37 of the Act and regulation 15 of the 2021 Regulations require.",
        ],
      },
      {
        id: "sharing",
        heading: "5. Who else handles it",
        body: [
          {
            table: {
              head: ["Provider", "What it does", "Where"],
              rows: [
                ["Convex, Inc.", "Database, serverless functions and file storage for the Service, including submitted photographs", "Cloud infrastructure outside Kenya"],
                ["Web hosting provider", "Serves the website", "Named here when launched"],
                ["Messaging provider", "A Communications Authority-licensed content service provider that carries SMS. Named here before messaging is enabled", "To be confirmed"],
              ],
            },
          },
          "When a campaign submits a political message for approval, our platform staff can read that message and the sponsor's authorisation and identification documents. This is needed to pass them to the licensed provider and the networks for vetting, and staff may read nothing else in a campaign's workspace. Each provider acts under contract and only for the purposes above. We also disclose data where a law, court or the IEBC lawfully requires it, and to establish or defend legal claims. Verified polling-station results may in future appear publicly as aggregated figures; an agent's personal details are never published.",
        ],
      },
      {
        id: "transfers",
        heading: "6. Transfers outside Kenya (sections 48 and 49)",
        body: [
          "Because our database provider operates outside Kenya, personal data is processed abroad. The Act allows a transfer only where the controller or processor has shown the Data Commissioner appropriate safeguards, or where one of the listed conditions applies, such as performance of a contract or a compelling legitimate interest not overridden by the person's rights. Transfers of sensitive personal data need the person's consent and confirmation of safeguards.",
          "We choose providers that commit contractually to protecting data, we keep records of those safeguards so we can show them to the Commissioner on request, and the Commissioner may prohibit, suspend or condition a transfer. If the Cabinet Secretary prescribes that certain processing must occur on servers in Kenya (section 50), we will comply.",
        ],
      },
      {
        id: "retention",
        heading: "7. How long we keep it (sections 39 and 40)",
        body: [
          "The Act requires data to be kept only as long as reasonably necessary for its purpose, unless the law or the person authorises more, and then deleted, erased, anonymised or pseudonymised. Our periods are:",
          {
            table: {
              head: ["Data", "Kept for"],
              rows: [
                ["Sign-in sessions and agent sessions", "12 hours of use; deleted automatically within 48 hours after they expire"],
                ["Failed-sign-in counters and sign-up network hashes", "Deleted automatically within 48 hours of the window they cover"],
                ["Account details", "While the account is open; deleted within 30 days of a verified closure request"],
                ["Contact lists and message logs", "Until the campaign deletes them or the account closes, then within 30 days, plus a short backup window"],
                ["Agent details, submissions and Form 34A photographs", "For verification, audit and any election petition about that race, and in any case no longer than 12 months after the election unless the law requires longer, then deleted or anonymised"],
                ["Audit record", "Kept for the life of the workspace to preserve its integrity; it records who did what and when, never message content or photographs"],
              ],
            },
          },
          { note: "Deletion on request is carried out by us on a verified request. We will tell you when it is done." },
        ],
      },
      {
        id: "security",
        heading: "8. How we protect it",
        body: [
          { list: [
            "Passwords and agent PINs are stored only as salted, deliberately slow hashes, so we cannot read them.",
            "Browser sessions use signed, HTTP-only cookies that cannot be read by scripts, and can be revoked at once. Suspending a user or switching off an agent ends their access immediately.",
            "Accounts lock after repeated wrong passwords, and agent links lock after repeated wrong PINs. An agent link works on one phone.",
            "Every campaign's data is separated from every other campaign's at the database level, and access is limited by role on the server.",
            "Important actions are written to a hash-chained audit log, so tampering is detectable.",
            "Data is encrypted in transit, and our infrastructure provider encrypts stored data.",
          ] },
        ],
      },
      {
        id: "breach",
        heading: "9. If something goes wrong (section 43)",
        body: [
          "If personal data is accessed or acquired by an unauthorised person and there is a real risk of harm, the controller must notify the Data Commissioner without delay and within 72 hours of becoming aware, with reasons if it is later than that, and tell the affected person in writing within a reasonably practical period. A processor must tell the controller without delay and, where reasonably practicable, within 48 hours.",
          "As a processor we will tell the affected campaign without delay and aim to do so within 48 hours of becoming aware, with the nature of the breach, what we are doing, and what people can do to protect themselves. Where we are the controller we will notify the Commissioner within 72 hours and affected people in writing.",
        ],
      },
      {
        id: "rights",
        heading: "10. Your rights (sections 26, 36, 38, 40)",
        body: [
          "You have the right to be informed how your data is used, to access it, to object to its processing, to have false or misleading data corrected, and to have false or misleading data deleted (section 26). You may also ask for inaccurate, out-of-date, incomplete or misleading data to be rectified, and for data that is no longer authorised to be kept, irrelevant, excessive or unlawfully obtained to be erased (section 40). You may object to processing unless there is a compelling legitimate interest or a legal claim (section 36). You may receive your data in a structured, machine-readable form and have it sent to another controller, which must be done within thirty days (section 38). Where processing rests on consent, you may withdraw it at any time, and the burden of proving consent is on the controller (section 32). A person with authority may act for a child or someone unable to act for themselves (section 27).",
          "To use a right, write to {{contact}} and say whose data it is. If you are a contact on a campaign's list, the campaign is your controller: contact it directly, reply STOP to any of its messages, or ask us and we will pass your request to the campaign and tell you we have done so. We acknowledge requests within 7 days and aim to complete them within 30 days.",
        ],
      },
      {
        id: "complaints",
        heading: "11. Complaints (section 56)",
        body: ["Please contact us first so we can put things right. You may also complain to the Data Commissioner at the Office of the Data Protection Commissioner of Kenya (odpc.go.ke)."],
      },
      {
        id: "impact",
        heading: "12. Assessing risk (section 31)",
        body: ["Where a new way of processing is likely to create a high risk for people's rights and freedoms, the Act requires an assessment of its impact before it starts. We carry out that assessment before introducing such processing, and the campaigns that use our tools must do the same for their own use."],
      },
      {
        id: "children",
        heading: "13. Children (section 33)",
        body: ["The Service is not for anyone under 18. Processing a child's data needs a parent's or guardian's consent and must protect the child's best interests. If we learn we hold a child's data without that, we will delete it."],
      },
      {
        id: "sensitive",
        heading: "14. Sensitive data",
        body: ["The Act's list of sensitive personal data covers race, health, ethnic social origin, conscience, belief, genetic and biometric data, property, marital and family details and sex or sexual orientation (section 2). We do not ask for any of these. A list of people contacted by a political campaign can nevertheless reveal their political engagement, so campaigns should treat their lists with particular care. Sensitive data may be processed only on the grounds Part V of the Act allows."],
      },
      {
        id: "changes",
        heading: "15. Changes",
        body: ["We post updates here with a new effective date and tell account holders of material changes where we reasonably can. This version takes effect on {{effective}}."],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "political-messaging",
    title: "Political messaging rules",
    short: "Political SMS rules",
    summary: "The Communications Authority's rules for political SMS, and how {{service}} applies them to every campaign that messages voters.",
    inShort: [
      "Political SMS can go only through licensed content service providers, and must be approved by the network at least 48 hours before sending.",
      "Only people who have expressly opted in may be messaged, and you must be able to prove it.",
      "Messages must name the sponsor, be in English or Kiswahili, and go out only between 08:00 and 17:00.",
      "No hate, threats, attacks on people or families, or misleading content. Opt-outs must always work.",
    ],
    sections: [
      {
        id: "source",
        heading: "1. Where these rules come from",
        body: [
          "These are the Communications Authority of Kenya's Guidelines on Prevention of Dissemination of Undesirable Bulk and Premium Rate Political Messages and Political Social Media Content Via Electronic Networks, issued with the National Cohesion and Integration Commission in July 2017 (\"the Guidelines\"). They apply to mobile network operators, virtual operators and content service providers, and so reach every message carried for you.",
          { note: "The published copy we reviewed leaves its effective date blank, and the Authority may amend the Guidelines after consultation. Confirm the current text with the Communications Authority before relying on this summary. This page is a summary, not legal advice." },
        ],
      },
      {
        id: "route",
        heading: "2. The route a political message must take",
        body: [
          "Political messages may be delivered only through licensed content service providers that have direct interoperability agreements with a mobile network operator (clause 6). A platform such as this one therefore sends political SMS only through such a provider.",
          "At least 48 hours before sending, the provider must apply to the operator with (clause 7.1):",
          { list: [
            "the exact content of the message;",
            "a signed authorisation letter from the political party or individual sponsoring it, in the form the Authority approves;",
            "certified copies of the party's registration documents or the individual's identification; and",
            "the intended time of sending.",
          ] },
          "The operator vets the content and replies within 18 hours (clause 7.2). It may refuse, and must give reasons (7.3). If it cannot tell whether content is inflammatory, hateful or unlawful it refers it to the National Cohesion and Integration Commission under sections 13 and 62 of the National Cohesion and Integration Act, which responds within 24 hours (7.4 and 7.5). If a message already sent causes an unforeseen negative reaction, the operator may stop it, and the sponsor must immediately apologise to recipients by SMS or take the remedial action the Commission decides, at the sponsor's cost (7.6).",
        ],
      },
      {
        id: "content",
        heading: "3. What a message must and must not contain",
        body: [
          {
            table: {
              head: ["Rule", "Clause"],
              rows: [
                ["It must carry the name of the party or individual sending it", "8.2"],
                ["It must not carry an operator's or provider's name, logo or slogan, or look as if it comes from one", "8.1"],
                ["No offensive, abusive, insulting, misleading, confusing, obscene or profane language", "8.3"],
                ["No inciting, threatening or discriminatory language that exposes people to violence, hatred, hostility, discrimination or ridicule on grounds such as ethnicity, tribe, race, colour, religion, gender or disability", "8.4"],
                ["No attacks on individuals, their families, ethnic background, race, religion or associations", "8.5"],
                ["English and Kiswahili only", "8.7"],
              ],
            },
          },
          "The Guidelines define a hate message as one designed to degrade, intimidate or incite violence or prejudicial action against a person or group on grounds including race, gender, ethnicity, nationality, religion, political affiliation, language, ability or appearance (clause 5.1.6).",
        ],
      },
      {
        id: "timing",
        heading: "4. When you may send",
        body: [
          "Bulk content may be sent only between 08:00 and 17:00 (clause 9.2), and must comply with all laws and any campaign periods the IEBC announces (clause 9.1). The platform will not release a bulk political message outside that window.",
        ],
      },
      {
        id: "consent",
        heading: "5. Consent, opt-out and your contact list",
        body: [
          "Providers must not send unsolicited bulk content. Every recipient of a political message must have opted in with express consent, and opt-out procedures must be clearly notified and working at all times (clause 10.1). The provider must produce evidence of consent immediately when an operator or regulator asks (10.4).",
          "The law on customer databases must be followed however a list was obtained, and unauthorised use, sharing or sale of databases for political messaging, poll tracking or lobbying can lead to immediate suspension of the provider's interoperability agreement (10.5 and 10.6).",
          "The Data Protection (General) Regulations, 2021 add that anyone sending direct marketing messages must give particulars for a request to stop them without charge (regulation 15(2)), must not conceal who the message is from (15(3)), and that opt-out must be simple, free or nominal in cost, easy to find and accessible to people with disabilities (regulation 16). A text message can invite a single-word reply to opt out (regulation 17(2)(c)). Using personal data commercially without consent is an offence carrying a fine of up to KES 20,000 or up to six months in prison, or both (regulation 15(4)).",
        ],
      },
      {
        id: "platform",
        heading: "6. How the platform applies this",
        body: [
          { list: [
            "Every contact carries a record of how and when consent was given; contacts without one cannot be messaged.",
            "A message cannot be sent at once. It is scheduled at least 48 hours ahead, with the sponsor's signed authorisation and identification attached, and enters a queue showing each stage: submitted, with the operator, with the NCIC, approved, refused, sent.",
            "The sender name shown is the sponsor's, never ours or the provider's.",
            "Messages are checked for language, and bulk sends are held until 08:00 and stopped at 17:00 East Africa Time.",
            "A STOP reply removes the contact from every future message and is honoured at once.",
            "We keep the records needed to show consent, approval and sending to an operator or regulator.",
          ] },
          { note: "Messaging is switched on per account only after these controls are in place and the account has completed the sponsor authorisation." },
        ],
      },
      {
        id: "responsibility",
        heading: "7. Your responsibility",
        body: [
          "The provider bears legal responsibility for the content of political messages and indemnifies the operators (clause 11.1), and we pass that responsibility to the sponsor in our Terms. Non-compliance can lead to suspension of the provider's agreement with the operator and to action by the Authority (11.4 and 11.5).",
          "Public complaints about political messages go to the Authority, or to the National Cohesion and Integration Commission where the complaint is against a party or individual (clause 12).",
        ],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "acceptable-use",
    title: "Acceptable Use and Messaging Policy",
    short: "Acceptable use",
    summary: "What you may not do on the Service, for every user, agent and campaign.",
    inShort: [
      "No false, altered or duplicate results, and no pretending to be an agent, official or the IEBC.",
      "No attacking the Service, scraping it, or using it to break the law.",
      "Political messaging follows the Political messaging rules and the Communications Authority's guidelines.",
      "We may hold, block or remove content and suspend accounts, and report unlawful activity.",
    ],
    sections: [
      {
        id: "general",
        heading: "1. Everyone",
        body: [
          "You must not:",
          { list: [
            "submit false, altered, fabricated or duplicate results, or photographs of anything other than the genuine, signed Form 34A for the station;",
            "pretend to be an agent, returning officer, the IEBC, an official or anyone else;",
            "present figures from the Service as official, or imply the IEBC or any authority endorses them;",
            "access accounts or data that are not yours, probe or bypass security, or overload the Service;",
            "share an agent link or PIN with anyone other than the agent it was issued to;",
            "scrape, copy or republish the Service at scale, or use it to build a competing database;",
            "use the Service to commit or help any offence, including under the Computer Misuse and Cybercrimes Act, 2018, the Election Offences Act, 2016 or the National Cohesion and Integration Act, 2008.",
          ] },
        ],
      },
      {
        id: "campaigns",
        heading: "2. Campaigns",
        body: [
          { list: [
            "Appoint agents only for polling stations in the area you contest, and tell each agent what data you collect about them and why.",
            "Do not instruct or pressure an agent to submit figures that do not match the form.",
            "Message only people who have expressly opted in, and keep the evidence.",
            "Never use bought, scraped or shared lists, or lists taken from another campaign.",
            "Follow the Political messaging rules for every political SMS.",
            "You remain responsible for any reporting, disclosure or spending limits that apply to your campaign under electoral and campaign-finance law.",
          ] },
        ],
      },
      {
        id: "content",
        heading: "3. Content you must not send or submit",
        body: [
          { list: [
            "false or misleading information, including about results, voting procedures, dates or polling locations;",
            "hate speech, incitement, threats, harassment or intimidation, or attacks on people or their families;",
            "messages that impersonate the IEBC, officials, other candidates or parties, or that appear to come from a network operator or provider;",
            "scams, phishing, or requests for passwords, PINs or financial details;",
            "unlawful content of any kind.",
          ] },
        ],
      },
      {
        id: "enforcement",
        heading: "4. What we may do",
        body: ["We may hold, block or remove content, stop a campaign, suspend an account, preserve evidence, and report unlawful activity to the authorities and to affected operators. Where we can we will tell you why. Repeated or serious breaches may lead to permanent removal."],
      },
      {
        id: "report",
        heading: "5. Reporting abuse",
        body: ["To report a message, a submission or an account that breaks these rules, write to {{contact}} with the number, station or account involved and what you saw. You may also complain to the Communications Authority of Kenya about political messages, or to the National Cohesion and Integration Commission about a party or individual."],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "cookies",
    title: "Cookie Notice",
    short: "Cookies",
    summary: "The few things this site stores in your browser. We use no advertising or tracking cookies.",
    inShort: [
      "One essential sign-in cookie, only if you have an account.",
      "One display preference, kept in your browser only.",
      "No advertising, no cross-site tracking, no third-party analytics.",
    ],
    sections: [
      {
        id: "what",
        heading: "1. What we store",
        body: [
          {
            table: {
              head: ["Name", "Purpose", "Lasts", "Who can read it"],
              rows: [
                ["cms_session", "Keeps you signed in to a campaign or admin account", "Up to 12 hours; removed when you sign out", "Our server only. It is HTTP-only, so scripts on the page cannot read it"],
                ["theme", "Remembers your light or dark display choice", "Until you clear site data", "Your browser only; never sent to us"],
              ],
            },
          },
          "Agent screens keep a short-lived access code and a random device identifier in your browser's storage so you stay unlocked on your own phone. They are not shared with other sites.",
        ],
      },
      {
        id: "not",
        heading: "2. What we do not use",
        body: ["We use no advertising cookies, no cross-site tracking and no third-party analytics. Because we store only what is needed to provide the Service and to remember your display choice, no consent banner is required. If that changes, we will ask for your consent first."],
      },
      {
        id: "control",
        heading: "3. Your choices",
        body: ["You can clear cookies and site data in your browser at any time. Clearing the session cookie signs you out. Blocking it stops sign-in from working, but the public results pages will still work."],
      },
    ],
  },

  /* ------------------------------------------------------------------ */
  {
    slug: "data-sources",
    title: "Data sources and methodology",
    short: "Data sources",
    summary: "Where every figure comes from, how we checked it, and what it does and does not mean.",
    inShort: [
      "Geography and voters come from the IEBC's published 2022 files. Newer registration figures are shown separately.",
      "We reconciled our extract with the IEBC's own totals before using it.",
      "Results are unofficial and partial until coverage is complete.",
    ],
    sections: [
      {
        id: "sources",
        heading: "1. Sources",
        body: [
          {
            table: {
              head: ["Figure", "Source", "As at"],
              rows: [
                ["Counties, constituencies, wards, polling stations, registered voters", "IEBC, Statistics of Voter 2022 (iebc.or.ke/registration)", "Register used for the August 2022 General Election"],
                ["New voters enrolled since 2022", "IEBC, Final Status Report on the Enhanced Continuous Voter Registration (ECVR) Phase 1, press release", "28 April 2026"],
                ["County map outlines", "geoBoundaries, Kenya ADM1 (47 counties), public domain, sourced from the RCMRD GeoPortal; each shape matched to its IEBC county code", "Boundary data of 2020. Outlines are for orientation only and are not an official boundary"],
                ["Election results", "Form 34A figures and photographs submitted by authorised agents and checked by us", "Live during an election; unofficial"],
              ],
            },
          },
        ],
      },
      {
        id: "checks",
        heading: "2. How we checked the IEBC data",
        body: [
          "We extracted the station-level register and reconciled it with the IEBC's own aggregate files. The total of 22,102,532 registered voters in the 47 counties matches the IEBC's printed total exactly. All 47 county figures and all 290 constituency figures match exactly, and 1,448 of 1,450 ward figures match. Two neighbouring wards in Kimilili constituency differ by 87 voters in opposite directions, so the constituency total is unaffected.",
          "The 2026 enrolment table was accepted only after its 47 county rows added up to the totals the IEBC printed: 2,345,476 enrolments and 243,630 transfers of registration.",
        ],
      },
      {
        id: "meaning",
        heading: "3. What the labels mean",
        body: [
          {
            table: {
              head: ["Label", "Meaning"],
              rows: [
                ["Registered voters", "The certified 2022 register, not the number of people registered today."],
                ["Polling stations", "IEBC streams, each holding at most 700 voters. The IEBC re-streams between elections, so 2027 stations will differ."],
                ["Register update", "New enrolments the IEBC reported for 2026. Not yet in a certified register, and never added to the 2022 figures."],
                ["Reporting", "A station that has submitted a result."],
                ["Flagged", "A check failed, for example votes plus rejected ballots exceed the voters registered at that station. It prompts a human check and is not a finding of wrongdoing."],
                ["Stations reporting", "Stations that have reported, out of all stations in the area. Totals are partial until coverage is complete."],
              ],
            },
          },
        ],
      },
      {
        id: "limits",
        heading: "4. Known limits",
        body: [
          { list: [
            "Diaspora and prison stations carry IEBC codes 048 and 049 and are not part of the 47 counties or 290 constituencies, so they are left out of area totals.",
            "The IEBC publishes 2026 enrolments by county only, so none are shown for constituencies or wards.",
            "The IEBC states that polling stations for the next election will be allocated nearer the election, so station counts will change.",
            "Figures can be corrected as the IEBC publishes new information and as verification completes.",
          ] },
        ],
      },
      {
        id: "corrections",
        heading: "5. Corrections",
        body: ["If you find an error, write to {{contact}} with the area and the source document. Confirmed corrections are made promptly and recorded."],
      },
    ],
  },
];

export const getDoc = (slug: string) => DOCS.find((d) => d.slug === slug);
